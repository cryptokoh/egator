import { FastifyInstance } from 'fastify';
import { discoveryService, type DiscoveryFilters } from '../services/discovery-service.js';
import type { Mood, EnergyLevel, SocialDensity, IntimacyLevel, TimeVibe } from '@aiegator/shared';

/**
 * Discovery API routes
 * Mood-based event discovery
 */
export async function discoverRoutes(fastify: FastifyInstance) {
  /**
   * Main discovery endpoint with flexible filters
   */
  fastify.post<{
    Body: {
      moods?: Mood[];
      energyLevel?: EnergyLevel | EnergyLevel[];
      soloFriendly?: boolean;
      socialDensity?: SocialDensity[];
      intimacyLevel?: IntimacyLevel[];
      timeVibe?: TimeVibe[];
      isHolistic?: boolean;
      isDance?: boolean;
      holisticTags?: string[];
      danceTags?: string[];
      location?: {
        neighborhoodId?: string;
        lat?: number;
        lng?: number;
        radiusMeters?: number;
        radiusMiles?: number;
        city?: string;
      };
      startDate?: string;
      endDate?: string;
      tonight?: boolean;
      thisWeekend?: boolean;
      limit?: number;
      offset?: number;
    };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            moods: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['move', 'chill', 'connect', 'learn', 'celebrate', 'create', 'explore'],
              },
            },
            energyLevel: {
              oneOf: [
                { type: 'integer', minimum: 1, maximum: 5 },
                { type: 'array', items: { type: 'integer', minimum: 1, maximum: 5 } },
              ],
            },
            soloFriendly: { type: 'boolean' },
            socialDensity: {
              type: 'array',
              items: { type: 'string', enum: ['solo', 'partner', 'social', 'crowd'] },
            },
            intimacyLevel: {
              type: 'array',
              items: { type: 'string', enum: ['open', 'community', 'intimate', 'sacred'] },
            },
            timeVibe: {
              type: 'array',
              items: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'late-night'] },
            },
            isHolistic: { type: 'boolean' },
            isDance: { type: 'boolean' },
            holisticTags: { type: 'array', items: { type: 'string' } },
            danceTags: { type: 'array', items: { type: 'string' } },
            location: {
              type: 'object',
              properties: {
                neighborhoodId: { type: 'string' },
                lat: { type: 'number' },
                lng: { type: 'number' },
                radiusMeters: { type: 'number' },
                radiusMiles: { type: 'number' },
                city: { type: 'string' },
              },
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            tonight: { type: 'boolean' },
            thisWeekend: { type: 'boolean' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              events: { type: 'array' },
              total: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const filters: DiscoveryFilters = {
        ...request.body,
        startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
        endDate: request.body.endDate ? new Date(request.body.endDate) : undefined,
      };

      const events = await discoveryService.discover(filters);

      return {
        events,
        total: events.length,
        hasMore: events.length === (filters.limit ?? 50),
      };
    }
  );

  /**
   * Quick filter: Tonight
   */
  fastify.get<{
    Querystring: {
      lat?: number;
      lng?: number;
      neighborhoodId?: string;
    };
  }>(
    '/tonight',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            neighborhoodId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, neighborhoodId } = request.query;
      const location = neighborhoodId
        ? { neighborhoodId }
        : lat && lng
          ? { lat, lng }
          : undefined;

      const events = await discoveryService.getTonight(location);
      return { events };
    }
  );

  /**
   * Quick filter: This Weekend
   */
  fastify.get<{
    Querystring: {
      lat?: number;
      lng?: number;
      neighborhoodId?: string;
    };
  }>(
    '/weekend',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            neighborhoodId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, neighborhoodId } = request.query;
      const location = neighborhoodId
        ? { neighborhoodId }
        : lat && lng
          ? { lat, lng }
          : undefined;

      const events = await discoveryService.getThisWeekend(location);
      return { events };
    }
  );

  /**
   * Holistic vertical
   */
  fastify.get<{
    Querystring: {
      tags?: string;
      lat?: number;
      lng?: number;
      neighborhoodId?: string;
      limit?: number;
    };
  }>(
    '/holistic',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tags: { type: 'string', description: 'Comma-separated tags' },
            lat: { type: 'number' },
            lng: { type: 'number' },
            neighborhoodId: { type: 'string' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { tags, lat, lng, neighborhoodId, limit } = request.query;

      const events = await discoveryService.getHolisticEvents({
        holisticTags: tags?.split(',').map((t) => t.trim()),
        location: neighborhoodId
          ? { neighborhoodId }
          : lat && lng
            ? { lat, lng }
            : undefined,
        limit,
      });

      return { events };
    }
  );

  /**
   * Dance vertical
   */
  fastify.get<{
    Querystring: {
      tags?: string;
      lat?: number;
      lng?: number;
      neighborhoodId?: string;
      limit?: number;
    };
  }>(
    '/dance',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            tags: { type: 'string', description: 'Comma-separated tags' },
            lat: { type: 'number' },
            lng: { type: 'number' },
            neighborhoodId: { type: 'string' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { tags, lat, lng, neighborhoodId, limit } = request.query;

      const events = await discoveryService.getDanceEvents({
        danceTags: tags?.split(',').map((t) => t.trim()),
        location: neighborhoodId
          ? { neighborhoodId }
          : lat && lng
            ? { lat, lng }
            : undefined,
        limit,
      });

      return { events };
    }
  );

  /**
   * Discover by mood
   */
  fastify.get<{
    Params: { mood: Mood };
    Querystring: {
      lat?: number;
      lng?: number;
      neighborhoodId?: string;
      limit?: number;
    };
  }>(
    '/mood/:mood',
    {
      schema: {
        params: {
          type: 'object',
          required: ['mood'],
          properties: {
            mood: {
              type: 'string',
              enum: ['move', 'chill', 'connect', 'learn', 'celebrate', 'create', 'explore'],
            },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            neighborhoodId: { type: 'string' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { mood } = request.params;
      const { lat, lng, neighborhoodId, limit } = request.query;

      const events = await discoveryService.getByMood([mood], {
        location: neighborhoodId
          ? { neighborhoodId }
          : lat && lng
            ? { lat, lng }
            : undefined,
        limit,
      });

      return { events };
    }
  );

  /**
   * Nearby events
   */
  fastify.get<{
    Querystring: {
      lat: number;
      lng: number;
      radius?: number;
      limit?: number;
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
            radius: { type: 'number', default: 1600, description: 'Radius in meters' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, radius, limit } = request.query;
      const events = await discoveryService.getNearby(lat, lng, radius, { limit });
      return { events };
    }
  );

  /**
   * Events in a neighborhood
   */
  fastify.get<{
    Params: { neighborhoodId: string };
    Querystring: {
      moods?: string;
      limit?: number;
    };
  }>(
    '/neighborhood/:neighborhoodId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['neighborhoodId'],
          properties: {
            neighborhoodId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            moods: { type: 'string', description: 'Comma-separated moods' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const { neighborhoodId } = request.params;
      const { moods, limit } = request.query;

      const events = await discoveryService.getInNeighborhood(neighborhoodId, {
        moods: moods?.split(',').map((m) => m.trim() as Mood),
        limit,
      });

      return { events };
    }
  );

  /**
   * Personalized "For You" feed (requires auth)
   */
  fastify.get<{
    Headers: { 'x-user-id': string };
    Querystring: {
      moods?: string;
      limit?: number;
    };
  }>(
    '/for-you',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-user-id'],
          properties: {
            'x-user-id': { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            moods: { type: 'string' },
            limit: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id'];
      const { moods, limit } = request.query;

      const events = await discoveryService.getForYou(userId, {
        moods: moods?.split(',').map((m) => m.trim() as Mood),
        limit,
      });

      return { events };
    }
  );
}
