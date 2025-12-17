import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

/**
 * ClassPass class/event structure
 * ClassPass is a fitness and wellness subscription service
 */
interface ClassPassClass {
  id: string;
  name: string;
  description?: string;

  // Schedule
  startTime: string;
  endTime?: string;
  duration: number; // minutes
  timezone?: string;

  // Venue/Studio
  venue: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };

  // Class details
  activityType: string;
  activityCategory: string;
  intensity?: 'low' | 'medium' | 'high';

  // Media
  imageUrl?: string;
  venueImages?: string[];

  // Capacity
  spotsAvailable?: number;
  totalSpots?: number;

  // Pricing (credits-based)
  credits: number;

  // Instructor
  instructor?: {
    name: string;
    imageUrl?: string;
  };

  // Ratings
  rating?: number;
  reviewCount?: number;

  // Tags
  amenities?: string[];
  tags?: string[];
}

interface ClassPassSearchResponse {
  classes: ClassPassClass[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    hasMore: boolean;
  };
}

/**
 * Adapter for ClassPass API
 * ClassPass offers access to fitness and wellness classes at various studios
 * Great source for yoga, dance, fitness, and wellness events
 *
 * Note: ClassPass API access requires partnership agreement
 * @see https://classpass.com/partners
 */
export class ClassPassAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('classpass', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.classpass.com/v1',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 10 },
    });
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey || this.config.accessToken);
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers = {
      ...super.getDefaultHeaders(),
    };

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    } else if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    }

    return headers;
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, string> = {};

    // Location filter (required for ClassPass)
    if (options.location?.lat && options.location?.lng) {
      params['lat'] = options.location.lat.toString();
      params['lng'] = options.location.lng.toString();
      params['radius'] = ((options.location.radiusMiles ?? 10) * 1.60934).toString(); // km
    } else if (options.location?.city) {
      params['city'] = options.location.city;
      if (options.location.state) {
        params['state'] = options.location.state;
      }
    }

    // Date filter
    if (options.date?.startDate) {
      params['startDate'] = options.date.startDate.toISOString().split('T')[0];
    }
    if (options.date?.endDate) {
      params['endDate'] = options.date.endDate.toISOString().split('T')[0];
    }

    // Activity type filter (maps to our categories)
    if (options.categories?.length) {
      const activityTypes = options.categories.map(c => this.mapToActivityType(c)).filter(Boolean);
      if (activityTypes.length) {
        params['activityTypes'] = activityTypes.join(',');
      }
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
      params['perPage'] = Math.min(options.limit, 50).toString();
    }

    try {
      const response = await this.request<ClassPassSearchResponse>({
        method: 'GET',
        url: '/classes/search',
        params,
      });

      const events: RawEvent[] = response.classes.map(cls => ({
        sourceId: cls.id,
        source: this.sourceName,
        rawData: cls as unknown as Record<string, unknown>,
        fetchedAt: new Date(),
      }));

      return {
        events,
        hasMore: response.meta.hasMore,
        nextCursor: response.meta.hasMore
          ? (response.meta.page + 1).toString()
          : undefined,
        totalCount: response.meta.total,
      };
    } catch (error) {
      console.warn(`[classpass] API request failed:`, error);
      return {
        events: [],
        hasMore: false,
      };
    }
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const cls = raw.rawData as unknown as ClassPassClass;

    // Calculate end time from duration
    const startDate = new Date(cls.startTime);
    const endDate = new Date(startDate.getTime() + cls.duration * 60000);

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: `https://classpass.com/classes/${cls.id}`,
      name: cls.name,
      description: cls.description ?? null,
      summary: cls.description ? this.truncate(cls.description, 300) : null,
      startDate,
      endDate,
      timezone: cls.timezone ?? null,
      isAllDay: false,
      venue: {
        name: cls.venue.name,
        address: cls.venue.address ?? null,
        city: cls.venue.city ?? null,
        state: cls.venue.state ?? null,
        country: cls.venue.country ?? null,
        postalCode: cls.venue.postalCode ?? null,
        lat: cls.venue.lat ?? null,
        lng: cls.venue.lng ?? null,
      },
      isOnline: false, // ClassPass is primarily in-person
      onlineUrl: null,
      categories: this.inferCategories(cls),
      tags: this.extractTags(cls),
      imageUrl: cls.imageUrl ?? (cls.venueImages?.[0] ?? null),
      images: this.extractImages(cls),
      isFree: false, // ClassPass requires membership
      priceMin: cls.credits, // Credits as price proxy
      priceMax: cls.credits,
      currency: 'credits',
      ticketUrl: `https://classpass.com/classes/${cls.id}`,
      organizer: cls.instructor ? {
        name: cls.instructor.name,
        url: null,
      } : null,
      attendeeCount: cls.totalSpots ? (cls.totalSpots - (cls.spotsAvailable ?? 0)) : null,
      capacity: cls.totalSpots ?? null,
      fetchedAt: raw.fetchedAt,
      rawData: {
        ...raw.rawData,
        // Preserve ClassPass-specific data
        credits: cls.credits,
        intensity: cls.intensity,
        rating: cls.rating,
        reviewCount: cls.reviewCount,
        instructor: cls.instructor,
      },
    };
  }

  /**
   * Infer categories from class data
   */
  private inferCategories(cls: ClassPassClass): string[] {
    const categories: string[] = [];

    // Map activity type
    categories.push(this.mapActivityCategory(cls.activityCategory));

    // Infer holistic/dance from activity type
    const activityLower = cls.activityType.toLowerCase();
    const nameLower = cls.name.toLowerCase();
    const combined = `${activityLower} ${nameLower}`;

    if (this.containsAny(combined, ['yoga', 'meditation', 'pilates', 'barre', 'stretch', 'mindfulness', 'breathwork', 'sound bath', 'wellness'])) {
      categories.push('holistic');
    }

    if (this.containsAny(combined, ['dance', 'zumba', 'hip hop', 'ballet', 'salsa', 'latin', 'barre', 'cardio dance'])) {
      categories.push('dance');
    }

    return [...new Set(categories)];
  }

  /**
   * Extract tags from class data
   */
  private extractTags(cls: ClassPassClass): string[] {
    const tags: string[] = [...(cls.tags ?? []), ...(cls.amenities ?? [])];

    // Add intensity tag
    if (cls.intensity) {
      tags.push(`intensity:${cls.intensity}`);
    }

    // Add activity type as tag
    tags.push(cls.activityType.toLowerCase().replace(/\s+/g, '-'));

    // Add instructor tag if available
    if (cls.instructor?.name) {
      tags.push(`instructor:${cls.instructor.name.toLowerCase().replace(/\s+/g, '-')}`);
    }

    return tags;
  }

  /**
   * Extract images from class data
   */
  private extractImages(cls: ClassPassClass): Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }> {
    const images: Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }> = [];

    if (cls.imageUrl) {
      images.push({ url: cls.imageUrl, width: null, height: null, type: 'banner' });
    }

    if (cls.venueImages) {
      for (const img of cls.venueImages) {
        if (img !== cls.imageUrl) {
          images.push({ url: img, width: null, height: null, type: 'other' });
        }
      }
    }

    if (cls.instructor?.imageUrl) {
      images.push({ url: cls.instructor.imageUrl, width: null, height: null, type: 'thumbnail' });
    }

    return images;
  }

  /**
   * Map our category to ClassPass activity type
   */
  private mapToActivityType(category: string): string | null {
    const map: Record<string, string> = {
      'yoga': 'yoga',
      'pilates': 'pilates',
      'dance': 'dance',
      'fitness': 'strength',
      'cardio': 'cardio',
      'cycling': 'cycling',
      'boxing': 'boxing',
      'meditation': 'meditation',
      'barre': 'barre',
      'holistic': 'yoga,meditation,pilates',
    };
    return map[category.toLowerCase()] ?? null;
  }

  /**
   * Map ClassPass activity category to our categories
   */
  private mapActivityCategory(category: string): string {
    const map: Record<string, string> = {
      'yoga': 'yoga',
      'pilates': 'pilates',
      'dance': 'dance',
      'strength': 'fitness',
      'cardio': 'fitness',
      'cycling': 'fitness',
      'boxing': 'fitness',
      'meditation': 'wellness',
      'barre': 'dance',
      'stretch': 'wellness',
      'hiit': 'fitness',
      'bootcamp': 'fitness',
      'martial-arts': 'fitness',
      'swimming': 'fitness',
      'rowing': 'fitness',
    };
    return map[category.toLowerCase()] ?? 'fitness';
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}
