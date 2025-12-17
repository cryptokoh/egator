import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SearchService } from '../services/search-service.js';

const searchQuerySchema = z.object({
  q: z.string().min(1),
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().default(25),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  semantic: z.coerce.boolean().default(true),
});

export async function searchRoutes(app: FastifyInstance) {
  const searchService = new SearchService();

  // GET /api/v1/search - Semantic search for events
  app.get('/', {
    schema: {
      description: 'Search events using natural language (semantic search)',
      tags: ['search'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query (e.g., "outdoor activities this weekend")' },
          city: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          radius: { type: 'number', default: 25 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          semantic: { type: 'boolean', default: true, description: 'Use semantic (AI) search' }
        },
        required: ['q']
      }
    }
  }, async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);

    const results = query.semantic
      ? await searchService.semanticSearch(query)
      : await searchService.keywordSearch(query);

    return results;
  });

  // GET /api/v1/search/suggestions - Get search suggestions
  app.get('/suggestions', {
    schema: {
      description: 'Get search autocomplete suggestions',
      tags: ['search'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2 },
          limit: { type: 'number', default: 10 }
        },
        required: ['q']
      }
    }
  }, async (request) => {
    const { q, limit } = z.object({
      q: z.string().min(2),
      limit: z.coerce.number().default(10)
    }).parse(request.query);

    return searchService.getSuggestions(q, limit);
  });
}
