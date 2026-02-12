import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { LumaAdapter } from '@aiegator/adapters';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { events } from '@aiegator/database';

const fastify = Fastify({ logger: true });

// Initialize Luma adapter with ETHDenver calendar IDs
const calendarIds = (process.env.LUMA_CALENDAR_IDS || '').split(',').filter(Boolean);
const luma = new LumaAdapter({
  calendarApiId: calendarIds,
});

// Transform Luma normalized event to our API format
function transformLumaEvent(normalized: any): any {
  const startDate = normalized.startDate instanceof Date && !isNaN(normalized.startDate.getTime())
    ? normalized.startDate
    : new Date();
  const endDate = normalized.endDate instanceof Date && !isNaN(normalized.endDate.getTime())
    ? normalized.endDate
    : null;

  return {
    id: `luma-${normalized.sourceId}`,
    title: normalized.name,
    description: normalized.description,
    startTime: startDate.toISOString(),
    endTime: endDate?.toISOString(),
    venue: normalized.venue,
    imageUrl: normalized.imageUrl,
    url: normalized.url,
    ticketUrl: normalized.ticketUrl,
    price: normalized.priceMin ? {
      min: normalized.priceMin,
      max: normalized.priceMax,
      currency: normalized.currency || 'USD',
    } : normalized.isFree ? { min: 0, max: 0, currency: 'USD' } : null,
    organizer: normalized.organizer,
    attendeeCount: normalized.attendeeCount,
    tags: normalized.tags || [],
    isOnline: normalized.isOnline,
    onlineUrl: normalized.onlineUrl,
    source: 'luma',
  };
}

// Fetch and transform Luma events
async function fetchLumaEvents(limit = 50) {
  if (!luma.isConfigured()) {
    console.log('[server] Luma not configured, no calendar IDs set');
    return [];
  }

  try {
    const result = await luma.fetch({ limit });

    return result.events.map(raw => {
      const normalized = luma.normalize(raw);
      return transformLumaEvent(normalized);
    });
  } catch (error) {
    console.error('[server] Luma fetch failed:', error);
    return [];
  }
}

