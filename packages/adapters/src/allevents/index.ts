import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface AllEventsEvent {
  event_id: string;
  eventname: string;
  description: string;
  start_time: string;
  end_time: string | null;
  location: string;
  venue: {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
    latitude: string;
    longitude: string;
  };
  banner_url: string | null;
  thumb_url: string | null;
  tickets: {
    has_tickets: boolean;
    ticket_url: string | null;
    ticket_cost: string | null;
    ticket_currency: string | null;
  };
  categories: string[];
  event_url: string;
  organizer_name: string | null;
  organizer_url: string | null;
  interested_count: number;
  going_count: number;
}

interface AllEventsResponse {
  status: string;
  data: AllEventsEvent[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Adapter for AllEvents.in API
 * @see https://allevents.in/pages/api
 * @see https://developer.allevents.in/
 */
export class AllEventsAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('allevents', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.allevents.in',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 3 },
    });
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      ...super.getDefaultHeaders(),
      'Ocp-Apim-Subscription-Key': this.config.apiKey!,
    };
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {
      page: options.cursor ?? '1',
      limit: (options.limit ?? 20).toString(),
    };

    // Location filter
    if (options.location?.city) {
      params['city'] = options.location.city;
    }
    if (options.location?.state) {
      params['state'] = options.location.state;
    }
    if (options.location?.country) {
      params['country'] = options.location.country;
    }

    // Coordinate-based search
    if (options.location?.lat && options.location?.lng) {
      params['latitude'] = options.location.lat.toString();
      params['longitude'] = options.location.lng.toString();
      params['radius'] = (options.location.radiusMiles ?? 25).toString();
    }

    // Date filter
    if (options.date?.startDate) {
      params['start_date'] = options.date.startDate.toISOString().split('T')[0];
    }
    if (options.date?.endDate) {
      params['end_date'] = options.date.endDate.toISOString().split('T')[0];
    }

    // Category filter
    if (options.categories?.length) {
      params['category'] = options.categories[0]; // AllEvents takes single category
    }

    // Keyword search
    if (options.keywords?.length) {
      params['query'] = options.keywords.join(' ');
    }

    const response = await this.request<AllEventsResponse>({
      method: 'GET',
      url: '/events/list/',
      params,
    });

    const events: RawEvent[] = response.data.map(event => ({
      sourceId: event.event_id,
      source: this.sourceName,
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    const currentPage = parseInt(options.cursor ?? '1');
    const hasMore = (currentPage * response.limit) < response.total;

    return {
      events,
      hasMore,
      nextCursor: hasMore ? (currentPage + 1).toString() : undefined,
      totalCount: response.total,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as AllEventsEvent;

    // Parse ticket cost
    let priceMin: number | null = null;
    let priceMax: number | null = null;
    let isFree = true;

    if (event.tickets.ticket_cost) {
      const costMatch = event.tickets.ticket_cost.match(/[\d.]+/g);
      if (costMatch) {
        const prices = costMatch.map(parseFloat).filter(n => !isNaN(n));
        if (prices.length > 0) {
          priceMin = Math.min(...prices);
          priceMax = Math.max(...prices);
          isFree = priceMin === 0;
        }
      }
    }

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.event_url,
      name: event.eventname,
      description: this.stripHtml(event.description),
      summary: this.truncate(this.stripHtml(event.description), 300),
      startDate: new Date(event.start_time),
      endDate: event.end_time ? new Date(event.end_time) : null,
      timezone: null,
      isAllDay: false,
      venue: {
        name: event.venue?.name ?? null,
        address: event.venue?.street ?? null,
        city: event.venue?.city ?? null,
        state: event.venue?.state ?? null,
        country: event.venue?.country ?? null,
        postalCode: event.venue?.zip ?? null,
        lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : null,
        lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : null,
      },
      isOnline: false,
      onlineUrl: null,
      categories: event.categories.map(c => this.mapCategory(c)),
      tags: event.categories,
      imageUrl: event.banner_url ?? event.thumb_url,
      images: [
        event.banner_url && { url: event.banner_url, width: null, height: null, type: 'banner' as const },
        event.thumb_url && { url: event.thumb_url, width: null, height: null, type: 'thumbnail' as const },
      ].filter(Boolean) as Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }>,
      isFree,
      priceMin,
      priceMax,
      currency: event.tickets.ticket_currency,
      ticketUrl: event.tickets.ticket_url,
      organizer: event.organizer_name
        ? { name: event.organizer_name, url: event.organizer_url }
        : null,
      attendeeCount: event.going_count,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'music': 'music',
      'concerts': 'music',
      'festivals': 'music',
      'nightlife': 'nightlife',
      'parties': 'nightlife',
      'clubs': 'nightlife',
      'sports': 'sports',
      'fitness': 'wellness',
      'arts': 'arts',
      'theater': 'arts',
      'comedy': 'arts',
      'food': 'food',
      'drinks': 'food',
      'tech': 'tech',
      'business': 'business',
      'networking': 'networking',
      'community': 'community',
      'family': 'family',
      'kids': 'family',
      'education': 'education',
      'workshops': 'education',
      'wellness': 'wellness',
      'health': 'wellness',
      'outdoor': 'outdoor',
      'charity': 'charity',
    };

    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
    return 'other';
  }
}
