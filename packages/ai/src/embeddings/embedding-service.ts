import { pipeline } from '@xenova/transformers';

/**
 * Service for generating text embeddings using sentence-transformers
 * Uses all-mpnet-base-v2 model (768 dimensions) by default
 */
export class EmbeddingService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  private readonly modelName: string;
  private initPromise: Promise<void> | null = null;

  constructor(modelName: string = 'Xenova/all-mpnet-base-v2') {
    this.modelName = modelName;
  }

  /**
   * Initialize the embedding model
   * Called automatically on first use, but can be called explicitly for eager loading
   */
  async initialize(): Promise<void> {
    if (this.model) return;

    if (!this.initPromise) {
      this.initPromise = this.loadModel();
    }

    await this.initPromise;
  }

  private async loadModel(): Promise<void> {
    console.log(`[EmbeddingService] Loading model: ${this.modelName}`);
    const startTime = Date.now();

    this.model = await pipeline('feature-extraction', this.modelName, {
      quantized: true, // Use quantized model for faster inference
    });

    console.log(`[EmbeddingService] Model loaded in ${Date.now() - startTime}ms`);
  }

  /**
   * Generate embeddings for a single text
   */
  async embed(text: string): Promise<number[]> {
    await this.initialize();

    const result = await this.model!(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the embedding array from the result
    return Array.from(result.data);
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initialize();

    const embeddings: number[][] = [];

    // Process in batches to avoid memory issues
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );
      embeddings.push(...batchResults);
    }

    return embeddings;
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find the most similar embeddings to a query
   */
  findSimilar(
    queryEmbedding: number[],
    candidates: { id: string; embedding: number[] }[],
    topK: number = 10,
    threshold: number = 0.5
  ): { id: string; similarity: number }[] {
    const similarities = candidates.map(candidate => ({
      id: candidate.id,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
    }));

    return similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Create a canonical representation of an event for embedding
   */
  createEventText(event: {
    name: string;
    venue?: string | null;
    city?: string | null;
    date: Date;
    description?: string | null;
  }): string {
    const parts = [
      event.name,
      event.venue,
      event.city,
      event.date.toISOString().split('T')[0],
    ].filter(Boolean);

    // Optionally include truncated description for richer embeddings
    if (event.description) {
      const truncatedDesc = event.description.slice(0, 500);
      parts.push(truncatedDesc);
    }

    return parts.join(' | ');
  }
}
