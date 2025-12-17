import { EmbeddingService } from '../embeddings/embedding-service.js';
import { LLMService } from '../llm/llm-service.js';
import type {
  DeduplicationConfig,
  DeduplicationEvent,
  DeduplicationResult,
  DuplicateCluster,
} from './types.js';

const DEFAULT_CONFIG: DeduplicationConfig = {
  similarityThreshold: 0.7,
  minClusterSize: 2,
  useLLMVerification: true,
  skipLLMThreshold: 0.9,
  batchSize: 1000,
};

/**
 * Service for detecting and managing duplicate events
 * Uses embedding similarity + DBSCAN clustering + optional LLM verification
 */
export class DeduplicationService {
  private readonly embeddingService: EmbeddingService;
  private readonly llmService: LLMService;
  private readonly config: DeduplicationConfig;

  constructor(
    embeddingService: EmbeddingService,
    llmService: LLMService,
    config: Partial<DeduplicationConfig> = {}
  ) {
    this.embeddingService = embeddingService;
    this.llmService = llmService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a batch of events and find duplicates
   */
  async findDuplicates(events: DeduplicationEvent[]): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const errors: { eventId: string; error: string }[] = [];

    // Step 1: Generate embeddings for events that don't have them
    const eventsWithEmbeddings = await this.ensureEmbeddings(events, errors);

    // Step 2: Block events by (city + date) to reduce comparison space
    const blocks = this.blockEvents(eventsWithEmbeddings);

    // Step 3: Find similar events within each block
    const candidateClusters: DuplicateCluster[] = [];

    for (const block of blocks.values()) {
      if (block.length < 2) continue;

      const clusters = this.clusterSimilarEvents(block);
      candidateClusters.push(...clusters);
    }

    // Step 4: Verify uncertain clusters with LLM
    const verifiedClusters = this.config.useLLMVerification
      ? await this.verifyWithLLM(candidateClusters, eventsWithEmbeddings)
      : candidateClusters.map(c => ({ ...c, llmVerified: false }));

    // Step 5: Select primary events for each cluster
    const finalClusters = this.selectPrimaryEvents(verifiedClusters, eventsWithEmbeddings);

    // Calculate unique event count
    const duplicateEventIds = new Set(
      finalClusters.flatMap(c => c.eventIds.filter(id => id !== c.primaryEventId))
    );
    const uniqueEvents = events.length - duplicateEventIds.size;

    return {
      totalEvents: events.length,
      clustersFound: finalClusters.length,
      uniqueEvents,
      clusters: finalClusters,
      processingTimeMs: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Ensure all events have embeddings
   */
  private async ensureEmbeddings(
    events: DeduplicationEvent[],
    errors: { eventId: string; error: string }[]
  ): Promise<DeduplicationEvent[]> {
    const result: DeduplicationEvent[] = [];

    for (const event of events) {
      if (event.embedding) {
        result.push(event);
        continue;
      }

      try {
        const text = this.embeddingService.createEventText({
          name: event.name,
          venue: event.venue,
          city: event.city,
          date: event.date,
          description: event.description,
        });

        const embedding = await this.embeddingService.embed(text);
        result.push({ ...event, embedding });
      } catch (error) {
        errors.push({
          eventId: event.id,
          error: `Failed to generate embedding: ${error}`,
        });
      }
    }

    return result;
  }

  /**
   * Block events by city and date to reduce comparison space
   */
  private blockEvents(events: DeduplicationEvent[]): Map<string, DeduplicationEvent[]> {
    const blocks = new Map<string, DeduplicationEvent[]>();

    for (const event of events) {
      // Create block key: city + date (day only)
      const city = (event.city ?? 'unknown').toLowerCase().trim();
      const dateKey = event.date.toISOString().split('T')[0];
      const blockKey = `${city}|${dateKey}`;

      const block = blocks.get(blockKey) ?? [];
      block.push(event);
      blocks.set(blockKey, block);
    }

    return blocks;
  }

  /**
   * Cluster similar events using similarity threshold
   */
  private clusterSimilarEvents(events: DeduplicationEvent[]): DuplicateCluster[] {
    const clusters: DuplicateCluster[] = [];
    const visited = new Set<string>();
    let clusterCount = 0;

    for (let i = 0; i < events.length; i++) {
      if (visited.has(events[i].id)) continue;

      const cluster: DeduplicationEvent[] = [events[i]];
      visited.add(events[i].id);

      // Find all similar events
      for (let j = i + 1; j < events.length; j++) {
        if (visited.has(events[j].id)) continue;

        const similarity = this.embeddingService.cosineSimilarity(
          events[i].embedding!,
          events[j].embedding!
        );

        if (similarity >= this.config.similarityThreshold) {
          cluster.push(events[j]);
          visited.add(events[j].id);
        }
      }

      // Only create cluster if we found duplicates
      if (cluster.length >= this.config.minClusterSize) {
        const avgSimilarity = this.calculateAverageSimilarity(cluster);

        clusters.push({
          clusterId: `cluster-${++clusterCount}`,
          eventIds: cluster.map(e => e.id),
          avgSimilarity,
          confidence: this.calculateConfidence(cluster, avgSimilarity),
          llmVerified: false,
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate average pairwise similarity within a cluster
   */
  private calculateAverageSimilarity(events: DeduplicationEvent[]): number {
    if (events.length < 2) return 1;

    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        totalSimilarity += this.embeddingService.cosineSimilarity(
          events[i].embedding!,
          events[j].embedding!
        );
        count++;
      }
    }

    return totalSimilarity / count;
  }

  /**
   * Calculate confidence score for a cluster
   */
  private calculateConfidence(events: DeduplicationEvent[], avgSimilarity: number): number {
    // Factors that increase confidence:
    // 1. Higher similarity
    // 2. Same venue name
    // 3. Different sources (cross-platform duplicates are likely real)

    let confidence = avgSimilarity;

    // Check if venues match
    const venues = new Set(events.map(e => e.venue?.toLowerCase().trim()).filter(Boolean));
    if (venues.size === 1) {
      confidence = Math.min(1, confidence + 0.1);
    }

    // Multiple sources is a good sign
    const sources = new Set(events.map(e => e.source));
    if (sources.size > 1) {
      confidence = Math.min(1, confidence + 0.05);
    }

    return confidence;
  }

  /**
   * Verify uncertain clusters using LLM
   */
  private async verifyWithLLM(
    clusters: DuplicateCluster[],
    events: DeduplicationEvent[]
  ): Promise<DuplicateCluster[]> {
    const eventMap = new Map(events.map(e => [e.id, e]));
    const result: DuplicateCluster[] = [];

    for (const cluster of clusters) {
      // Skip high-confidence clusters
      if (cluster.confidence >= this.config.skipLLMThreshold) {
        result.push({ ...cluster, llmVerified: false });
        continue;
      }

      // Get events for this cluster
      const clusterEvents = cluster.eventIds
        .map(id => eventMap.get(id))
        .filter(Boolean) as DeduplicationEvent[];

      try {
        const verification = await this.llmService.verifyDuplicates(clusterEvents);

        if (verification.areDuplicates) {
          result.push({
            ...cluster,
            confidence: Math.max(cluster.confidence, verification.confidence),
            llmVerified: true,
            llmReasoning: verification.reasoning,
          });
        }
        // If LLM says they're not duplicates, don't include the cluster
      } catch (error) {
        // On LLM error, keep the cluster but mark as unverified
        console.warn(`[DeduplicationService] LLM verification failed:`, error);
        result.push(cluster);
      }
    }

    return result;
  }

  /**
   * Select the primary/canonical event for each cluster
   */
  private selectPrimaryEvents(
    clusters: DuplicateCluster[],
    events: DeduplicationEvent[]
  ): DuplicateCluster[] {
    const eventMap = new Map(events.map(e => [e.id, e]));

    return clusters.map(cluster => {
      const clusterEvents = cluster.eventIds
        .map(id => eventMap.get(id))
        .filter(Boolean) as DeduplicationEvent[];

      // Selection criteria (in order of priority):
      // 1. Prefer events with more complete data
      // 2. Prefer certain sources (Eventbrite > Ticketmaster > others)
      // 3. Prefer longer descriptions

      const scored = clusterEvents.map(event => ({
        event,
        score: this.scoreEventCompleteness(event),
      }));

      scored.sort((a, b) => b.score - a.score);
      const primary = scored[0]?.event;

      return {
        ...cluster,
        primaryEventId: primary?.id,
      };
    });
  }

  /**
   * Score event completeness for primary selection
   */
  private scoreEventCompleteness(event: DeduplicationEvent): number {
    let score = 0;

    // Source priority
    const sourcePriority: Record<string, number> = {
      'eventbrite': 10,
      'ticketmaster': 9,
      'meetup': 8,
      'allevents': 7,
      'yelp': 6,
      'bandsintown': 5,
      'schema-crawler': 3,
    };
    score += sourcePriority[event.source] ?? 0;

    // Data completeness
    if (event.venue) score += 2;
    if (event.city) score += 2;
    if (event.description) {
      score += Math.min(5, event.description.length / 100);
    }

    return score;
  }
}
