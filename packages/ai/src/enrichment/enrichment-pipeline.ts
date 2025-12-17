import { EmbeddingService } from '../embeddings/embedding-service.js';
import { CategorizationService } from '../categorization/categorization-service.js';
import { DeduplicationService } from '../deduplication/deduplication-service.js';
import { LLMService } from '../llm/llm-service.js';
import type { NormalizedEvent } from '@aiegator/adapters';

interface EnrichedEvent extends NormalizedEvent {
  embedding: number[];
  inferredCategories: string[];
  enrichedAt: Date;
}

interface EnrichmentConfig {
  generateEmbeddings: boolean;
  inferCategories: boolean;
  generateSummary: boolean;
  batchSize: number;
}

const DEFAULT_CONFIG: EnrichmentConfig = {
  generateEmbeddings: true,
  inferCategories: true,
  generateSummary: false, // Expensive, off by default
  batchSize: 50,
};

/**
 * Pipeline for enriching events with AI-generated data
 */
export class EnrichmentPipeline {
  private readonly embeddingService: EmbeddingService;
  private readonly categorizationService: CategorizationService;
  private readonly llmService: LLMService;
  private readonly config: EnrichmentConfig;

  constructor(config: Partial<EnrichmentConfig> = {}) {
    this.embeddingService = new EmbeddingService();
    this.categorizationService = new CategorizationService(this.embeddingService);
    this.llmService = new LLMService();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Enrich a batch of events
   */
  async enrichEvents(events: NormalizedEvent[]): Promise<EnrichedEvent[]> {
    const enriched: EnrichedEvent[] = [];
    const { batchSize } = this.config;

    // Process in batches
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(event => this.enrichEvent(event))
      );
      enriched.push(...batchResults);

      console.log(`[EnrichmentPipeline] Processed ${Math.min(i + batchSize, events.length)}/${events.length} events`);
    }

    return enriched;
  }

  /**
   * Enrich a single event
   */
  async enrichEvent(event: NormalizedEvent): Promise<EnrichedEvent> {
    const result: EnrichedEvent = {
      ...event,
      embedding: [],
      inferredCategories: [...event.categories],
      enrichedAt: new Date(),
    };

    // Generate embedding
    if (this.config.generateEmbeddings) {
      try {
        const text = this.embeddingService.createEventText({
          name: event.name,
          venue: event.venue.name,
          city: event.venue.city,
          date: event.startDate,
          description: event.description,
        });
        result.embedding = await this.embeddingService.embed(text);
      } catch (error) {
        console.error(`[EnrichmentPipeline] Failed to generate embedding for ${event.sourceId}:`, error);
      }
    }

    // Infer categories
    if (this.config.inferCategories && result.inferredCategories.length === 0) {
      try {
        const categories = await this.categorizationService.getCategories({
          name: event.name,
          description: event.description,
          tags: event.tags,
        });
        result.inferredCategories = categories.map(c => c.category);
      } catch (error) {
        console.error(`[EnrichmentPipeline] Failed to infer categories for ${event.sourceId}:`, error);
        // Fallback to keyword-based categorization
        const keywordCategories = this.categorizationService.categorizeByKeywords(
          `${event.name} ${event.description ?? ''}`
        );
        result.inferredCategories = keywordCategories.slice(0, 3);
      }
    }

    // Generate summary (if enabled and event lacks one)
    if (this.config.generateSummary && !event.summary && event.description) {
      try {
        const { summary } = await this.llmService.summarizeEvent({
          name: event.name,
          description: event.description,
          venue: event.venue.name,
          date: event.startDate,
        });
        (result as NormalizedEvent).summary = summary;
      } catch (error) {
        console.error(`[EnrichmentPipeline] Failed to generate summary for ${event.sourceId}:`, error);
      }
    }

    return result;
  }

  /**
   * Create deduplication service with shared embedding service
   */
  createDeduplicationService(): DeduplicationService {
    return new DeduplicationService(
      this.embeddingService,
      this.llmService
    );
  }

  /**
   * Get the embedding service (for direct access if needed)
   */
  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }

  /**
   * Get the categorization service
   */
  getCategorizationService(): CategorizationService {
    return this.categorizationService;
  }
}
