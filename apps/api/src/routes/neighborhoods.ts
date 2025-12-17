import { FastifyInstance } from 'fastify';
import { neighborhoodService } from '../services/neighborhood-service.js';

/**
 * Neighborhood API routes
 * Hyper-local discovery endpoints
 */
export async function neighborhoodRoutes(fastify: FastifyInstance) {
  /**
   * Get neighborhoods by city
   */
  fastify.get<{
    Querystring: { city: string };
  }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['city'],
          properties: {
            city: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              neighborhoods: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { city } = request.query;
      const neighborhoods = await neighborhoodService.getNeighborhoodsByCity(city);
      return { neighborhoods };
    }
  );

  /**
   * Get single neighborhood by ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const neighborhood = await neighborhoodService.getNeighborhoodById(
        request.params.id
      );

      if (!neighborhood) {
        return reply.status(404).send({ error: 'Neighborhood not found' });
      }

      return { neighborhood };
    }
  );

  /**
   * Get neighborhood statistics
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/stats',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const stats = await neighborhoodService.getNeighborhoodStats(request.params.id);

      if (!stats) {
        return reply.status(404).send({ error: 'Neighborhood not found' });
      }

      return { stats };
    }
  );

  /**
   * Find neighborhoods near a point
   */
  fastify.get<{
    Querystring: {
      lat: number;
      lng: number;
      radius?: number;
    };
  }>(
    '/nearby',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            radius: { type: 'number', default: 5 },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, radius } = request.query;
      const neighborhoods = await neighborhoodService.findNeighborhoodsNearPoint(
        lat,
        lng,
        radius ?? 5
      );
      return { neighborhoods };
    }
  );

  /**
   * Find which neighborhood contains a point
   */
  fastify.get<{
    Querystring: {
      lat: number;
      lng: number;
    };
  }>(
    '/locate',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng } = request.query;
      const neighborhood = await neighborhoodService.findNeighborhoodContainingPoint(
        lat,
        lng
      );

      if (!neighborhood) {
        return { neighborhood: null, message: 'Location not in a known neighborhood' };
      }

      return { neighborhood };
    }
  );

  /**
   * Get user's saved neighborhoods (requires auth)
   */
  fastify.get<{
    Headers: { 'x-user-id': string };
  }>(
    '/user/saved',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-user-id'],
          properties: {
            'x-user-id': { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id'];
      const neighborhoods = await neighborhoodService.getUserNeighborhoods(userId);
      return { neighborhoods };
    }
  );

  /**
   * Save a neighborhood for user
   */
  fastify.post<{
    Headers: { 'x-user-id': string };
    Body: {
      neighborhoodId: string;
      type: 'home' | 'work' | 'favorite' | 'frequent';
      walkingRadiusMinutes?: 5 | 10 | 15 | 20 | 30;
      notificationsEnabled?: boolean;
      customName?: string;
    };
  }>(
    '/user/saved',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-user-id'],
          properties: {
            'x-user-id': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['neighborhoodId', 'type'],
          properties: {
            neighborhoodId: { type: 'string' },
            type: { type: 'string', enum: ['home', 'work', 'favorite', 'frequent'] },
            walkingRadiusMinutes: { type: 'number', enum: [5, 10, 15, 20, 30] },
            notificationsEnabled: { type: 'boolean' },
            customName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id'];
      const { neighborhoodId, type, ...options } = request.body;

      await neighborhoodService.saveUserNeighborhood(userId, neighborhoodId, type, options);

      return { success: true };
    }
  );

  /**
   * Remove a saved neighborhood
   */
  fastify.delete<{
    Headers: { 'x-user-id': string };
    Params: { neighborhoodId: string };
  }>(
    '/user/saved/:neighborhoodId',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-user-id'],
          properties: {
            'x-user-id': { type: 'string' },
          },
        },
        params: {
          type: 'object',
          required: ['neighborhoodId'],
          properties: {
            neighborhoodId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id'];
      await neighborhoodService.removeUserNeighborhood(userId, request.params.neighborhoodId);
      return { success: true };
    }
  );

  /**
   * Seed SF neighborhoods (dev only)
   */
  if (process.env.NODE_ENV === 'development') {
    fastify.post('/seed/sf', async (request, reply) => {
      await neighborhoodService.seedSFNeighborhoods();
      return { success: true, message: 'SF neighborhoods seeded' };
    });
  }
}
