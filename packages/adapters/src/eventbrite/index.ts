import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface EventbriteEvent {
  id: string;
  name: { text: string; html: string };
  description: { text: string; html: string } | null;
  url: string;
  start: { local: string; timezone: string };
  end: { local: string; timezone: string } | null;
  venue_id: string | null;
  online_event: boolean;
  logo: { url: string } | null;
  category_id: string | null;
  is_free: boolean;
  organizer_id: string;
}

interface EventbriteVenue {
  id: string;
  name: string;
  address: {
    address_1: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    latitude: string;
    longitude: string;
  };
}

interface EventbriteSearchResponse {
  events: EventbriteEvent[];
  pagination: {
    has_more_items: boolean;
    continuation: string;
    page_count: number;
  };
}

/**
 * Adapter for Eventbrite API
 * @see https://www.eventbrite.com/platform/api
 */
export class EventbriteAdapter extends BaseAdapter {
  private venueCache: Map<string, EventbriteVenue> = new Map();

  constructor(config: AdapterConfig) {
    super('eventbrite', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://www.eventbriteapi.com/v3',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 5 },
    });
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey || this.config.accessToken);
  }

  protected getDefaultHeaders(): Record<string, string> {
    const token = this.config.accessToken ?? this.config.apiKey;
    return {
      ...super.getDefaultHeaders(),
      'Authorization': `Bearer ${token}`,
    };
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {
      expand: 'venue,organizer,ticket_availability',
    };

    // Location filter
    if (options.location?.lat && options.location?.lng) {
      params['location.latitude'] = options.location.lat.toString();
      params['location.longitude'] = options.location.lng.toString();
      params['location.within'] = `${options.location.radiusMiles ?? 25}mi`;
    } else if (options.location?.city) {
      params['location.address'] = options.location.city;
      params['location.within'] = `${options.location.radiusMiles ?? 25}mi`;
    }

    // Date filter
    if (options.date?.startDate) {
      params['start_date.range_start'] = options.date.startDate.toISOString();
    }
    if (options.date?.endDate) {
      params['start_date.range_end'] = options.date.endDate.toISOString();
    }

    // Pagination
    if (options.cursor) {
      params['continuation'] = options.cursor;
    }
    if (options.limit) {
      params['page_size'] = Math.min(options.limit, 50).toString();
    }

    // Search by keyword
    if (options.keywords?.length) {
      params['q'] = options.keywords.join(' ');
    }

    const response = await this.request<EventbriteSearchResponse>({
      method: 'GET',
      url: '/events/search/',
      params,
    });

    const events: RawEvent[] = response.events.map(event => ({
      sourceId: event.id,
      source: this.sourceName,
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    return {
      events,
      hasMore: response.pagination.has_more_items,
      nextCursor: response.pagination.continuation,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as EventbriteEvent & { venue?: EventbriteVenue };

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.url,
      name: event.name.text,
      description: this.stripHtml(event.description?.html ?? null),
      summary: this.truncate(event.description?.text ?? null, 300),
      startDate: new Date(event.start.local),
      endDate: event.end ? new Date(event.end.local) : null,
      timezone: event.start.timezone,
      isAllDay: false,
      venue: {
        name: event.venue?.name ?? null,
        address: event.venue?.address?.address_1 ?? null,
        city: event.venue?.address?.city ?? null,
        state: event.venue?.address?.region ?? null,
        country: event.venue?.address?.country ?? null,
        postalCode: event.venue?.address?.postal_code ?? null,
        lat: event.venue?.address?.latitude ? parseFloat(event.venue.address.latitude) : null,
        lng: event.venue?.address?.longitude ? parseFloat(event.venue.address.longitude) : null,
      },
      isOnline: event.online_event,
      onlineUrl: event.online_event ? event.url : null,
      categories: event.category_id ? [this.mapCategory(event.category_id)] : [],
      tags: [],
      imageUrl: event.logo?.url ?? null,
      images: event.logo ? [{ url: event.logo.url, width: null, height: null, type: 'banner' as const }] : [],
      isFree: event.is_free,
      priceMin: null, // Would need ticket_availability expansion
      priceMax: null,
      currency: null,
      ticketUrl: event.url,
      organizer: null, // Would need organizer expansion
      attendeeCount: null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private mapCategory(categoryId: string): string {
    // Eventbrite category ID mapping
    const categoryMap: Record<string, string> = {
      '103': 'music',
      '101': 'business',
      '110': 'food',
      '104': 'arts',
      '108': 'sports',
      '102': 'tech',
      '109': 'travel',
      '105': 'health',
      '107': 'charity',
      '111': 'government',
      '106': 'community',
      '112': 'spirituality',
      '113': 'family',
      '114': 'education',
      '115': 'fashion',
      '116': 'film',
      '117': 'home',
      '118': 'automotive',
      '119': 'hobbies',
      '199': 'other',
    };
    return categoryMap[categoryId] ?? 'other';
  }
}
