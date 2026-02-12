import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

// --- Shared types ---

interface LumaGeoAddress {
  city?: string;
  region?: string;
  country?: string;
  street_address?: string;
  city_state?: string;
  address?: string;
  full_address?: string;
  postal_code?: string;
  place_id?: string;
}

// --- Public API (paid, x-luma-api-key) types ---

interface LumaApiEvent {
  id: string;
  user_id: string;
  calendar_id: string;
  start_at: string;
  end_at: string;
  duration_interval: string;
  created_at: string;
  timezone: string;
  name: string;
  description: string | null;
  description_md: string | null;
  url: string;
  cover_url: string | null;
  visibility: 'public' | 'members-only' | 'private';
  meeting_url: string | null;
  geo_address_json: LumaGeoAddress | null;
  geo_latitude: string | null;
  geo_longitude: string | null;
  registration_questions: unknown[];
}

interface LumaApiTag {
  id: string;
  name: string;
}

interface LumaApiEntry {
  event: LumaApiEvent;
  tags: LumaApiTag[];
}

interface LumaApiListResponse {
  entries: LumaApiEntry[];
  has_more: boolean;
  next_cursor: string;
}

// --- Public calendar scrape (free, api.lu.ma) types ---

interface LumaPublicGeoInfo {
  city_state?: string;
  address?: string;
  full_address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
}

interface LumaPublicHost {
  name?: string;
  username?: string;
  avatar_url?: string;
  api_id?: string;
}

interface LumaPublicEvent {
  api_id: string;
  name: string;
  url: string;
  start_at: string;
  end_at: string;
  timezone: string;
  cover_url: string | null;
  event_type: string;
  visibility: string;
  location_type: string;
  geo_address_info: LumaPublicGeoInfo | null;
  geo_latitude: string | null;
  geo_longitude: string | null;
  guest_count: number | null;
  ticket_count: number | null;
  ticket_info?: {
    is_free?: boolean;
    price?: { cents: number; currency: string } | null;
    spots_remaining?: number | null;
  } | null;
  hosts?: LumaPublicHost[];
  virtual_info?: { has_access?: boolean; url?: string } | null;
  description?: string | null;
}

interface LumaPublicEntry {
  api_id: string;
  event: LumaPublicEvent;
  calendar_api_id: string;
  status: string;
}

interface LumaPublicListResponse {
  entries: LumaPublicEntry[];
  has_more: boolean;
  next_cursor?: string;
}

export interface LumaAdapterConfig extends AdapterConfig {
  /** Calendar API ID(s) for public scraping. Single string or array for multi-calendar. */
  calendarApiId?: string | string[];
}

/**
 * Adapter for Luma events
 *
 * Supports two modes:
 * 1. Paid API (apiKey set) → uses public-api.luma.com with x-luma-api-key
 * 2. Public calendar scrape (calendarApiId set) → uses api.lu.ma/calendar/get-items (no auth)
 *
 * @see https://docs.lu.ma
 */
export class LumaAdapter extends BaseAdapter {
  private readonly calendarApiIds: string[];
  private readonly usePublicApi: boolean;

