import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    };
  });

  app.get('/ready', {
    schema: {
      description: 'Readiness check endpoint',
      tags: ['health']
    }
  }, async (request, reply) => {
    // TODO: Check database and redis connections
    const checks = {
      database: true,
      redis: true,
      collectors: true
    };

    const allHealthy = Object.values(checks).every(Boolean);

    if (!allHealthy) {
      return reply.status(503).send({
        status: 'unhealthy',
        checks
      });
    }

    return {
      status: 'ready',
      checks
    };
  });
}