// Cache for Luma events (refresh every 5 min)
let lumaCache: { events: any[], time: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedLumaEvents() {
  if (!lumaCache || Date.now() - lumaCache.time > CACHE_TTL) {
    const events = await fetchLumaEvents();
    lumaCache = { events, time: Date.now() };
    console.log(`[server] Refreshed Luma cache: ${events.length} events`);
    return events;
  }
  return lumaCache.events;
}

async function main() {
  await fastify.register(cors, { origin: true });

  // Serve static files (web interface)
  await fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '../public'),
    prefix: '/',
  });

  // API info endpoint
  fastify.get('/api', async () => ({
    name: 'AIeGator API',
    version: '2.0.0',
    description: 'AI-powered event discovery - ETHDenver via Luma',
    endpoints: {
      health: 'GET /health',
      discover: 'POST /api/v1/discover',
      tonight: 'GET /api/v1/discover/tonight',
      weekend: 'GET /api/v1/discover/weekend',
      luma: 'GET /api/v1/discover/luma',
      neighborhoods: 'GET /api/v1/neighborhoods',
    },
    sources: ['luma'],
    calendars: calendarIds.length,
  }));

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    luma: luma.isConfigured(),
    calendars: calendarIds.length,
    timestamp: new Date().toISOString()
  }));

  // Main discovery endpoint
  fastify.post('/api/v1/discover', async (request) => {
    const body = request.body as any;
    let events = await getCachedLumaEvents();

    // Filter by keyword search
    if (body.query) {
      const q = body.query.toLowerCase();
      events = events.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.venue?.name?.toLowerCase().includes(q)
      );
    }

    // Limit
    const limit = body.limit || 50;
    events = events.slice(0, limit);

    return { events, sources: ['luma'], count: events.length };
  });

  // Tonight
  fastify.get('/api/v1/discover/tonight', async () => {
    const allEvents = await getCachedLumaEvents();
    const today = new Date();
    const tonight = allEvents.filter((e: any) => {
      const eventDate = new Date(e.startTime);
      return eventDate.toDateString() === today.toDateString();
    });
    return { events: tonight, count: tonight.length };
  });

  // This weekend
  fastify.get('/api/v1/discover/weekend', async () => {
    const allEvents = await getCachedLumaEvents();
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Find next Friday (or today if it's already Fri-Sun)
    const friday = new Date(now);
    const daysToFri = dayOfWeek <= 5 ? 5 - dayOfWeek : 0;
    friday.setDate(friday.getDate() + daysToFri);
    friday.setHours(0, 0, 0, 0);

    const monday = new Date(friday);
    monday.setDate(monday.getDate() + 3);

    const weekend = allEvents.filter((e: any) => {
      const eventDate = new Date(e.startTime);
      return eventDate >= friday && eventDate < monday;
    });
    return { events: weekend, count: weekend.length };
  });

  // Luma-specific endpoint (all events)
  fastify.get('/api/v1/discover/luma', async (request) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50');
    const allEvents = await getCachedLumaEvents();
    return { events: allEvents.slice(0, limit), source: 'luma', count: Math.min(allEvents.length, limit) };
  });

  // Nearby (same as all for now since these are ETHDenver events in Denver)
  fastify.get('/api/v1/discover/nearby', async () => {
    const events = await getCachedLumaEvents();
    return { events, count: events.length };
  });

  // Neighborhoods (Denver-centric for ETHDenver)
  const NEIGHBORHOODS = [
    { id: 'rino', name: 'RiNo (River North Art District)', slug: 'rino', city: 'Denver', country: 'USA' },
    { id: 'lodo', name: 'LoDo (Lower Downtown)', slug: 'lodo', city: 'Denver', country: 'USA' },
    { id: 'capitol-hill', name: 'Capitol Hill', slug: 'capitol-hill', city: 'Denver', country: 'USA' },
    { id: 'downtown', name: 'Downtown Denver', slug: 'downtown', city: 'Denver', country: 'USA' },
    { id: 'speer', name: 'Speer / National Western', slug: 'speer', city: 'Denver', country: 'USA' },
  ];

  fastify.get('/api/v1/neighborhoods', async () => ({ neighborhoods: NEIGHBORHOODS }));
  fastify.get('/api/v1/neighborhoods/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { neighborhood: NEIGHBORHOODS.find(n => n.id === id) };
  });

  // --- Database-backed event endpoints (used by OpenClaw plugin) ---

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aiegator',
    max: 10,
  });
  const database = drizzle(dbPool);

  // GET /api/v1/events - List events with filters
  fastify.get('/api/v1/events', async (request) => {
    const q = request.query as {
      date?: string;
      category?: string;
      city?: string;
      source?: string;
      limit?: string;
      offset?: string;
    };

    const conditions = [eq(events.isDuplicate, false)];

    if (q.date) {
      const day = new Date(q.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      conditions.push(gte(events.startDate, day));
      conditions.push(lte(events.startDate, next));
    }

    if (q.city) {
      conditions.push(ilike(events.venueCity, `%${q.city}%`));
    }

    if (q.source) {
      conditions.push(eq(events.source, q.source));
    }

    const limit = Math.min(parseInt(q.limit || '50'), 200);
    const offset = parseInt(q.offset || '0');

    const rows = await database
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(asc(events.startDate))
      .limit(limit)
      .offset(offset);

    const [countResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(...conditions));

    return {
      events: rows,
      total: countResult?.count ?? 0,
      limit,
      offset,
    };
  });

  // GET /api/v1/events/:id - Single event
  fastify.get('/api/v1/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [event] = await database.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) {
      return reply.code(404).send({ error: 'Event not found' });
    }
    return { event };
  });

  // GET /api/v1/search - Text search across events
  fastify.get('/api/v1/search', async (request) => {
    const { q, limit: limitStr } = request.query as { q?: string; limit?: string };
    if (!q) return { events: [], total: 0 };

    const limit = Math.min(parseInt(limitStr || '20'), 100);
    const pattern = `%${q}%`;

    const rows = await database
      .select()
      .from(events)
      .where(and(
        eq(events.isDuplicate, false),
        or(
          ilike(events.name, pattern),
          ilike(events.description, pattern),
          ilike(events.venueName, pattern),
          ilike(events.organizerName, pattern),
        ),
      ))
      .orderBy(asc(events.startDate))
      .limit(limit);

    return { events: rows, total: rows.length };
  });

  // Start
  const port = parseInt(process.env.PORT || '3000', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`AIeGator API running at http://localhost:${port}`);
  console.log(`   Luma: ${luma.isConfigured() ? 'Connected (' + calendarIds.length + ' calendars)' : 'Not configured'}`);
}

main();
