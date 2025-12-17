import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

/**
 * Sources table - tracks event data sources and their status
 */
export const sources = pgTable('sources', {
  // Primary key - source name
  id: varchar('id', { length: 50 }).primaryKey(),

  // Display information
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  websiteUrl: text('website_url'),
  logoUrl: text('logo_url'),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isConfigured: boolean('is_configured').notNull().default(false),

  // Rate limiting
  rateLimitPerSecond: integer('rate_limit_per_second'),
  rateLimitPerDay: integer('rate_limit_per_day'),

  // Statistics
  totalEventsFetched: integer('total_events_fetched').notNull().default(0),
  lastFetchAt: timestamp('last_fetch_at', { withTimezone: true }),
  lastFetchStatus: varchar('last_fetch_status', { length: 50 }),
  lastFetchError: text('last_fetch_error'),

  // Configuration (encrypted API keys should be in env, not here)
  config: jsonb('config').$type<{
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    customHeaders?: Record<string, string>;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

/**
 * Fetch logs table - tracks each fetch operation
 */
export const fetchLogs = pgTable('fetch_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sourceId: varchar('source_id', { length: 50 }).notNull().references(() => sources.id),

  // Fetch details
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull(), // 'running', 'success', 'failed', 'partial'

  // Results
  eventsFound: integer('events_found').default(0),
  eventsNew: integer('events_new').default(0),
  eventsUpdated: integer('events_updated').default(0),
  eventsDuplicate: integer('events_duplicate').default(0),

  // Filters used
  filters: jsonb('filters').$type<{
    city?: string;
    startDate?: string;
    endDate?: string;
    categories?: string[];
  }>(),

  // Error details
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),

  // Performance
  durationMs: integer('duration_ms'),
  apiCallsCount: integer('api_calls_count'),
});

export type FetchLog = typeof fetchLogs.$inferSelect;
export type NewFetchLog = typeof fetchLogs.$inferInsert;
