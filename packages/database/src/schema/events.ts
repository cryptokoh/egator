import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Custom pgvector type for embeddings
 * Uses the vector extension
 */
const vector = (name: string, dimensions: number) =>
  text(name).$type<number[]>();

/**
 * Events table - core table storing all aggregated events
 */
export const events = pgTable(
  'events',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    // Source tracking
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    url: text('url').notNull(),

    // Event details
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    summary: varchar('summary', { length: 500 }),

    // Timing
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    timezone: varchar('timezone', { length: 50 }),
    isAllDay: boolean('is_all_day').notNull().default(false),

    // Location - Venue
    venueName: varchar('venue_name', { length: 255 }),
    venueAddress: varchar('venue_address', { length: 500 }),
    venueCity: varchar('venue_city', { length: 100 }),
    venueState: varchar('venue_state', { length: 100 }),
    venueCountry: varchar('venue_country', { length: 100 }),
    venuePostalCode: varchar('venue_postal_code', { length: 20 }),
    venueLat: real('venue_lat'),
    venueLng: real('venue_lng'),

    // Online event
    isOnline: boolean('is_online').notNull().default(false),
    onlineUrl: text('online_url'),

    // Categorization
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    inferredCategories: jsonb('inferred_categories').$type<string[]>().notNull().default([]),

    // Media
    imageUrl: text('image_url'),
    images: jsonb('images').$type<Array<{
      url: string;
      width: number | null;
      height: number | null;
      type: string;
    }>>().notNull().default([]),

    // Pricing
    isFree: boolean('is_free').notNull().default(false),
    priceMin: real('price_min'),
    priceMax: real('price_max'),
    currency: varchar('currency', { length: 10 }),
    ticketUrl: text('ticket_url'),

    // Organizer
    organizerName: varchar('organizer_name', { length: 255 }),
    organizerUrl: text('organizer_url'),

    // Attendance
    attendeeCount: integer('attendee_count'),
    capacity: integer('capacity'),

    // AI-generated fields
    // Note: For pgvector, you'd use a proper vector column
    // This stores as JSON array, convert to vector for similarity search
    embedding: jsonb('embedding').$type<number[]>(),

    // Deduplication
    isDuplicate: boolean('is_duplicate').notNull().default(false),
    primaryEventId: uuid('primary_event_id'),
    duplicateClusterId: uuid('duplicate_cluster_id'),

    // Metadata
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),

    // Raw data for debugging
    rawData: jsonb('raw_data'),
  },
  (table) => ({
    // Unique constraint on source + sourceId
    sourceUnique: uniqueIndex('events_source_id_unique').on(table.source, table.sourceId),

    // Index for location-based queries
    cityIdx: index('events_city_idx').on(table.venueCity),
    locationIdx: index('events_location_idx').on(table.venueLat, table.venueLng),

    // Index for date-based queries
    startDateIdx: index('events_start_date_idx').on(table.startDate),

    // Index for source filtering
    sourceIdx: index('events_source_idx').on(table.source),

    // Index for duplicate filtering
    duplicateIdx: index('events_duplicate_idx').on(table.isDuplicate),

    // Note: GIN indexes for categories and full-text search should be created via migration
  })
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
