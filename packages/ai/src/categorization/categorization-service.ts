import { EmbeddingService } from '../embeddings/embedding-service.js';

/**
 * Event category taxonomy
 */
export const CATEGORY_TAXONOMY = {
  music: {
    keywords: ['concert', 'live music', 'festival', 'DJ', 'band', 'orchestra', 'symphony', 'jazz', 'rock', 'hip hop', 'electronic'],
    description: 'Live music performances, concerts, and music festivals',
  },
  tech: {
    keywords: ['hackathon', 'tech meetup', 'coding', 'programming', 'startup', 'AI', 'machine learning', 'developer', 'software', 'data science'],
    description: 'Technology events, hackathons, and developer meetups',
  },
  sports: {
    keywords: ['game', 'match', 'tournament', 'race', 'marathon', 'basketball', 'football', 'soccer', 'baseball', 'hockey'],
    description: 'Sports games, tournaments, and athletic events',
  },
  arts: {
    keywords: ['exhibition', 'gallery', 'museum', 'theater', 'performance', 'dance', 'ballet', 'opera', 'art show', 'painting'],
    description: 'Art exhibitions, theater performances, and cultural events',
  },
  food: {
    keywords: ['food festival', 'tasting', 'cooking class', 'wine', 'beer', 'culinary', 'restaurant', 'chef', 'brunch'],
    description: 'Food festivals, tastings, and culinary experiences',
  },
  networking: {
    keywords: ['networking', 'mixer', 'happy hour', 'business meetup', 'professional', 'entrepreneur', 'career'],
    description: 'Professional networking and business events',
  },
  wellness: {
    keywords: ['yoga', 'meditation', 'fitness', 'wellness', 'health', 'mindfulness', 'spa', 'retreat', 'workout'],
    description: 'Health, wellness, and fitness activities',
  },
  education: {
    keywords: ['workshop', 'seminar', 'lecture', 'class', 'training', 'learning', 'course', 'webinar', 'conference'],
    description: 'Educational workshops, seminars, and learning events',
  },
  community: {
    keywords: ['community', 'volunteer', 'charity', 'fundraiser', 'social', 'meetup', 'group', 'club'],
    description: 'Community gatherings and social events',
  },
  outdoor: {
    keywords: ['hiking', 'camping', 'outdoor', 'nature', 'park', 'beach', 'adventure', 'trail', 'garden'],
    description: 'Outdoor activities and nature events',
  },
  nightlife: {
    keywords: ['club', 'party', 'nightlife', 'bar', 'lounge', 'dancing', 'nightclub', 'rave'],
    description: 'Nightlife, clubs, and party events',
  },
  family: {
    keywords: ['kids', 'family', 'children', 'family-friendly', 'parenting', 'playground', 'carnival'],
    description: 'Family-friendly activities and kids events',
  },
  business: {
    keywords: ['conference', 'summit', 'expo', 'trade show', 'business', 'industry', 'corporate'],
    description: 'Business conferences and industry events',
  },
  charity: {
    keywords: ['charity', 'fundraiser', 'nonprofit', 'benefit', 'donation', 'cause', 'awareness'],
    description: 'Charity events and fundraisers',
  },
} as const;

export type Category = keyof typeof CATEGORY_TAXONOMY;

/**
 * Service for categorizing events using embeddings
 */
export class CategorizationService {
  private readonly embeddingService: EmbeddingService;
  private categoryEmbeddings: Map<Category, number[]> | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Initialize category embeddings
   */
  async initialize(): Promise<void> {
    if (this.categoryEmbeddings) return;

    if (!this.initPromise) {
      this.initPromise = this.loadCategoryEmbeddings();
    }

    await this.initPromise;
  }

  private async loadCategoryEmbeddings(): Promise<void> {
    console.log('[CategorizationService] Loading category embeddings...');

    this.categoryEmbeddings = new Map();

    for (const [category, data] of Object.entries(CATEGORY_TAXONOMY)) {
      // Create a rich text representation of the category
      const text = `${data.description}. Keywords: ${data.keywords.join(', ')}`;
      const embedding = await this.embeddingService.embed(text);
      this.categoryEmbeddings.set(category as Category, embedding);
    }

    console.log('[CategorizationService] Category embeddings loaded');
  }

  /**
   * Categorize an event based on its content
   * Returns categories sorted by confidence
   */
  async categorize(event: {
    name: string;
    description?: string | null;
    tags?: string[];
  }): Promise<{ category: Category; confidence: number }[]> {
    await this.initialize();

    // Create event text for embedding
    const eventText = [
      event.name,
      event.description ?? '',
      ...(event.tags ?? []),
    ].join(' ');

    const eventEmbedding = await this.embeddingService.embed(eventText);

    // Calculate similarity to each category
    const scores: { category: Category; confidence: number }[] = [];

    for (const [category, categoryEmbedding] of this.categoryEmbeddings!) {
      const similarity = this.embeddingService.cosineSimilarity(eventEmbedding, categoryEmbedding);
      scores.push({ category, confidence: similarity });
    }

    // Sort by confidence
    scores.sort((a, b) => b.confidence - a.confidence);

    return scores;
  }

  /**
   * Get the primary category for an event
   */
  async getPrimaryCategory(event: {
    name: string;
    description?: string | null;
    tags?: string[];
  }): Promise<{ category: Category; confidence: number }> {
    const categories = await this.categorize(event);
    return categories[0];
  }

  /**
   * Get multiple categories that apply to an event (above threshold)
   */
  async getCategories(
    event: {
      name: string;
      description?: string | null;
      tags?: string[];
    },
    threshold: number = 0.3,
    maxCategories: number = 3
  ): Promise<{ category: Category; confidence: number }[]> {
    const categories = await this.categorize(event);
    return categories
      .filter(c => c.confidence >= threshold)
      .slice(0, maxCategories);
  }

  /**
   * Quick keyword-based categorization (no embeddings)
   * Useful for fallback or when embeddings aren't available
   */
  categorizeByKeywords(text: string): Category[] {
    const lowerText = text.toLowerCase();
    const matches: { category: Category; count: number }[] = [];

    for (const [category, data] of Object.entries(CATEGORY_TAXONOMY)) {
      let count = 0;
      for (const keyword of data.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          count++;
        }
      }
      if (count > 0) {
        matches.push({ category: category as Category, count });
      }
    }

    // Sort by match count
    matches.sort((a, b) => b.count - a.count);

    return matches.map(m => m.category);
  }
}
