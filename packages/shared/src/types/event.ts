import type { Category } from './category.js';
import type { Source } from './source.js';

/**
 * Venue information
 */
export interface Venue {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Event organizer information
 */
export interface Organizer {
  name: string | null;
  url: string | null;
}

/**
 * Event image
 */
export interface EventImage {
  url: string;
  width: number | null;
  height: number | null;
  type: 'thumbnail' | 'banner' | 'poster' | 'other';
}

/**
 * Core event type
 */
export interface Event {
  // Database fields
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Source tracking
  sourceId: string;
  source: Source;
  url: string;

  // Event details
  name: string;
  description: string | null;
  summary: string | null;

  // Timing
  startDate: Date;
  endDate: Date | null;
  timezone: string | null;
  isAllDay: boolean;

  // Location
  venue: Venue;
  isOnline: boolean;
  onlineUrl: string | null;

  // Categorization
  categories: Category[];
  tags: string[];

  // Media
  imageUrl: string | null;
  images: EventImage[];

  // Pricing
  isFree: boolean;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  ticketUrl: string | null;

  // Organizer
  organizer: Organizer | null;

  // Attendance
  attendeeCount: number | null;
  capacity: number | null;

  // AI-generated fields
  embedding: number[] | null;
  inferredCategories: Category[];

  // Deduplication
  isDuplicate: boolean;
  primaryEventId: string | null;
  duplicateClusterId: string | null;

  // Metadata
  fetchedAt: Date;
  enrichedAt: Date | null;
}

/**
 * Filters for querying events
 */
export interface EventFilters {
  // Location
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  radius?: number; // miles

  // Time
  startDate?: Date;
  endDate?: Date;

  // Categories
  category?: Category;
  categories?: Category[];

  // Source
  source?: Source;
  sources?: Source[];

  // Other filters
  isFree?: boolean;
  isOnline?: boolean;
  excludeDuplicates?: boolean;

  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Search query parameters
 */
export interface SearchQuery extends EventFilters {
  q: string;
  semantic?: boolean;
}

/**
 * Search result
 */
export interface SearchResult {
  events: Event[];
  total: number;
  page: number;
  limit: number;
  query: string;
  searchType: 'semantic' | 'keyword';
}