  constructor(config: LumaAdapterConfig) {
    const ids = config.calendarApiId
      ? (Array.isArray(config.calendarApiId) ? config.calendarApiId : [config.calendarApiId])
      : [];
    const usePublic = !config.apiKey && ids.length > 0;
    super('luma', {
      ...config,
      baseUrl: config.baseUrl ?? (usePublic ? 'https://api.lu.ma' : 'https://public-api.luma.com'),
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 5 },
    });
    this.calendarApiIds = ids;
    this.usePublicApi = usePublic;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey || this.calendarApiIds.length > 0;
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers = { ...super.getDefaultHeaders() };
    if (this.config.apiKey) {
      headers['x-luma-api-key'] = this.config.apiKey;
    }
    return headers;
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    if (this.usePublicApi) {
      return this.fetchPublic(options);
    }
    return this.fetchPaid(options);
  }

  // --- Paid API fetch ---

  private async fetchPaid(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {
      sort_column: 'start_at',
      sort_direction: 'asc',
    };

    if (options.date?.startDate) {
      params.after = options.date.startDate.toISOString();
    }
    if (options.date?.endDate) {
      params.before = options.date.endDate.toISOString();
    }
    if (options.cursor) {
      params.pagination_cursor = options.cursor;
    }
    if (options.limit) {
      params.pagination_limit = options.limit.toString();
    }

    const response = await this.request<LumaApiListResponse>({
      method: 'GET',
      url: '/v1/calendar/list-events',
      params,
    });

    let entries = response.entries;

    if (options.keywords?.length) {
      const lower = options.keywords.map(k => k.toLowerCase());
      entries = entries.filter(entry => {
        const text = `${entry.event.name} ${entry.event.description ?? ''}`.toLowerCase();
        return lower.some(kw => text.includes(kw));
      });
    }

    const events: RawEvent[] = entries.map(entry => ({
      sourceId: entry.event.id,
      source: this.sourceName,
      rawData: { ...entry, _mode: 'paid' } as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    return {
      events,
      hasMore: response.has_more,
      nextCursor: response.has_more ? response.next_cursor : undefined,
    };
  }

  // --- Public calendar scrape fetch ---

  private async fetchPublic(options: FetchOptions): Promise<FetchResult> {
    const allEntries: LumaPublicEntry[] = [];
    let anyHasMore = false;

    // Fetch from all calendars in parallel
    const fetches = this.calendarApiIds.map(async (calId) => {
      const params: Record<string, string> = {
        calendar_api_id: calId,
        period: 'future',
      };

      if (options.limit) {
        params.pagination_limit = options.limit.toString();
      }
      if (options.cursor) {
        params.pagination_cursor = options.cursor;
      }

      try {
        const response = await this.request<LumaPublicListResponse>({
          method: 'GET',
          url: '/calendar/get-items',
          params,
        });

        if (response.has_more) anyHasMore = true;
        return response.entries;
      } catch (error) {
        console.warn(`[luma] Failed to fetch calendar ${calId}:`, error instanceof Error ? error.message : error);
        return [];
      }
    });

    const results = await Promise.all(fetches);
    for (const entries of results) {
      allEntries.push(...entries);
    }

    // Deduplicate by event api_id (same event can appear on multiple calendars)
    const seen = new Set<string>();
    let entries = allEntries.filter(entry => {
      if (seen.has(entry.event.api_id)) return false;
      seen.add(entry.event.api_id);
      return true;
    });

    // Date filtering (public API doesn't support date params)
    if (options.date?.startDate || options.date?.endDate) {
      entries = entries.filter(entry => {
        const start = new Date(entry.event.start_at);
        if (options.date?.startDate && start < options.date.startDate) return false;
        if (options.date?.endDate && start > options.date.endDate) return false;
        return true;
      });
    }

    // Client-side keyword filtering
    if (options.keywords?.length) {
      const lower = options.keywords.map(k => k.toLowerCase());
      entries = entries.filter(entry => {
        const text = `${entry.event.name} ${entry.event.description ?? ''}`.toLowerCase();
        return lower.some(kw => text.includes(kw));
      });
    }

    // Sort by start time
    entries.sort((a, b) => new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime());

    const events: RawEvent[] = entries.map(entry => ({
      sourceId: entry.event.api_id,
      source: this.sourceName,
      rawData: { ...entry, _mode: 'public' } as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    return {
      events,
      hasMore: anyHasMore,
      nextCursor: undefined, // Pagination across multiple calendars is complex; omit for now
    };
  }

  // --- Normalize (handles both modes) ---

  normalize(raw: RawEvent): NormalizedEvent {
    const data = raw.rawData as Record<string, unknown>;
    const mode = data._mode as string;

    if (mode === 'public') {
      return this.normalizePublic(raw);
    }
    return this.normalizePaid(raw);
  }

  private normalizePaid(raw: RawEvent): NormalizedEvent {
    const entry = raw.rawData as unknown as LumaApiEntry & { _mode: string };
    const event = entry.event;
    const geo = event.geo_address_json;

    const lat = event.geo_latitude ? parseFloat(event.geo_latitude) : null;
    const lng = event.geo_longitude ? parseFloat(event.geo_longitude) : null;
    const hasGeo = lat !== null && lng !== null;
    const isOnline = !!event.meeting_url && !hasGeo;

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.url,
      name: event.name,
      description: event.description ?? null,
      summary: this.truncate(event.description, 300),
      startDate: new Date(event.start_at),
      endDate: new Date(event.end_at),
      timezone: event.timezone ?? null,
      isAllDay: false,
      venue: {
        name: geo?.full_address ?? geo?.city_state ?? null,
        address: geo?.street_address ?? geo?.address ?? null,
        city: geo?.city ?? null,
        state: geo?.region ?? null,
        country: geo?.country ?? null,
        postalCode: geo?.postal_code ?? null,
        lat: lat !== null && !isNaN(lat) ? lat : null,
        lng: lng !== null && !isNaN(lng) ? lng : null,
      },
      isOnline,
      onlineUrl: event.meeting_url ?? null,
      categories: [],
      tags: entry.tags?.map(t => t.name) ?? [],
      imageUrl: event.cover_url ?? null,
      images: event.cover_url
        ? [{ url: event.cover_url, width: null, height: null, type: 'banner' as const }]
        : [],
      isFree: false,
      priceMin: null,
      priceMax: null,
      currency: null,
      ticketUrl: event.url,
      organizer: null,
      attendeeCount: null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private normalizePublic(raw: RawEvent): NormalizedEvent {
    const entry = raw.rawData as unknown as LumaPublicEntry & { _mode: string };
    const event = entry.event;
    const geo = event.geo_address_info;

    const lat = event.geo_latitude ? parseFloat(event.geo_latitude) : (geo?.latitude ?? null);
    const lng = event.geo_longitude ? parseFloat(event.geo_longitude) : (geo?.longitude ?? null);
    const hasGeo = lat !== null && lng !== null;
    const isOnline = event.location_type === 'offline' ? false : !hasGeo;

    const ticketInfo = event.ticket_info;
    const isFree = ticketInfo?.is_free ?? false;
    const priceMin = ticketInfo?.price?.cents ? ticketInfo.price.cents / 100 : null;
    const currency = ticketInfo?.price?.currency ?? null;

    const hostName = event.hosts?.[0]?.name ?? null;
    const hostUrl = event.hosts?.[0]?.username
      ? `https://lu.ma/user/${event.hosts[0].username}`
      : null;

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.url.startsWith('http') ? event.url : `https://lu.ma/${event.url}`,
      name: event.name,
      description: event.description ?? null,
      summary: this.truncate(event.description, 300),
      startDate: new Date(event.start_at),
      endDate: new Date(event.end_at),
      timezone: event.timezone ?? null,
      isAllDay: false,
      venue: {
        name: geo?.full_address ?? geo?.city_state ?? null,
        address: geo?.address ?? null,
        city: geo?.city ?? null,
        state: geo?.region ?? null,
        country: geo?.country ?? null,
        postalCode: null,
        lat: lat !== null && !isNaN(lat) ? lat : null,
        lng: lng !== null && !isNaN(lng) ? lng : null,
      },
      isOnline,
      onlineUrl: event.virtual_info?.url ?? null,
      categories: [],
      tags: [],
      imageUrl: event.cover_url ?? null,
      images: event.cover_url
        ? [{ url: event.cover_url, width: null, height: null, type: 'banner' as const }]
        : [],
      isFree,
      priceMin,
      priceMax: priceMin,
      currency,
      ticketUrl: event.url.startsWith('http') ? event.url : `https://lu.ma/${event.url}`,
      organizer: hostName ? { name: hostName, url: hostUrl } : null,
      attendeeCount: event.guest_count ?? null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }
}
