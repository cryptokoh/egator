import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface YelpEvent {
  id: string;
  name: string;
  description: string;
  event_site_url: string;
  image_url: string | null;
  attending_count: number;
  interested_count: number;
  is_free: boolean;
  cost: number | null;
  cost_max: number | null;
  time_start: string;
  time_end: string | null;
  category: string;
  location: {
    display_address: string[];
    address1: string;
    address2: string | null;
    address3: string | null;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  latitude: number;
  longitude: number;
  business_id: string | null;
  tickets_url: string | null;
}

interface YelpSearchResponse {
  events: YelpEvent[];
  total: number;
}

/**
 * Adapter for Yelp Events API (Fusion API)
 * NOTE: May require joining Yelp Developer Beta Program
 * @see https://www.yelp.com/developers/documentation/v3/event_search
 */
export class YelpAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('yelp', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.yelp.com/v3',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 5 },
    });
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      ...super.getDefaultHeaders(),
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {
      limit: (options.limit ?? 20).toString(),
    };

    // Location filter (required for Yelp)
    if (options.location?.lat && options.location?.lng) {
      params['latitude'] = options.location.lat.toString();
      params['longitude'] = options.location.lng.toString();
      params['radius'] = Math.round((options.location.radiusMiles ?? 25) * 1609.34).toString(); // Convert to meters
    } else if (options.location?.city) {
      params['location'] = options.location.city;
    } else {
      // Yelp requires location
      throw new Error('Yelp Events API requires a location filter');
    }

    // Date filter
    if (options.date?.startDate) {
      params['start_date'] = Math.floor(options.date.startDate.getTime() / 1000).toString();
    }
    if (options.date?.endDate) {
      params['end_date'] = Math.floor(options.date.endDate.getTime() / 1000).toString();
    }

    // Pagination
    if (options.cursor) {
      params['offset'] = options.cursor;
    }

    // Category filter
    if (options.categories?.length) {
      params['categories'] = this.mapCategoriesToYelp(options.categories).join(',');
    }

    const response = await this.request<YelpSearchResponse>({
      method: 'GET',
      url: '/events',
      params,
    });

    const events: RawEvent[] = response.events.map(event => ({
      sourceId: event.id,
      source: this.sourceName,
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    const currentOffset = parseInt(options.cursor ?? '0');
    const hasMore = currentOffset + events.length < response.total;

    return {
      events,
      hasMore,
      nextCursor: hasMore ? (currentOffset + events.length).toString() : undefined,
      totalCount: response.total,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as YelpEvent;

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.event_site_url,
      name: event.name,
      description: event.description,
      summary: this.truncate(event.description, 300),
      startDate: new Date(event.time_start),
      endDate: event.time_end ? new Date(event.time_end) : null,
      timezone: null, // Yelp doesn't provide timezone
      isAllDay: false,
      venue: {
        name: null, // Yelp events may not have venue name
        address: event.location.address1,
        city: event.location.city,
        state: event.location.state,
        country: event.location.country,
        postalCode: event.location.zip_code,
        lat: event.latitude,
        lng: event.longitude,
      },
      isOnline: false, // Yelp is focused on local events
      onlineUrl: null,
      categories: [this.mapYelpCategory(event.category)],
      tags: [],
      imageUrl: event.image_url,
      images: event.image_url
        ? [{ url: event.image_url, width: null, height: null, type: 'banner' as const }]
        : [],
      isFree: event.is_free,
      priceMin: event.cost,
      priceMax: event.cost_max ?? event.cost,
      currency: 'USD', // Yelp is US-focused
      ticketUrl: event.tickets_url,
      organizer: null,
      attendeeCount: event.attending_count,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private mapCategoriesToYelp(categories: string[]): string[] {
    const categoryMap: Record<string, string> = {
      'food': 'food-and-drink',
      'music': 'music',
      'arts': 'visual-arts',
      'sports': 'sports-active-life',
      'nightlife': 'nightlife',
      'wellness': 'charities',
      'community': 'charities',
      'business': 'business',
      'tech': 'business',
    };
    return categories.map(c => categoryMap[c] ?? c).filter(Boolean);
  }

  private mapYelpCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'food-and-drink': 'food',
      'music': 'music',
      'visual-arts': 'arts',
      'performing-arts': 'arts',
      'film': 'arts',
      'sports-active-life': 'sports',
      'nightlife': 'nightlife',
      'charities': 'community',
      'business': 'business',
      'kids-family': 'family',
      'festivals-fairs': 'community',
      'lectures-books': 'education',
      'fashion': 'other',
      'other': 'other',
    };
    return categoryMap[category] ?? 'other';
  }
}
