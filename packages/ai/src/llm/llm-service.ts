import Anthropic from '@anthropic-ai/sdk';
import type { DeduplicationEvent } from '../deduplication/types.js';

interface VerificationResult {
  areDuplicates: boolean;
  confidence: number;
  reasoning: string;
}

interface SummarizationResult {
  summary: string;
  highlights: string[];
}

/**
 * Service for LLM-powered operations using Claude
 */
export class LLMService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey?: string, model: string = 'claude-3-haiku-20240307') {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
  }

  /**
   * Verify if a set of events are duplicates
   */
  async verifyDuplicates(events: DeduplicationEvent[]): Promise<VerificationResult> {
    const eventDescriptions = events.map((e, i) => `
Event ${i + 1}:
- Name: ${e.name}
- Venue: ${e.venue ?? 'Unknown'}
- City: ${e.city ?? 'Unknown'}
- Date: ${e.date.toISOString()}
- Source: ${e.source}
- Description: ${e.description?.slice(0, 200) ?? 'N/A'}
`).join('\n');

    const prompt = `You are an expert at identifying duplicate event listings. Analyze the following events and determine if they are the same event listed on different platforms.

${eventDescriptions}

Consider:
1. Are the event names similar or the same?
2. Is it at the same venue and location?
3. Is it on the same date/time?
4. Do the descriptions suggest the same event?

Respond in JSON format:
{
  "areDuplicates": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from LLM');
    }

    try {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        areDuplicates: result.areDuplicates ?? false,
        confidence: result.confidence ?? 0.5,
        reasoning: result.reasoning ?? 'No reasoning provided',
      };
    } catch (error) {
      console.error('[LLMService] Failed to parse verification response:', content.text);
      throw error;
    }
  }

  /**
   * Generate a summary for an event
   */
  async summarizeEvent(event: {
    name: string;
    description: string;
    venue?: string | null;
    date: Date;
  }): Promise<SummarizationResult> {
    const prompt = `Summarize this event in 2-3 sentences. Also extract 3-5 key highlights.

Event: ${event.name}
Venue: ${event.venue ?? 'TBA'}
Date: ${event.date.toLocaleDateString()}
Description: ${event.description}

Respond in JSON format:
{
  "summary": "Brief summary...",
  "highlights": ["highlight 1", "highlight 2", ...]
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from LLM');
    }

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        summary: result.summary ?? '',
        highlights: result.highlights ?? [],
      };
    } catch (error) {
      console.error('[LLMService] Failed to parse summary response:', content.text);
      throw error;
    }
  }

  /**
   * Infer categories for an event
   */
  async inferCategories(event: {
    name: string;
    description?: string | null;
  }): Promise<string[]> {
    const categories = [
      'music', 'tech', 'sports', 'arts', 'food', 'networking',
      'wellness', 'education', 'community', 'outdoor', 'nightlife',
      'family', 'business', 'charity'
    ];

    const prompt = `Categorize this event into 1-3 of the following categories:
${categories.join(', ')}

Event: ${event.name}
Description: ${event.description ?? 'N/A'}

Respond with a JSON array of category names:
["category1", "category2"]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from LLM');
    }

    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('[LLMService] Failed to parse categories response:', content.text);
      return [];
    }
  }

  /**
   * Generate a natural language search query expansion
   */
  async expandSearchQuery(query: string): Promise<string[]> {
    const prompt = `Expand this event search query into related search terms.
Keep the expansions relevant and concise.

Query: "${query}"

Respond with a JSON array of 3-5 related search terms:
["term1", "term2", "term3"]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return [query];
    }

    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [query];
      }

      const result = JSON.parse(jsonMatch[0]);
      return Array.isArray(result) ? [query, ...result] : [query];
    } catch {
      return [query];
    }
  }
}
