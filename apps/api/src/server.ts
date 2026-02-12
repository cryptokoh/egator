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
import { TicketmasterAdapter } from '@aiegator/adapters';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { events } from '@aiegator/database';

const fastify = Fastify({ logger: true });

// Initialize Ticketmaster adapter
const ticketmaster = new TicketmasterAdapter({
  apiKey: process.env.TICKETMASTER_API_KEY,
});

// Demo holistic/dance events (Ticketmaster doesn't have these)
const HOLISTIC_DANCE_EVENTS = [
  {
    id: 'demo-1',
    title: 'Sunset Yoga in the Park',
    description: 'Join us for a relaxing outdoor yoga session as the sun sets over the city.',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venue: { name: 'Dolores Park', address: 'Dolores Park, San Francisco', lat: 37.7596, lng: -122.4269 },
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    price: { min: 15, max: 25, currency: 'USD' },
    vibe: { moods: ['chill', 'connect'], energyLevel: 2, soloFriendly: true, socialDensity: 'social', intimacyLevel: 'community', timeVibe: 'evening', isHolistic: true, isDance: false, holisticTags: ['yoga', 'meditation'], danceTags: [], confidence: 0.9 },
    neighborhoodId: 'mission', neighborhoodName: 'Mission',
    source: 'demo',
  },
  {
    id: 'demo-2',
    title: 'Ecstatic Dance Journey',
    description: 'A sober, free-form dance experience. No talking on the dance floor.',
    startTime: new Date(Date.now() + 172800000).toISOString(),
    venue: { name: 'Dance Mission Theater', address: '3316 24th St, San Francisco', lat: 37.7523, lng: -122.4181 },
    imageUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800',
    price: { min: 20, max: 35, currency: 'USD' },
    vibe: { moods: ['move', 'explore', 'chill'], energyLevel: 4, soloFriendly: true, socialDensity: 'crowd', intimacyLevel: 'community', timeVibe: 'morning', isHolistic: true, isDance: true, holisticTags: ['ceremony'], danceTags: ['ecstatic-dance'], confidence: 0.94 },
    neighborhoodId: 'mission', neighborhoodName: 'Mission',
    source: 'demo',
  },
  {
    id: 'demo-3',
    title: 'Sound Bath & Meditation',
    description: 'Immerse yourself in healing sounds of crystal bowls and gongs.',
    startTime: new Date(Date.now() + 259200000).toISOString(),
    venue: { name: 'Grace Cathedral', address: '1100 California St, San Francisco', lat: 37.7921, lng: -122.4128 },
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800',
    price: { min: 30, max: 30, currency: 'USD' },
    vibe: { moods: ['chill', 'explore'], energyLevel: 1, soloFriendly: true, socialDensity: 'solo', intimacyLevel: 'sacred', timeVibe: 'evening', isHolistic: true, isDance: false, holisticTags: ['sound-bath', 'meditation', 'healing-circle'], danceTags: [], confidence: 0.92 },
    neighborhoodId: 'nob-hill', neighborhoodName: 'Nob Hill',
    source: 'demo',
  },
  {
    id: 'demo-4',
    title: 'Salsa Social: Beginner Friendly',
    description: 'Learn to dance salsa! Lesson at 8pm, social dancing until midnight.',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venue: { name: 'The Cigar Bar & Grill', address: '850 Montgomery St, San Francisco', lat: 37.7969, lng: -122.4033 },
    imageUrl: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
    price: { min: 15, max: 15, currency: 'USD' },
    vibe: { moods: ['move', 'connect'], energyLevel: 4, soloFriendly: true, socialDensity: 'social', intimacyLevel: 'community', timeVibe: 'evening', isHolistic: false, isDance: true, holisticTags: [], danceTags: ['salsa'], confidence: 0.88 },
    neighborhoodId: 'north-beach', neighborhoodName: 'North Beach',
    source: 'demo',
  },
  {
    id: 'demo-5',
    title: 'Community Breathwork Circle',
    description: 'A guided breathwork session supporting mental health awareness.',
    startTime: new Date(Date.now() + 432000000).toISOString(),
    venue: { name: 'The Center SF', address: '548 Fillmore St, San Francisco', lat: 37.7762, lng: -122.4315 },
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    price: { min: 25, max: 45, currency: 'USD' },
    vibe: { moods: ['chill', 'connect', 'explore'], energyLevel: 2, soloFriendly: true, socialDensity: 'social', intimacyLevel: 'intimate', timeVibe: 'evening', isHolistic: true, isDance: false, holisticTags: ['breathwork', 'healing-circle', 'conscious-community'], danceTags: [], confidence: 0.91 },
    neighborhoodId: 'castro', neighborhoodName: 'Castro',
    source: 'humanitix',
    charityPartner: { name: 'SF Mental Health Foundation' },
  },
  {
    id: 'demo-6',
    title: 'Bachata & Salsa Fundraiser Night',
    description: 'Dance the night away while supporting youth arts programs.',
    startTime: new Date(Date.now() + 518400000).toISOString(),
    venue: { name: 'SOMArts Cultural Center', address: '934 Brannan St, San Francisco', lat: 37.7722, lng: -122.4058 },
    imageUrl: 'https://images.unsplash.com/photo-1545959570-a94084071b5a?w=800',
    price: { min: 30, max: 50, currency: 'USD' },
    vibe: { moods: ['move', 'connect', 'celebrate'], energyLevel: 4, soloFriendly: true, socialDensity: 'social', intimacyLevel: 'community', timeVibe: 'evening', isHolistic: false, isDance: true, holisticTags: [], danceTags: ['bachata', 'salsa'], confidence: 0.89 },
    neighborhoodId: 'soma', neighborhoodName: 'SoMa',
    source: 'humanitix',
    charityPartner: { name: 'Youth Arts SF' },
  },
];

