import { z } from 'zod';

/**
 * Configuration for an adapter
 */
export interface AdapterConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  baseUrl?: string;
  rateLimit?: {
    maxRequestsPerSecond: number;
    maxRequestsPerDay?: number;
  };
  timeout?: number;
  retries?: number;
}

/**
 * Raw event data from a source (before normalization)
 */
export interface RawEvent {
  sourceId: string;
  source: string;
  rawData: Record<string, unknown>;
  fetchedAt: Date;
}

/**
 * Result of a fetch operation
 */
export interface FetchResult {
  events: RawEvent[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

/**
 * Location filter for fetching events
 */
export interface LocationFilter {
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}

/**
 * Date range filter
 */
export interface DateFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Combined fetch options
 */
export interface FetchOptions {
  location?: LocationFilter;
  date?: DateFilter;
  categories?: string[];
  keywords?: string[];
  cursor?: string;
  limit?: number;
}

/**
 * Normalized event schema (output of adapters)
 */
export const NormalizedEventSchema = z.object({
  // Core identification
  sourceId: z.string(),
  source: z.string(),
  url: z.string().url(),

  // Event details
  name: z.string(),
  description: z.string().nullable(),
  summary: z.string().nullable(),

  // Timing
  startDate: z.date(),
  endDate: z.date().nullable(),
  timezone: z.string().nullable(),
  isAllDay: z.boolean().default(false),

  // Location
  venue: z.object({
    name: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
    postalCode: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  }),
  isOnline: z.boolean().default(false),
  onlineUrl: z.string().url().nullable(),

  // Categorization
  categories: z.array(z.string()),
  tags: z.array(z.string()),

  // Media
  imageUrl: z.string().url().nullable(),
  images: z.array(z.object({
    url: z.string().url(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    type: z.enum(['thumbnail', 'banner', 'poster', 'other']).default('other'),
  })),

  // Pricing
  isFree: z.boolean().default(false),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  currency: z.string().nullable(),
  ticketUrl: z.string().url().nullable(),

  // Organizer
  organizer: z.object({
    name: z.string().nullable(),
    url: z.string().url().nullable(),
  }).nullable(),

  // Attendance
  attendeeCount: z.number().nullable(),
  capacity: z.number().nullable(),

  // Metadata
  fetchedAt: z.date(),
  rawData: z.record(z.unknown()),
});

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;
