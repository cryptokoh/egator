import { BaseAdapter } from '../base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';

/**
 * Meetup GraphQL API response types
 */
interface MeetupEvent {
  id: string;
  title: string;
  eventUrl: string;
  description: string;
  dateTime: string;
  endTime: string | null;
  duration: string;
  timezone: string;
  going: number;
  maxTickets: number | null;
  isOnline: boolean;
  eventType: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    lat: number;
    lng: number;
  } | null;
  group: {
    name: string;
    urlname: string;
  };
  featuredEventPhoto: {
    highResUrl: string;
  } | null;
  feeSettings: {
    amount: number;
    currency: string;
    required: boolean;
  } | null;
  hosts: Array<{
    name: string;
  }>;
}

interface MeetupGraphQLResponse {
  data: {
    searchEvents?: {
      count: number;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
      edges: Array<{
        node: MeetupEvent;
      }>;
    };
    groupByUrlname?: {
      pastEvents?: {
        edges: Array<{ node: MeetupEvent }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
      upcomingEvents?: {
        edges: Array<{ node: MeetupEvent }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Adapter for Meetup GraphQL API
 * NOTE: Requires Meetup Pro account as of February 2025
 * @see https://www.meetup.com/api/guide/
 */
export class MeetupAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super('meetup', {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.meetup.com',
      rateLimit: config.rateLimit ?? { maxRequestsPerSecond: 2 },
    });
  }

  isConfigured(): boolean {
    return !!(this.config.accessToken || (this.config.clientId && this.config.clientSecret));
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      ...super.getDefaultHeaders(),
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    // Build GraphQL query
    const query = `
      query SearchEvents($filter: SearchConnectionFilter!, $first: Int, $after: String) {
        searchEvents(filter: $filter, first: $first, after: $after) {
          count
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              eventUrl
              description
              dateTime
              endTime
              duration
              timezone
              going
              maxTickets
              isOnline
              eventType
              venue {
                name
                address
                city
                state
                country
                postalCode
                lat
                lng
              }
              group {
                name
                urlname
              }
              featuredEventPhoto {
                highResUrl
              }
              feeSettings {
                amount
                currency
                required
              }
              hosts {
                name
              }
            }
          }
        }
      }
    `;

    // Build filter variables
    const filter: Record<string, unknown> = {
      query: options.keywords?.join(' ') ?? '',
      source: 'EVENTS',
    };

    if (options.location?.lat && options.location?.lng) {
      filter.lat = options.location.lat;
      filter.lon = options.location.lng;
      filter.radius = options.location.radiusMiles ?? 25;
    }

    if (options.date?.startDate) {
      filter.startDateRange = options.date.startDate.toISOString();
    }
    if (options.date?.endDate) {
      filter.endDateRange = options.date.endDate.toISOString();
    }

    const variables = {
      filter,
      first: options.limit ?? 20,
      after: options.cursor ?? null,
    };

    const response = await this.request<MeetupGraphQLResponse>({
      method: 'POST',
      url: '/gql',
      data: { query, variables },
    });

    if (response.errors?.length) {
      throw new Error(`Meetup API error: ${response.errors[0].message}`);
    }

    const searchResults = response.data.searchEvents;
    if (!searchResults) {
      return { events: [], hasMore: false };
    }

    const events: RawEvent[] = searchResults.edges.map(edge => ({
      sourceId: edge.node.id,
      source: this.sourceName,
      rawData: edge.node as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    return {
      events,
      hasMore: searchResults.pageInfo.hasNextPage,
      nextCursor: searchResults.pageInfo.endCursor,
      totalCount: searchResults.count,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as MeetupEvent;

    return {
      sourceId: raw.sourceId,
      source: this.sourceName,
      url: event.eventUrl,
      name: event.title,
      description: this.stripHtml(event.description),
      summary: this.truncate(this.stripHtml(event.description), 300),
      startDate: new Date(event.dateTime),
      endDate: event.endTime ? new Date(event.endTime) : null,
      timezone: event.timezone,
      isAllDay: false,
      venue: {
        name: event.venue?.name ?? null,
        address: event.venue?.address ?? null,
        city: event.venue?.city ?? null,
        state: event.venue?.state ?? null,
        country: event.venue?.country ?? null,
        postalCode: event.venue?.postalCode ?? null,
        lat: event.venue?.lat ?? null,
        lng: event.venue?.lng ?? null,
      },
      isOnline: event.isOnline,
      onlineUrl: event.isOnline ? event.eventUrl : null,
      categories: [this.mapEventType(event.eventType)],
      tags: [],
      imageUrl: event.featuredEventPhoto?.highResUrl ?? null,
      images: event.featuredEventPhoto
        ? [{ url: event.featuredEventPhoto.highResUrl, width: null, height: null, type: 'banner' as const }]
        : [],
      isFree: !event.feeSettings?.required,
      priceMin: event.feeSettings?.amount ?? null,
      priceMax: event.feeSettings?.amount ?? null,
      currency: event.feeSettings?.currency ?? null,
      ticketUrl: event.eventUrl,
      organizer: {
        name: event.group.name,
        url: `https://www.meetup.com/${event.group.urlname}/`,
      },
      attendeeCount: event.going,
      capacity: event.maxTickets,
      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  private mapEventType(eventType: string): string {
    const typeMap: Record<string, string> = {
      'PHYSICAL': 'community',
      'ONLINE': 'tech',
      'HYBRID': 'community',
    };
    return typeMap[eventType] ?? 'community';
  }
}
