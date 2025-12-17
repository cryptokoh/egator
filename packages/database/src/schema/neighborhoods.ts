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
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Neighborhoods table - geographic areas for hyper-local discovery
 */
export const neighborhoods = pgTable(
  'neighborhoods',
  {
    id: varchar('id', { length: 100 }).primaryKey(), // slug: "mission-district"
    name: varchar('name', { length: 255 }).notNull(),
    shortName: varchar('short_name', { length: 100 }),

    // Location
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }).notNull().default('USA'),

    // Geography - GeoJSON stored as JSONB
    boundary: jsonb('boundary').$type<{
      type: 'Polygon';
      coordinates: [number, number][][];
    }>().notNull(),

    center: jsonb('center').$type<{
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    }>().notNull(),

    // For PostGIS queries
    centerLat: real('center_lat').notNull(),
    centerLng: real('center_lng').notNull(),

    areaSqMiles: real('area_sq_miles'),

    // Character
    vibe: text('vibe'),
    knownFor: jsonb('known_for').$type<string[]>().default([]),
    neighborhoodType: varchar('neighborhood_type', { length: 50 }), // residential, commercial, etc.

    // Related
    adjacentNeighborhoods: jsonb('adjacent_neighborhoods').$type<string[]>().default([]),
    parentArea: varchar('parent_area', { length: 100 }),

    // Stats (updated periodically)
    totalEvents: integer('total_events').default(0),
    activeVenues: integer('active_venues').default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index('neighborhoods_city_idx').on(table.city),
    locationIdx: index('neighborhoods_location_idx').on(table.centerLat, table.centerLng),
  })
);

export type NeighborhoodRecord = typeof neighborhoods.$inferSelect;
export type NewNeighborhoodRecord = typeof neighborhoods.$inferInsert;

/**
 * User neighborhoods - saved locations for each user
 */
export const userNeighborhoods = pgTable(
  'user_neighborhoods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    neighborhoodId: varchar('neighborhood_id', { length: 100 })
      .notNull()
      .references(() => neighborhoods.id, { onDelete: 'cascade' }),

    // Relationship type
    type: varchar('type', { length: 50 }).notNull(), // home, work, favorite, frequent

    // Preferences
    walkingRadiusMinutes: integer('walking_radius_minutes').notNull().default(10),
    notificationsEnabled: boolean('notifications_enabled').notNull().default(true),

    // Custom name override
    customName: varchar('custom_name', { length: 100 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('user_neighborhoods_user_idx').on(table.userId),
    neighborhoodIdx: index('user_neighborhoods_neighborhood_idx').on(table.neighborhoodId),
    userNeighborhoodUnique: uniqueIndex('user_neighborhoods_unique').on(table.userId, table.neighborhoodId),
  })
);

export type UserNeighborhoodRecord = typeof userNeighborhoods.$inferSelect;
export type NewUserNeighborhoodRecord = typeof userNeighborhoods.$inferInsert;
