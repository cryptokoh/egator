import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

/**
 * Humanitix event structure from their API
 * Humanitix is a charity-focused event platform that donates booking fees
 */
interface HumanitixEvent {
  _id: string;
  name: string;
  description?: string;
  summary?: string;
  slug: string;
  url: string;

  // Dates
  startDate: string;
  endDate?: string;
  timezone?: string;
  isMultiDay?: boolean;

  // Location
  location?: {
    type: 'physical' | 'online' | 'hybrid';
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  onlineEventUrl?: string;

  // Media
  bannerImage?: string;
  logoImage?: string;
  images?: Array<{
    url: string;
    type: string;
  }>;

  // Pricing
  isFree?: boolean;
  minTicketPrice?: number;
  maxTicketPrice?: number;
  currency?: string;

  // Organizer
  organiser?: {
    _id: string;
    name: string;
    logo?: string;
    url?: string;
  };

  // Categories
  category?: string;
  tags?: string[];

  // Stats
  ticketsSold?: number;
  capacity?: number;

  // Charity info (unique to Humanitix)
  charityPartner?: {
    name: string;
    logo?: string;
  };
  impactAmount?: number;
}

interface HumanitixSearchResponse {
  events: HumanitixEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Adapter for Humanitix API
 * Humanitix is an event ticketing platform that donates 100% of profits to charity
 * Great source for community, wellness, and social impact events
 *
 * @see https://developer.humanitix.com/
 */
export class HumanitixAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('humanitix', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.humanitix.com/v1',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 10 },
    });
  }

  isConfigured(): boolean {
    // Humanitix has both public API and authenticated API
    // Public API works without key for basic searches
    return true;
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers = {
      ...super.getDefaultHeaders(),
    };

    if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    }

    return headers;
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {};

    // Location filter
    if (options.location?.lat && options.location?.lng) {
      params['lat'] = options.location.lat.toString();
      params['lng'] = options.location.lng.toString();
      params['radius'] = ((options.location.radiusMiles ?? 25) * 1.60934).toString(); // Convert to km
    } else if (options.location?.city) {
      params['city'] = options.location.city;
      if (options.location.state) {
        params['state'] = options.location.state;
      }
      if (options.location.country) {
        params['country'] = options.location.country;
      }
    }

    // Date filter
    if (options.date?.startDate) {
      params['startDate'] = options.date.startDate.toISOString();
    }
    if (options.date?.endDate) {
      params['endDate'] = options.date.endDate.toISOString();
    }

    // Categories - map to Humanitix categories
    if (options.categories?.length) {
      params['category'] = options.categories.join(',');
    }

    // Keywords/search
    if (options.keywords?.length) {
      params['q'] = options.keywords.join(' ');
    }

    // Pagination
    if (options.cursor) {
      params['page'] = options.cursor;
    }
    if (options.limit) {
      params['limit'] = Math.min(options.limit, 100).toString();
    }

    // Default to upcoming events only
    params['status'] = 'live';
    params['sort'] = 'startDate';

    try {
      const response = await this.request<HumanitixSearchResponse>({
        method: 'GET',
        url: '/events/search',
        params,
      });

      const events: RawEvent[] = response.events.map(event => ({
        sourceId: event._id,
        source: this.sourceName,
        rawData: event as unknown as Record<string, unknown>,
        fetchedAt: new Date(),
      }));

      return {
        events,
        hasMore: response.pagination.hasMore,
        nextCursor: response.pagination.hasMore
          ? (response.pagination.page + 1).toString()
          : undefined,
        totalCount: response.pagination.total,
      };
    } catch (error) {
      // If API fails, return empty result (graceful degradation)
      console.warn(`[humanitix] API request failed:`, error);
      return {
        events: [],
        hasMore: false,
      };
    }
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as HumanitixEvent;

    // Determine location type
    const isOnline = event.location?.type === 'online' || event.location?.type === 'hybrid';

    // Build event URL
    const eventUrl = event.url || `https://events.humanitix.com/${event.slug}`;

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: eventUrl,
      name: event.name,
      description: this.stripHtml(event.description ?? null),
      summary: event.summary ?? this.truncate(event.description ?? null, 300),
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : null,
      timezone: event.timezone ?? null,
      isAllDay: false,
      venue: {
        name: event.location?.venue ?? null,
        address: event.location?.address ?? null,
        city: event.location?.city ?? null,
        state: event.location?.state ?? null,
        country: event.location?.country ?? null,
        postalCode: event.location?.postalCode ?? null,
        lat: event.location?.coordinates?.lat ?? null,
        lng: event.location?.coordinates?.lng ?? null,
      },
      isOnline,
      onlineUrl: isOnline ? (event.onlineEventUrl ?? eventUrl) : null,
      categories: this.inferCategories(event),
      tags: this.extractTags(event),
      imageUrl: event.bannerImage ?? event.logoImage ?? null,
      images: this.extractImages(event),
      isFree: event.isFree ?? (event.minTicketPrice === 0),
      priceMin: event.minTicketPrice ?? null,
      priceMax: event.maxTicketPrice ?? null,
      currency: event.currency ?? 'USD',
      ticketUrl: eventUrl,
      organizer: event.organiser ? {
        name: event.organiser.name,
        url: event.organiser.url ?? null,
      } : null,
      attendeeCount: event.ticketsSold ?? null,
      capacity: event.capacity ?? null,
      fetchedAt: raw.fetchedAt,
      rawData: {
        ...raw.rawData,
        // Preserve Humanitix-specific charity data
        charityPartner: event.charityPartner,
        impactAmount: event.impactAmount,
      },
    };
  }

  /**
   * Infer categories from event data
   * Humanitix is particularly good for wellness/community events
   */
  private inferCategories(event: HumanitixEvent): string[] {
    const categories: string[] = [];

    if (event.category) {
      categories.push(this.mapCategory(event.category));
    }

    // Infer from event name/description for holistic/dance events
    const text = `${event.name} ${event.description ?? ''}`.toLowerCase();

    // Holistic indicators
    if (this.containsAny(text, ['yoga', 'meditation', 'mindfulness', 'wellness', 'healing', 'breathwork', 'sound bath', 'retreat'])) {
      categories.push('holistic');
    }

    // Dance indicators
    if (this.containsAny(text, ['dance', 'salsa', 'bachata', 'tango', 'ecstatic', 'movement', 'dj', 'club'])) {
      categories.push('dance');
    }

    // Community/social impact (common on Humanitix)
    if (this.containsAny(text, ['community', 'fundraiser', 'charity', 'volunteer', 'social impact', 'nonprofit'])) {
      categories.push('community');
    }

    return [...new Set(categories)];
  }

  /**
   * Extract tags from event
   */
  private extractTags(event: HumanitixEvent): string[] {
    const tags: string[] = [...(event.tags ?? [])];

    // Add charity tag if it's a charity event
    if (event.charityPartner) {
      tags.push('charity-event');
      tags.push(`supports:${event.charityPartner.name.toLowerCase().replace(/\s+/g, '-')}`);
    }

    return tags;
  }

  /**
   * Extract images from event
   */
  private extractImages(event: HumanitixEvent): Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }> {
    const images: Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }> = [];

    if (event.bannerImage) {
      images.push({ url: event.bannerImage, width: null, height: null, type: 'banner' });
    }
    if (event.logoImage && event.logoImage !== event.bannerImage) {
      images.push({ url: event.logoImage, width: null, height: null, type: 'thumbnail' });
    }
    if (event.images) {
      for (const img of event.images) {
        if (img.url !== event.bannerImage && img.url !== event.logoImage) {
          images.push({ url: img.url, width: null, height: null, type: 'other' });
        }
      }
    }

    return images;
  }

  /**
   * Map Humanitix category to our standard categories
   */
  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'music': 'music',
      'performing-arts': 'arts',
      'visual-arts': 'arts',
      'film': 'film',
      'food-drink': 'food',
      'health-wellness': 'health',
      'sports-fitness': 'sports',
      'business': 'business',
      'science-tech': 'tech',
      'travel-outdoor': 'travel',
      'community': 'community',
      'charity-causes': 'charity',
      'government-politics': 'government',
      'spirituality': 'spirituality',
      'family-education': 'family',
      'fashion': 'fashion',
      'hobbies': 'hobbies',
      'other': 'other',
    };
    return categoryMap[category.toLowerCase()] ?? 'other';
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}
