/**
 * A cluster of potentially duplicate events
 */
export interface DuplicateCluster {
  /** Unique identifier for this cluster */
  clusterId: string;

  /** Event IDs in this cluster */
  eventIds: string[];

  /** The primary/canonical event ID (if determined) */
  primaryEventId?: string;

  /** Average similarity score within the cluster */
  avgSimilarity: number;

  /** Confidence score (0-1) that these are true duplicates */
  confidence: number;

  /** Whether this cluster was verified by LLM */
  llmVerified: boolean;

  /** LLM's reasoning for the deduplication decision */
  llmReasoning?: string;
}

/**
 * Result of the deduplication process
 */
export interface DeduplicationResult {
  /** Total events processed */
  totalEvents: number;

  /** Number of duplicate clusters found */
  clustersFound: number;

  /** Number of unique events after deduplication */
  uniqueEvents: number;

  /** The duplicate clusters */
  clusters: DuplicateCluster[];

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Events that couldn't be processed */
  errors: { eventId: string; error: string }[];
}

/**
 * Configuration for the deduplication service
 */
export interface DeduplicationConfig {
  /** Similarity threshold for initial clustering (0-1, default 0.7) */
  similarityThreshold: number;

  /** Minimum cluster size to consider (default 2) */
  minClusterSize: number;

  /** Whether to use LLM for verification (default true) */
  useLLMVerification: boolean;

  /** Confidence threshold above which to skip LLM verification (default 0.9) */
  skipLLMThreshold: number;

  /** Maximum events to process in one batch (default 1000) */
  batchSize: number;
}

/**
 * Event data needed for deduplication
 */
export interface DeduplicationEvent {
  id: string;
  name: string;
  venue: string | null;
  city: string | null;
  date: Date;
  source: string;
  description?: string | null;
  embedding?: number[];
}
