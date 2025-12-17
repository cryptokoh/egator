import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  real,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { events } from './events.js';

/**
 * Duplicate clusters table - groups of events identified as duplicates
 */
export const duplicateClusters = pgTable(
  'duplicate_clusters',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // The primary/canonical event for this cluster
    primaryEventId: uuid('primary_event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),

    // Cluster metrics
    avgSimilarity: real('avg_similarity').notNull(),
    confidence: real('confidence').notNull(),

    // LLM verification
    llmVerified: boolean('llm_verified').notNull().default(false),
    llmReasoning: text('llm_reasoning'),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'),
    // 'active' - cluster is valid
    // 'merged' - events have been merged
    // 'rejected' - cluster was rejected (false positive)

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: varchar('reviewed_by', { length: 100 }),
  },
  (table) => ({
    primaryEventIdx: index('clusters_primary_event_idx').on(table.primaryEventId),
    statusIdx: index('clusters_status_idx').on(table.status),
  })
);

export type DuplicateCluster = typeof duplicateClusters.$inferSelect;
export type NewDuplicateCluster = typeof duplicateClusters.$inferInsert;

/**
 * Cluster members table - events belonging to a duplicate cluster
 */
export const clusterMembers = pgTable(
  'cluster_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    clusterId: uuid('cluster_id')
      .notNull()
      .references(() => duplicateClusters.id, { onDelete: 'cascade' }),

    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),

    // Similarity to primary event
    similarityScore: real('similarity_score'),

    // Whether this is the primary event
    isPrimary: boolean('is_primary').notNull().default(false),

    // Timestamps
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clusterIdx: index('members_cluster_idx').on(table.clusterId),
    eventIdx: index('members_event_idx').on(table.eventId),
  })
);

export type ClusterMember = typeof clusterMembers.$inferSelect;
export type NewClusterMember = typeof clusterMembers.$inferInsert;

/**
 * Deduplication runs table - tracks each deduplication job
 */
export const deduplicationRuns = pgTable('deduplication_runs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Run details
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull(), // 'running', 'completed', 'failed'

  // Results
  totalEventsProcessed: integer('total_events_processed'),
  clustersFound: integer('clusters_found'),
  eventsMarkedDuplicate: integer('events_marked_duplicate'),
  llmVerificationsCount: integer('llm_verifications_count'),

  // Configuration used
  config: jsonb('config').$type<{
    similarityThreshold: number;
    minClusterSize: number;
    useLLMVerification: boolean;
  }>(),

  // Error details
  errorMessage: text('error_message'),

  // Performance
  durationMs: integer('duration_ms'),
});

export type DeduplicationRun = typeof deduplicationRuns.$inferSelect;
export type NewDeduplicationRun = typeof deduplicationRuns.$inferInsert;

// Type helper for integer
function integer(name: string) {
  return {
    ...varchar(name, { length: 255 }),
    $type: () => 0 as number,
  } as any;
}
