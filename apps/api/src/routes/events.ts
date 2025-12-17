import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventService } from '../services/event-service.js';

const querySchema = z.object({
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().default(25),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  source: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function eventsRoutes(app: FastifyInstance) {
  const eventService = new EventService();

  // GET /api/v1/events - List events with filters
  app.get('/', {
    schema: {
      description: 'Get events with optional filters',
      tags: ['events'],
      querystring: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          radius: { type: 'number', default: 25 },
          category: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          source: { type: 'string' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
        }
      }
    }
  }, async (request, reply) => {
    const query = querySchema.parse(request.query);
    const events = await eventService.findEvents(query);
    return events;
  });

  // GET /api/v1/events/:id - Get single event
  app.get('/:id', {
    schema: {
      description: 'Get a single event by ID',
      tags: ['events'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const event = await eventService.findById(id);

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    return event;
  });

  // GET /api/v1/events/:id/similar - Get similar events
  app.get('/:id/similar', {
    schema: {
      description: 'Get events similar to the specified event',
      tags: ['events'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const similarEvents = await eventService.findSimilar(id, 10);
    return similarEvents;
  });

  // GET /api/v1/events/categories - List all categories
  app.get('/categories', {
    schema: {
      description: 'Get all event categories',
      tags: ['events']
    }
  }, async () => {
    return eventService.getCategories();
  });

  // GET /api/v1/events/sources - List all sources
  app.get('/sources', {
    schema: {
      description: 'Get all event sources',
      tags: ['events']
    }
  }, async () => {
    return eventService.getSources();
  });
}
