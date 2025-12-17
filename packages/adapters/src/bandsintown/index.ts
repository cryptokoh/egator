import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  description: string;
  venue: {
    name: string;
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
  artist: {
    id: string;
    name: string;
    url: string;
    image_url: string;
    thumb_url: string;
    facebook_page_url: string | null;
    tracker_count: number;
    upcoming_event_count: number;
  };
}

interface BandsintownArtist {
  id: string;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  facebook_page_url: string | null;
  tracker_count: number;
  upcoming_event_count: number;
}

/**
 * Adapter for Bandsintown API
 * NOTE: Designed for artists/enterprises, read-only access to events
 * @see https://publicapis.io/bandsintown-api
 */
export class BandsintownAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('bandsintown', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://rest.bandsintown.com',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 2 },
    });
  }

  isConfigured(): boolean {
    // Bandsintown uses app_id instead of API key
    return !!(this.config.apiKey || this.config.clientId);
  }

  private get appId(): string {
    return this.config.apiKey ?? this.config.clientId ?? '';
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    // Bandsintown is artist-centric, so we need artist names to search
    // For general event search, we'd need to:
    // 1. Search for artists in the area
    // 2. Get events for each artist

    // If keywords provided, treat as artist search
    if (!options.keywords?.length) {
      // Without artist name, we can't fetch from Bandsintown
      return { events: [], hasMore: false };
    }

    const allEvents: RawEvent[] = [];

    for (const artistName of options.keywords) {
      try {
        const events = await this.fetchArtistEvents(artistName, options);
        allEvents.push(...events);
      } catch (error) {
        console.warn(`[Bandsintown] Failed to fetch events for artist "${artistName}":`, error);
      }
    }

    // Filter by location if provided
    let filteredEvents = allEvents;
    if (options.location?.city) {
      const cityLower = options.location.city.toLowerCase();
      filteredEvents = allEvents.filter(e => {
        const venue = (e.rawData as unknown as BandsintownEvent).venue;
        return venue.city.toLowerCase().includes(cityLower);
      });
    }

    // Filter by date range
    if (options.date?.startDate || options.date?.endDate) {
      filteredEvents = filteredEvents.filter(e => {
        const eventDate = new Date((e.rawData as unknown as BandsintownEvent).datetime);
        if (options.date?.startDate && eventDate < options.date.startDate) return false;
        if (options.date?.endDate && eventDate > options.date.endDate) return false;
        return true;
      });
    }

    return {
      events: filteredEvents.slice(0, options.limit ?? 50),
      hasMore: false, // Bandsintown doesn't have pagination for event search
    };
  }

  private async fetchArtistEvents(artistName: string, options: FetchOptions): Promise<RawEvent[]> {
    const encodedArtist = encodeURIComponent(artistName);

    const params: Record<string, string> = {
      app_id: this.appId,
    };

    // Date filter
    if (options.date?.startDate) {
      params['date'] = `${this.formatDate(options.date.startDate)},${
        options.date.endDate ? this.formatDate(options.date.endDate) : 'upcoming'
      }`;
    } else {
      params['date'] = 'upcoming';
    }

    const events = await this.request<BandsintownEvent[]>({
      method: 'GET',
      url: `/artists/${encodedArtist}/events`,
      params,
    });

    return events.map(event => ({
      sourceId: event.id,
      source: this.sourceName,
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as BandsintownEvent;

    // Build event name from lineup
    const name = event.lineup.length > 1
      ? event.lineup.join(', ')
      : event.artist?.name ?? event.lineup[0] ?? 'Unknown Artist';

    // Get ticket URL from offers
    const ticketOffer = event.offers.find(o => o.status === 'available');

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.url,
      name,
      description: event.description || `${name} live at ${event.venue.name}`,
      summary: `${name} performing live at ${event.venue.name}, ${event.venue.city}`,
      startDate: new Date(event.datetime),
      endDate: null, // Bandsintown doesn't provide end time
      timezone: null,
      isAllDay: false,
      venue: {
        name: event.venue.name,
        address: null, // Not provided
        city: event.venue.city,
        state: event.venue.region,
        country: event.venue.country,
        postalCode: null,
        lat: parseFloat(event.venue.latitude),
        lng: parseFloat(event.venue.longitude),
      },
      isOnline: false,
      onlineUrl: null,
      categories: ['music'],
      tags: event.lineup,
      imageUrl: event.artist?.image_url ?? null,
      images: [
        event.artist?.image_url && { url: event.artist.image_url, width: null, height: null, type: 'banner' as const },
        event.artist?.thumb_url && { url: event.artist.thumb_url, width: null, height: null, type: 'thumbnail' as const },
      ].filter(Boolean) as Array<{ url: string; width: number | null; height: number | null; type: 'thumbnail' | 'banner' | 'poster' | 'other' }>,
      isFree: false, // Concerts typically aren't free
      priceMin: null, // Bandsintown doesn't provide pricing
      priceMax: null,
      currency: null,
      ticketUrl: ticketOffer?.url ?? event.url,
      organizer: event.artist
        ? { name: event.artist.name, url: event.artist.url }
        : null,
      attendeeCount: event.artist?.tracker_count ?? null,
      capacity: null,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }
}