// Transform Ticketmaster event to our format
function transformTicketmasterEvent(normalized: any): any {
  // Handle potentially invalid dates
  const startDate = normalized.startDate instanceof Date && !isNaN(normalized.startDate.getTime())
    ? normalized.startDate
    : new Date();
  const endDate = normalized.endDate instanceof Date && !isNaN(normalized.endDate.getTime())
    ? normalized.endDate
    : null;

  return {
    id: `tm-${normalized.sourceId}`,
    title: normalized.name,
    description: normalized.description,
    startTime: startDate.toISOString(),
    endTime: endDate?.toISOString(),
    venue: normalized.venue,
    imageUrl: normalized.imageUrl,
    url: normalized.url,
    price: normalized.priceMin ? {
      min: normalized.priceMin,
      max: normalized.priceMax,
      currency: normalized.currency || 'USD',
    } : null,
    vibe: {
      moods: inferMoods(normalized),
      energyLevel: 3,
      soloFriendly: true,
      socialDensity: 'crowd',
      intimacyLevel: 'open',
      timeVibe: getTimeVibe(startDate),
      isHolistic: false,
      isDance: isDanceEvent(normalized),
      holisticTags: [],
      danceTags: isDanceEvent(normalized) ? normalized.tags : [],
      confidence: 0.7,
    },
    neighborhoodId: null,
    neighborhoodName: normalized.venue?.city,
    source: 'ticketmaster',
  };
}

function inferMoods(event: any): string[] {
  const moods: string[] = [];
  const categories = event.categories || [];
  const name = (event.name || '').toLowerCase();

  if (categories.includes('music') || name.includes('concert')) moods.push('celebrate');
  if (categories.includes('sports')) moods.push('move');
  if (categories.includes('arts')) moods.push('explore');
  if (name.includes('comedy') || name.includes('stand-up')) moods.push('connect');

  return moods.length ? moods : ['explore'];
}

function isDanceEvent(event: any): boolean {
  const name = (event.name || '').toLowerCase();
  const tags = event.tags || [];
  return name.includes('dance') || tags.some((t: string) => t.toLowerCase().includes('dance'));
}

function getTimeVibe(date: Date | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'evening'; // default
  }
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'late-night';
}

interface LocationParams {
  city?: string;
  state?: string;
  postalCode?: string;
  latlong?: string;
  radius?: number;
}

async function fetchTicketmasterEvents(location: LocationParams = { city: 'San Francisco', state: 'CA' }, limit = 20) {
  if (!ticketmaster.isConfigured()) {
    console.log('[server] Ticketmaster not configured, using demo data only');
    return [];
  }

  try {
    const result = await ticketmaster.fetch({
      location,
      limit,
    });

    return result.events.map(raw => {
      const normalized = ticketmaster.normalize(raw);
      return transformTicketmasterEvent(normalized);
    });
  } catch (error) {
    console.error('[server] Ticketmaster fetch failed:', error);
    return [];
  }
}

