# 🐊 AIeGator

AI-powered event data aggregator that collects, deduplicates, and enriches events from multiple sources.

## Features

- **Multi-Source Aggregation**: Collects events from Eventbrite, Ticketmaster, Meetup, Yelp, AllEvents.in, Bandsintown, and schema.org structured data
- **AI-Powered Deduplication**: Uses sentence embeddings + DBSCAN clustering + LLM verification to identify duplicate events across platforms
- **Smart Categorization**: Automatically categorizes events using semantic embeddings
- **Semantic Search**: Natural language search using vector similarity
- **Rate-Limited Collection**: Respectful API usage with configurable rate limits
- **Real-Time Processing**: BullMQ-based job queue for collection, enrichment, and deduplication

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AIeGator                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  Eventbrite │     │ Ticketmaster│     │   Meetup    │      │
│   │   Adapter   │     │   Adapter   │     │   Adapter   │      │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              ▼                                  │
│                    ┌─────────────────┐                         │
│                    │   Collector     │◄── BullMQ Jobs          │
│                    │    Worker       │                         │
│                    └────────┬────────┘                         │
│                             ▼                                  │
│                    ┌─────────────────┐                         │
│                    │  AI Enrichment  │                         │
│                    │  - Embeddings   │                         │
│                    │  - Categories   │                         │
│                    │  - Deduplication│                         │
│                    └────────┬────────┘                         │
│                             ▼                                  │
│   ┌─────────────────────────────────────────────────────┐     │
│   │           PostgreSQL + pgvector                     │     │
│   │  ┌─────────┐  ┌──────────┐  ┌───────────────┐      │     │
│   │  │ Events  │  │ Sources  │  │ Dup Clusters  │      │     │
│   │  └─────────┘  └──────────┘  └───────────────┘      │     │
│   └─────────────────────────────────────────────────────┘     │
│                             ▲                                  │
│                             │                                  │
│                    ┌────────┴────────┐                         │
│                    │   REST API      │                         │
│                    │  - Events       │                         │
│                    │  - Search       │                         │
│                    │  - Categories   │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
aiegator/
├── apps/
│   ├── api/              # REST API server (Fastify)
│   └── collector/        # Event collection worker (BullMQ)
├── packages/
│   ├── adapters/         # Platform-specific adapters
│   ├── ai/               # AI/ML pipeline (embeddings, dedup, categorization)
│   ├── database/         # Drizzle ORM schema + migrations
│   └── shared/           # Shared types and utilities
├── docker-compose.yml    # Local development setup
└── turbo.json           # Turborepo configuration
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- API keys for event platforms (optional)

### 1. Clone and Install

```bash
cd AIeGator
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### 4. Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start Development

```bash
# Terminal 1: API server
npm run api:dev

# Terminal 2: Collector worker
npm run collector:dev
```

### 6. Access Services

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs

## API Endpoints

### Events

```
GET /api/v1/events              # List events with filters
GET /api/v1/events/:id          # Get single event
GET /api/v1/events/:id/similar  # Get similar events
GET /api/v1/events/categories   # List categories
GET /api/v1/events/sources      # List sources
```

### Search

```
GET /api/v1/search              # Semantic or keyword search
GET /api/v1/search/suggestions  # Autocomplete suggestions
```

### Query Parameters

| Parameter   | Description                        | Example                    |
|-------------|------------------------------------|-----------------------------|
| `city`      | Filter by city                     | `San Francisco`            |
| `lat`, `lng`| Coordinates for location search    | `37.7749`, `-122.4194`     |
| `radius`    | Search radius in miles             | `25`                       |
| `category`  | Filter by category                 | `music`                    |
| `startDate` | Events starting after              | `2025-01-01T00:00:00Z`     |
| `endDate`   | Events ending before               | `2025-12-31T23:59:59Z`     |
| `source`    | Filter by source                   | `eventbrite`               |
| `q`         | Search query (semantic)            | `outdoor activities`       |
| `page`      | Page number                        | `1`                        |
| `limit`     | Results per page                   | `20`                       |

## Supported Sources

| Source       | API Type   | Requires     | Status      |
|--------------|------------|--------------|-------------|
| Eventbrite   | REST/OAuth | API Key      | ✅ Supported |
| Ticketmaster | REST       | API Key      | ✅ Supported |
| Meetup       | GraphQL    | Pro Account  | ✅ Supported |
| Yelp Events  | REST       | API Key      | ✅ Supported |
| AllEvents.in | REST       | API Key      | ✅ Supported |
| Bandsintown  | REST       | App ID       | ✅ Supported |
| Schema.org   | Crawler    | None         | ✅ Supported |

## AI Features

### Deduplication Pipeline

1. **Embedding Generation**: sentence-transformers (all-mpnet-base-v2)
2. **Blocking**: Group events by city + date
3. **Clustering**: DBSCAN on embeddings
4. **LLM Verification**: Claude validates uncertain clusters

### Categorization

14 categories: music, tech, sports, arts, food, networking, wellness, education, community, outdoor, nightlife, family, business, charity

### Semantic Search

Natural language queries like "outdoor activities this weekend" converted to embeddings for similarity search.

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aiegator

# Redis
REDIS_URL=redis://localhost:6379

# API Keys
EVENTBRITE_API_KEY=
TICKETMASTER_API_KEY=
MEETUP_CLIENT_ID=
MEETUP_CLIENT_SECRET=
YELP_API_KEY=
ALLEVENTS_API_KEY=
BANDSINTOWN_APP_ID=

# AI
ANTHROPIC_API_KEY=

# Settings
DEFAULT_CITY=San Francisco
COLLECTOR_INTERVAL_MS=300000
```

## Development

### Commands

```bash
npm run dev           # Start all services
npm run build         # Build all packages
npm run test          # Run tests
npm run lint          # Lint code
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio
```

### Adding a New Adapter

1. Create adapter in `packages/adapters/src/<source>/index.ts`
2. Extend `BaseAdapter` class
3. Implement `fetch()` and `normalize()` methods
4. Register in `packages/adapters/src/registry.ts`
5. Add to collector configuration

## Deployment

### Docker

```bash
docker-compose up -d
```

### Manual

```bash
npm run build
npm run db:migrate
node apps/api/dist/index.js
node apps/collector/dist/index.js
```

## License

MIT
