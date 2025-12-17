import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { eventsRoutes } from './routes/events.js';
import { searchRoutes } from './routes/search.js';
import { healthRoutes } from './routes/health.js';
import { neighborhoodRoutes } from './routes/neighborhoods.js';
import { discoverRoutes } from './routes/discover.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config.js';

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
});

async function start() {
  // Register plugins
  await app.register(cors, { origin: true });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'AIeGator API',
        description: 'AI-powered event aggregation API',
        version: '0.1.0'
      },
      servers: [{ url: config.apiBaseUrl }]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(eventsRoutes, { prefix: '/api/v1/events' });
  await app.register(searchRoutes, { prefix: '/api/v1/search' });
  await app.register(neighborhoodRoutes, { prefix: '/api/v1/neighborhoods' });
  await app.register(discoverRoutes, { prefix: '/api/v1/discover' });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server running at http://localhost:${config.port}`);
    app.log.info(`API docs at http://localhost:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
