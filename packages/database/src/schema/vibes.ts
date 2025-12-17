import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  real,
  integer,
  jsonb,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { events } from './events.js';

/**
 * Event vibes table - mood and vibe data for events
 * Separating vibes allows for different confidence sources and easier updates
 */
export const eventVibes = pgTable(
  'event_vibes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' })
      .unique(),

    // Core moods (1-3 per event)
    moods: jsonb('moods').$type<string[]>().notNull().default([]),

    // Energy level 1-5
    energyLevel: integer('energy_level'),

    // Social characteristics
    soloFriendly: boolean('solo_friendly').default(true),
    socialDensity: varchar('social_density', { length: 50 }), // solo, partner, social, crowd
    intimacyLevel: varchar('intimacy_level', { length: 50 }), // open, community, intimate, sacred

    // Time classification
    timeVibe: varchar('time_vibe', { length: 50 }), // morning, afternoon, evening, late-night

    // Vertical flags
    isHolistic: boolean('is_holistic').notNull().default(false),
    isDance: boolean('is_dance').notNull().default(false),

    // Vertical-specific tags
    holisticTags: jsonb('holistic_tags').$type<string[]>().default([]),
    danceTags: jsonb('dance_tags').$type<string[]>().default([]),

    // Confidence and source
    confidence: real('confidence').default(0.5),
    source: varchar('source', { length: 50 }).notNull().default('ai'), // ai, curated, community

    // Manual override flag
    isManuallyVerified: boolean('is_manually_verified').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index('event_vibes_event_idx').on(table.eventId),
    holisticIdx: index('event_vibes_holistic_idx').on(table.isHolistic),
    danceIdx: index('event_vibes_dance_idx').on(table.isDance),
    energyIdx: index('event_vibes_energy_idx').on(table.energyLevel),
    // Note: GIN index for moods should be created via migration
  })
);

export type EventVibeRecord = typeof eventVibes.$inferSelect;
export type NewEventVibeRecord = typeof eventVibes.$inferInsert;

/**
 * Community vibe votes - crowdsourced vibe data
 */
export const vibeVotes = pgTable(
  'vibe_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),

    // What they're voting on
    voteType: varchar('vote_type', { length: 50 }).notNull(), // mood, energy, density, etc.
    voteValue: varchar('vote_value', { length: 100 }).notNull(),

    // Context
    attendedEvent: boolean('attended_event').default(false),

    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index('vibe_votes_event_idx').on(table.eventId),
    userIdx: index('vibe_votes_user_idx').on(table.userId),
  })
);

export type VibeVoteRecord = typeof vibeVotes.$inferSelect;
export type NewVibeVoteRecord = typeof vibeVotes.$inferInsert;
