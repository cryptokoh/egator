import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface SchemaOrgEvent {
  '@type': 'Event';
  '@context'?: string;
  name: string;
  description?: string;
  url?: string;
  startDate: string;
  endDate?: string;
  location?: {
    '@type': string;
    name?: string;
    address?: {
      '@type': string;
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    } | string;
    geo?: {
      '@type': string;
      latitude: number;
      longitude: number;
    };
  };
  image?: string | string[] | { url: string }[];
  offers?: {
    '@type': string;
    price?: number | string;
    priceCurrency?: string;
    url?: string;
    availability?: string;
  } | Array<{
    '@type': string;
    price?: number | string;
    priceCurrency?: string;
    url?: string;
  }>;
  organizer?: {
    '@type': string;
    name: string;
    url?: string;
  };
  performer?: {
    '@type': string;
    name: string;
  } | Array<{ '@type': string; name: string }>;
  eventAttendanceMode?: string;
  eventStatus?: string;
}

/**
 * Crawler for schema.org Event structured data
 * Extracts JSON-LD event data from web pages
 * @see https://schema.org/Event
 */
export class SchemaOrgCrawler {
  private readonly userAgent = 'AIeGator/0.1.0 (Event Aggregator)';
  private readonly timeout = 15000;

  constructor(private config: AdapterConfig = {}) {}

  /**
   * Crawl a URL and extract schema.org Event data
   */
  async crawlUrl(url: string): Promise<RawEvent[]> {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      const $ = cheerio.load(response.data);
      const events: RawEvent[] = [];

      // Find all JSON-LD scripts
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (!jsonText) return;

          const data = JSON.parse(jsonText);
          const extractedEvents = this.extractEvents(data, url);
          events.push(...extractedEvents);
        } catch (e) {
          // Invalid JSON, skip
        }
      });

      return events;
    } catch (error) {
      console.error(`[SchemaOrgCrawler] Failed to crawl ${url}:`, error);
      return [];
    }
  }

  /**
   * Extract Event objects from JSON-LD data
   */
  private extractEvents(data: unknown, sourceUrl: string): RawEvent[] {
    const events: RawEvent[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        events.push(...this.extractEvents(item, sourceUrl));
      }
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Check if this is an Event
      if (obj['@type'] === 'Event' || (Array.isArray(obj['@type']) && obj['@type'].includes('Event'))) {
        events.push({
          sourceId: this.generateId(obj as unknown as SchemaOrgEvent, sourceUrl),
          source: 'schema-crawler',
          rawData: { ...obj, _sourceUrl: sourceUrl },
          fetchedAt: new Date(),
        });
      }

      // Check @graph for multiple entities
      if (Array.isArray(obj['@graph'])) {
        events.push(...this.extractEvents(obj['@graph'], sourceUrl));
      }
    }

    return events;
  }

  /**
   * Generate a unique ID for a schema.org event
   */
  private generateId(event: SchemaOrgEvent, sourceUrl: string): string {
    const parts = [
      sourceUrl,
      event.name,
      event.startDate,
      typeof event.location === 'object' ? event.location?.name : '',
    ].filter(Boolean);

    // Simple hash
    let hash = 0;
    const str = parts.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `schema-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Normalize a schema.org event to our format
   */
  normalize(raw: RawEvent): NormalizedEvent {
    const data = raw.rawData as unknown as SchemaOrgEvent & { _sourceUrl: string };
    const sourceUrl = data._sourceUrl;

    // Parse location
    const venue = this.parseLocation(data.location);

    // Parse images
    const images = this.parseImages(data.image);

    // Parse offers/pricing
    const { isFree, priceMin, priceMax, currency, ticketUrl } = this.parseOffers(data.offers);

    // Determine if online
    const isOnline = data.eventAttendanceMode === 'https://schema.org/OnlineEventAttendanceMode' ||
                     data.eventAttendanceMode === 'OnlineEventAttendanceMode';

    return {
      sourceId: raw.sourceId,
      source: 'schema-crawler',
      url: data.url ?? sourceUrl,
      name: data.name,
      description: data.description ?? null,
      summary: data.description ? data.description.slice(0, 300) : null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      timezone: null,
      isAllDay: false,
      venue,
      isOnline,
      onlineUrl: isOnline ? (data.url ?? sourceUrl) : null,
      categories: [], // Schema.org events don't have standard categories
      tags: this.extractPerformers(data.performer),
      imageUrl: images[0]?.url ?? null,
      images,
      isFree,
      priceMin,
      priceMax,
      currency,
      ticketUrl: ticketUrl ?? data.url ?? sourceUrl,
      organizer: data.organizer
        ? { name: data.organizer.name, url: data.organizer.url ?? null }
        : null,
      attendeeCount: null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private parseLocation(location: SchemaOrgEvent['location']): NormalizedEvent['venue'] {
    if (!location) {
      return {
        name: null, address: null, city: null, state: null,
        country: null, postalCode: null, lat: null, lng: null,
      };
    }

    let address: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let country: string | null = null;
    let postalCode: string | null = null;

    if (typeof location.address === 'string') {
      address = location.address;
    } else if (typeof location.address === 'object') {
      address = location.address.streetAddress ?? null;
      city = location.address.addressLocality ?? null;
      state = location.address.addressRegion ?? null;
      country = location.address.addressCountry ?? null;
      postalCode = location.address.postalCode ?? null;
    }

    return {
      name: location.name ?? null,
      address,
      city,
      state,
      country,
      postalCode,
      lat: location.geo?.latitude ?? null,
      lng: location.geo?.longitude ?? null,
    };
  }

  private parseImages(image: SchemaOrgEvent['image']): Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }> {
    if (!image) return [];

    const urls: string[] = [];

    if (typeof image === 'string') {
      urls.push(image);
    } else if (Array.isArray(image)) {
      for (const img of image) {
        if (typeof img === 'string') {
          urls.push(img);
        } else if (typeof img === 'object' && img.url) {
          urls.push(img.url);
        }
      }
    }

    return urls.map((url, i) => ({
      url,
      width: null,
      height: null,
      type: i === 0 ? 'banner' as const : 'other' as const,
    }));
  }

  private parseOffers(offers: SchemaOrgEvent['offers']): {
    isFree: boolean;
    priceMin: number | null;
    priceMax: number | null;
    currency: string | null;
    ticketUrl: string | null;
  } {
    if (!offers) {
      return { isFree: true, priceMin: null, priceMax: null, currency: null, ticketUrl: null };
    }

    const offerArray = Array.isArray(offers) ? offers : [offers];
    const prices: number[] = [];
    let currency: string | null = null;
    let ticketUrl: string | null = null;

    for (const offer of offerArray) {
      if (offer.price !== undefined) {
        const price = typeof offer.price === 'string' ? parseFloat(offer.price) : offer.price;
        if (!isNaN(price)) {
          prices.push(price);
        }
      }
      if (offer.priceCurrency) {
        currency = offer.priceCurrency;
      }
      if (offer.url) {
        ticketUrl = offer.url;
      }
    }

    const priceMin = prices.length ? Math.min(...prices) : null;
    const priceMax = prices.length ? Math.max(...prices) : null;
    const isFree = priceMin === 0 || priceMin === null;

    return { isFree, priceMin, priceMax, currency, ticketUrl };
  }

  private extractPerformers(performer: SchemaOrgEvent['performer']): string[] {
    if (!performer) return [];

    if (Array.isArray(performer)) {
      return performer.map(p => p.name);
    }

    return [performer.name];
  }
}
