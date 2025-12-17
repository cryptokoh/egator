// Embedding generation
export { EmbeddingService } from './embeddings/embedding-service.js';

// Deduplication
export { DeduplicationService } from './deduplication/deduplication-service.js';
export type { DuplicateCluster, DeduplicationResult } from './deduplication/types.js';

// Categorization
export { CategorizationService } from './categorization/categorization-service.js';

// LLM integration
export { LLMService } from './llm/llm-service.js';

// Event enrichment
export { EnrichmentPipeline } from './enrichment/enrichment-pipeline.js';

// Vibe classification
export { VibeClassifier, vibeClassifier } from './vibe/vibe-classifier.js';
export type { EventInput, ClassifiedVibe } from './vibe/vibe-classifier.js';
