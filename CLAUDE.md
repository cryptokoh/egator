# AIeGator - Claude Code Context

## Project Overview

AIeGator is an AI-powered event data aggregation platform that collects events from multiple sources (Eventbrite, Ticketmaster, Meetup, Yelp, etc.), deduplicates them using AI, and provides semantic search.

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **API**: Fastify with OpenAPI/Swagger
- **Database**: PostgreSQL + pgvector (Drizzle ORM)
- **Queue**: BullMQ + Redis
- **AI/ML**: sentence-transformers (all-mpnet-base-v2), Claude API
- **Build**: Turborepo monorepo

## Project Structure

```
apps/
  api/          # REST API (Fastify) - port 3000
  collector/    # Background worker for event collection

packages/
  adapters/     # Platform API adapters (Eventbrite, Ticketmaster, etc.)
  ai/           # AI pipeline (embeddings, deduplication, categorization)
  database/     # Drizzle schema + migrations
  shared/       # Shared types
```

## Key Commands

```bash
npm run dev              # Start all services in dev mode
npm run api:dev          # Start API only
npm run collector:dev    # Start collector only

npm run db:migrate       # Run database migrations
npm run db:seed          # Seed initial data
npm run db:studio        # Open Drizzle Studio

docker-compose up -d     # Start infrastructure (postgres, redis)
```

## Important Files

- `apps/api/src/routes/events.ts` - Event API endpoints
- `apps/api/src/routes/search.ts` - Search API endpoints
- `apps/collector/src/index.ts` - Worker entry point
- `packages/adapters/src/base-adapter.ts` - Base class for all adapters
- `packages/ai/src/deduplication/deduplication-service.ts` - Dedup logic
- `packages/database/src/schema/events.ts` - Main events table

## API Endpoints

- `GET /api/v1/events` - List events with filters
- `GET /api/v1/events/:id` - Get single event
- `GET /api/v1/search?q=` - Semantic search
- `GET /health` - Health check
- `GET /docs` - Swagger UI

## Database Schema

Main tables:
- `events` - Aggregated events with embeddings
- `sources` - Event source configurations
- `duplicate_clusters` - Deduplication results
- `fetch_logs` - Collection job logs
