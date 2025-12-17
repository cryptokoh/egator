import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  info?: string;
  pleaseNote?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
      dateTBD?: boolean;
      timeTBA?: boolean;
    };
    end?: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    timezone?: string;
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  images?: Array<{
    url: string;
    ratio: string;
    width: number;
    height: number;
  }>;
  classifications?: Array<{
    segment: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      url?: string;
      city?: { name: string };
      state?: { stateCode: string; name: string };
      country?: { countryCode: string; name: string };
      address?: { line1: string };
      postalCode?: string;
      location?: { longitude: string; latitude: string };
    }>;
    attractions?: Array<{
      name: string;
      url?: string;
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Adapter for Ticketmaster Discovery API
 * @see https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
export class TicketmasterAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('ticketmaster', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://app.ticketmaster.com/discovery/v2',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 5 },
    });
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {
      apikey: this.config.apiKey!,
      size: (options.limit ?? 20).toString(),
      sort: 'date,asc',
    };

    // Location filter
    if (options.location?.lat && options.location?.lng) {
      params['latlong'] = `${options.location.lat},${options.location.lng}`;
      params['radius'] = (options.location.radiusMiles ?? 25).toString();
      params['unit'] = 'miles';
    } else if (options.location?.city) {
      params['city'] = options.location.city;
    }
    if (options.location?.state) {
      params['stateCode'] = options.location.state;
    }
    if (options.location?.country) {
      params['countryCode'] = options.location.country;
    }

    // Date filter
    if (options.date?.startDate) {
      params['startDateTime'] = options.date.startDate.toISOString().replace('.000Z', 'Z');
    }
    if (options.date?.endDate) {
      params['endDateTime'] = options.date.endDate.toISOString().replace('.000Z', 'Z');
    }

    // Pagination (page number, 0-indexed)
    if (options.cursor) {
      params['page'] = options.cursor;
    }

    // Keyword search
    if (options.keywords?.length) {
      params['keyword'] = options.keywords.join(' ');
    }

    // Category filter
    if (options.categories?.length) {
      params['classificationName'] = options.categories.join(',');
    }

    const response = await this.request<TicketmasterResponse>({
      method: 'GET',
      url: '/events.json',
      params,
    });

    const events: RawEvent[] = (response._embedded?.events ?? []).map(event => ({
      sourceId: event.id,
      source: this.sourceName,
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    const currentPage = response.page.number;
    const hasMore = currentPage < response.page.totalPages - 1;

    return {
      events,
      hasMore,
      nextCursor: hasMore ? (currentPage + 1).toString() : undefined,
      totalCount: response.page.totalElements,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as TicketmasterEvent;
    const venue = event._embedded?.venues?.[0];
    const priceRange = event.priceRanges?.[0];
    const classification = event.classifications?.[0];

    // Build start date
    let startDate: Date;
    if (event.dates.start.dateTime) {
      startDate = new Date(event.dates.start.dateTime);
    } else {
      const dateStr = event.dates.start.localDate;
      const timeStr = event.dates.start.localTime ?? '00:00:00';
      startDate = new Date(`${dateStr}T${timeStr}`);
    }

    // Build end date
    let endDate: Date | null = null;
    if (event.dates.end) {
      if (event.dates.end.dateTime) {
        endDate = new Date(event.dates.end.dateTime);
      } else {
        const dateStr = event.dates.end.localDate;
        const timeStr = event.dates.end.localTime ?? '23:59:59';
        endDate = new Date(`${dateStr}T${timeStr}`);
      }
    }

    // Select best image
    const bestImage = this.selectBestImage(event.images ?? []);

    // Build categories
    const categories: string[] = [];
    if (classification?.segment?.name) {
      categories.push(this.mapCategory(classification.segment.name));
    }

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.url,
      name: event.name,
      description: event.info ?? null,
      summary: this.truncate(event.info ?? event.pleaseNote ?? null, 300),
      startDate,
      endDate,
      timezone: event.dates.timezone ?? null,
      isAllDay: event.dates.start.dateTBD ?? false,
      venue: {
        name: venue?.name ?? null,
        address: venue?.address?.line1 ?? null,
        city: venue?.city?.name ?? null,
        state: venue?.state?.stateCode ?? null,
        country: venue?.country?.countryCode ?? null,
        postalCode: venue?.postalCode ?? null,
        lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
        lng: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
      },
      isOnline: false, // Ticketmaster is primarily physical events
      onlineUrl: null,
      categories,
      tags: classification?.genre?.name ? [classification.genre.name] : [],
      imageUrl: bestImage?.url ?? null,
      images: (event.images ?? []).map(img => ({
        url: img.url,
        width: img.width,
        height: img.height,
        type: this.getImageType(img.ratio) as 'thumbnail' | 'banner' | 'poster' | 'other',
      })),
      isFree: !priceRange || priceRange.min === 0,
      priceMin: priceRange?.min ?? null,
      priceMax: priceRange?.max ?? null,
      currency: priceRange?.currency ?? null,
      ticketUrl: event.url,
      organizer: event._embedded?.attractions?.[0]
        ? { name: event._embedded.attractions[0].name, url: event._embedded.attractions[0].url ?? null }
        : null,
      attendeeCount: null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private selectBestImage(images: Array<{ url: string; ratio: string; width: number; height: number }>): { url: string } | null {
    if (!images.length) return null;
    // Prefer 16:9 ratio, largest size
    const sorted = [...images].sort((a, b) => {
      if (a.ratio === '16_9' && b.ratio !== '16_9') return -1;
      if (b.ratio === '16_9' && a.ratio !== '16_9') return 1;
      return b.width - a.width;
    });
    return sorted[0];
  }

  private getImageType(ratio: string): string {
    switch (ratio) {
      case '16_9': return 'banner';
      case '3_2': return 'poster';
      case '1_1': return 'thumbnail';
      default: return 'other';
    }
  }

  private mapCategory(segment: string): string {
    const segmentMap: Record<string, string> = {
      'Music': 'music',
      'Sports': 'sports',
      'Arts & Theatre': 'arts',
      'Film': 'arts',
      'Miscellaneous': 'other',
    };
    return segmentMap[segment] ?? 'other';
  }
}