// Cache for Ticketmaster events (refresh every 5 min, per location)
const tmEventsCache: Map<string, { events: any[], time: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(location: LocationParams): string {
  if (location.postalCode) return `zip-${location.postalCode}`;
  return `${location.city || 'sf'}-${location.state || 'ca'}`;
}

async function getCachedTicketmasterEvents(location: LocationParams = { city: 'San Francisco', state: 'CA' }) {
  const cacheKey = getCacheKey(location);
  const cached = tmEventsCache.get(cacheKey);

  if (!cached || Date.now() - cached.time > CACHE_TTL) {
    const events = await fetchTicketmasterEvents(location);
    tmEventsCache.set(cacheKey, { events, time: Date.now() });
    console.log(`[server] Refreshed Ticketmaster cache for ${cacheKey}: ${events.length} events`);
    return events;
  }
  return cached.events;
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
    version: '1.0.0',
    description: 'AI-powered event discovery for SF Bay Area',
    endpoints: {
      health: 'GET /health',
      discover: 'POST /api/v1/discover',
      tonight: 'GET /api/v1/discover/tonight',
      weekend: 'GET /api/v1/discover/weekend',
      holistic: 'GET /api/v1/discover/holistic',
      dance: 'GET /api/v1/discover/dance',
      mood: 'GET /api/v1/discover/mood/:mood',
      ticketmaster: 'GET /api/v1/discover/ticketmaster',
      neighborhoods: 'GET /api/v1/neighborhoods',
    },
    sources: ['ticketmaster', 'demo'],
  }));

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    ticketmaster: ticketmaster.isConfigured(),
    timestamp: new Date().toISOString()
  }));

  // Main discovery endpoint - combines Ticketmaster + demo holistic/dance
  fastify.post('/api/v1/discover', async (request) => {
    const body = request.body as any;

    // Build location from request - postal code takes priority
    const location: LocationParams = {};

    if (body.postalCode) {
      // Use postal code for search (don't set city/state - let TM use zip)
      location.postalCode = body.postalCode;
    } else {
      // Use city/state
      location.city = body.city || 'San Francisco';
      location.state = body.state || 'CA';
    }
    if (body.radius) location.radius = body.radius;

    const tmEvents = await getCachedTicketmasterEvents(location);

    // Only include demo events if searching in SF area
    const isSFArea = !body.city || body.city.toLowerCase().includes('san francisco') || body.postalCode?.startsWith('94');
    let events = isSFArea ? [...tmEvents, ...HOLISTIC_DANCE_EVENTS] : tmEvents;

    // Filter by moods
    if (body.moods?.length > 0) {
      events = events.filter(e => e.vibe.moods.some((m: string) => body.moods.includes(m)));
    }

    // Filter by holistic
    if (body.isHolistic === true) {
      events = events.filter(e => e.vibe.isHolistic);
    }

    // Filter by dance
    if (body.isDance === true) {
      events = events.filter(e => e.vibe.isDance);
    }

    return { events, sources: ['ticketmaster', 'demo'], location };
  });

  // Tonight
  fastify.get('/api/v1/discover/tonight', async () => {
    const tmEvents = await getCachedTicketmasterEvents();
    const today = new Date();
    const tonight = [...tmEvents, ...HOLISTIC_DANCE_EVENTS].filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate.toDateString() === today.toDateString();
    });
    return { events: tonight.length > 0 ? tonight : HOLISTIC_DANCE_EVENTS.slice(0, 3) };
  });

  // This weekend
  fastify.get('/api/v1/discover/weekend', async () => {
    const tmEvents = await getCachedTicketmasterEvents();
    return { events: [...tmEvents.slice(0, 10), ...HOLISTIC_DANCE_EVENTS.slice(0, 4)] };
  });

  // Holistic events (demo only for now)
  fastify.get('/api/v1/discover/holistic', async () => {
    return { events: HOLISTIC_DANCE_EVENTS.filter(e => e.vibe.isHolistic) };
  });

  // Dance events (demo + Ticketmaster dance)
  fastify.get('/api/v1/discover/dance', async () => {
    const tmEvents = await getCachedTicketmasterEvents();
    const danceFromTM = tmEvents.filter(e => e.vibe.isDance);
    const danceFromDemo = HOLISTIC_DANCE_EVENTS.filter(e => e.vibe.isDance);
    return { events: [...danceFromTM, ...danceFromDemo] };
  });

  // By mood
  fastify.get('/api/v1/discover/mood/:mood', async (request) => {
    const { mood } = request.params as { mood: string };
    const tmEvents = await getCachedTicketmasterEvents();
    const all = [...tmEvents, ...HOLISTIC_DANCE_EVENTS];
    return { events: all.filter(e => e.vibe.moods.includes(mood)) };
  });

  // Nearby
  fastify.get('/api/v1/discover/nearby', async () => {
    const tmEvents = await getCachedTicketmasterEvents();
    return { events: [...tmEvents.slice(0, 10), ...HOLISTIC_DANCE_EVENTS] };
  });

  // Ticketmaster-specific endpoint (raw TM data)
  fastify.get('/api/v1/discover/ticketmaster', async (request) => {
    const query = request.query as { city?: string; limit?: string };
    const events = await fetchTicketmasterEvents(query.city || 'San Francisco', parseInt(query.limit || '20'));
    return { events, source: 'ticketmaster', count: events.length };
  });

  // Neighborhoods
  const NEIGHBORHOODS = [
    { id: 'mission', name: 'Mission', slug: 'mission', city: 'San Francisco', country: 'USA' },
    { id: 'soma', name: 'SoMa', slug: 'soma', city: 'San Francisco', country: 'USA' },
    { id: 'castro', name: 'Castro', slug: 'castro', city: 'San Francisco', country: 'USA' },
    { id: 'nob-hill', name: 'Nob Hill', slug: 'nob-hill', city: 'San Francisco', country: 'USA' },
    { id: 'north-beach', name: 'North Beach', slug: 'north-beach', city: 'San Francisco', country: 'USA' },
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
  console.log(`🐊 AIeGator API running at http://localhost:${port}`);
  console.log(`   Ticketmaster: ${ticketmaster.isConfigured() ? '✅ Connected' : '❌ Not configured'}`);
}

main();
