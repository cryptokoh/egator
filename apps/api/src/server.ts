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

// Fetch event detail from lu.ma for enrichment
async function fetchEventDetail(eventApiId: string): Promise<any> {
  try {
    const res = await fetch(`https://api.lu.ma/event/get?event_api_id=${eventApiId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Fetch details in batches with concurrency limit
async function enrichEvents(events: any[]): Promise<any[]> {
  const BATCH_SIZE = 10;
  const enriched = [...events];

  for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
    const batch = enriched.slice(i, i + BATCH_SIZE);
    const details = await Promise.all(
      batch.map(e => {
        const apiId = e._eventApiId;
        return apiId ? fetchEventDetail(apiId) : Promise.resolve(null);
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const detail = details[j];
      if (!detail) continue;

      const event = detail.event || {};
      const hosts = detail.hosts || [];
      const ticketInfo = detail.ticket_info;
      const categories = detail.categories || [];

      // Merge enrichment data
      if (event.description) {
        enriched[i + j].description = event.description;
      }
      if (hosts.length > 0) {
        enriched[i + j].organizer = {
          name: hosts[0].name,
          url: hosts[0].username ? `https://lu.ma/user/${hosts[0].username}` : null,
          avatar: hosts[0].avatar_url || null,
        };
        if (hosts.length > 1) {
          enriched[i + j].coHosts = hosts.slice(1).map((h: any) => ({
            name: h.name,
            url: h.username ? `https://lu.ma/user/${h.username}` : null,
            avatar: h.avatar_url || null,
          }));
        }
      }
      if (ticketInfo) {
        const isFree = ticketInfo.is_free ?? false;
        const priceCents = ticketInfo.price?.cents;
        const currency = ticketInfo.price?.currency?.toUpperCase() || 'USD';
        enriched[i + j].price = isFree
          ? { min: 0, max: 0, currency }
          : priceCents
            ? { min: priceCents / 100, max: ticketInfo.max_price ? ticketInfo.max_price / 100 : priceCents / 100, currency }
            : null;
        enriched[i + j].isFree = isFree;
        enriched[i + j].spotsRemaining = ticketInfo.spots_remaining ?? null;
        enriched[i + j].isSoldOut = ticketInfo.is_sold_out ?? false;
      }
      if (detail.guest_count) {
        enriched[i + j].attendeeCount = detail.guest_count;
      }
      if (detail.ticket_count) {
        enriched[i + j].capacity = detail.ticket_count;
      }
      if (categories.length > 0) {
        enriched[i + j].categories = categories.map((c: any) => c.name);
      }

      // Clean up internal field
      delete enriched[i + j]._eventApiId;
    }
  }

  return enriched;
}

// Transform Luma normalized event to our API format
function transformLumaEvent(normalized: any, eventApiId?: string): any {
  const startDate = normalized.startDate instanceof Date && !isNaN(normalized.startDate.getTime())
    ? normalized.startDate
    : new Date();
  const endDate = normalized.endDate instanceof Date && !isNaN(normalized.endDate.getTime())
    ? normalized.endDate
    : null;

  return {
    id: `luma-${normalized.sourceId}`,
    _eventApiId: eventApiId, // used for enrichment, stripped later
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
    isFree: normalized.isFree ?? false,
    organizer: normalized.organizer,
    attendeeCount: normalized.attendeeCount,
    categories: [],
    tags: normalized.tags || [],
    isOnline: normalized.isOnline,
    onlineUrl: normalized.onlineUrl,
    source: 'luma',
  };
}

// Fetch, filter, enrich, and transform Luma events
async function fetchLumaEvents(limit = 100) {
  if (!luma.isConfigured()) {
    console.log('[server] Luma not configured, no calendar IDs set');
    return [];
  }

  try {
    const result = await luma.fetch({ limit });

    // Filter out events without a valid sourceId (prevents luma-undefined)
    const validEvents = result.events.filter(raw => raw.sourceId && raw.sourceId !== 'undefined');

    const transformed = validEvents.map(raw => {
      const normalized = luma.normalize(raw);
      return transformLumaEvent(normalized, raw.sourceId);
    });

    // Enrich with detail data (hosts, tickets, descriptions, categories)
    const enriched = await enrichEvents(transformed);
    console.log(`[server] Enriched ${enriched.length} events with detail data`);

    return enriched;
  } catch (error) {
    console.error('[server] Luma fetch failed:', error);
    return [];
  }
}

// Cache for Luma events (refresh every 10 min - longer TTL since enrichment is expensive)
let lumaCache: { events: any[], time: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

async function getCachedLumaEvents() {
  if (!lumaCache || Date.now() - lumaCache.time > CACHE_TTL) {
    const events = await fetchLumaEvents();
    lumaCache = { events, time: Date.now() };
    console.log(`[server] Refreshed Luma cache: ${events.length} enriched events`);
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
    cachedEvents: lumaCache?.events.length ?? 0,
    enriched: true,
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
        e.venue?.name?.toLowerCase().includes(q) ||
        e.organizer?.name?.toLowerCase().includes(q) ||
        e.categories?.some((c: string) => c.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (body.category) {
      const cat = body.category.toLowerCase();
      events = events.filter((e: any) =>
        e.categories?.some((c: string) => c.toLowerCase() === cat)
      );
    }

    // Filter by free events only
    if (body.freeOnly) {
      events = events.filter((e: any) => e.isFree);
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

  // --- FlowB Points API ---

  const supabaseUrl = process.env.DANZ_SUPABASE_URL;
  const supabaseKey = process.env.DANZ_SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    // Helper to proxy Supabase requests for points
    async function supabaseQuery(table: string, params: Record<string, string>) {
      const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetch(url.toString(), {
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      return res.json();
    }

    async function supabaseInsert(table: string, data: Record<string, any>) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const result = await res.json();
      return Array.isArray(result) ? result[0] : result;
    }

    async function supabasePatch(table: string, params: Record<string, string>, data: Record<string, any>) {
      const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(data),
      });
    }

    // POST /api/v1/points/award - Award points for a web action
    fastify.post('/api/v1/points/award', async (request) => {
      const { user_id, action, points, metadata } = request.body as any;
      if (!user_id || !action || !points) {
        return { error: 'Missing user_id, action, or points' };
      }

      // Ensure user row
      let rows = await supabaseQuery('flowb_user_points', {
        select: '*',
        user_id: `eq.${user_id}`,
        platform: 'eq.web',
        limit: '1',
      });

      if (!rows?.length) {
        await supabaseInsert('flowb_user_points', {
          user_id,
          platform: 'web',
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          first_actions: {},
          milestone_level: 0,
        });
        rows = [{ total_points: 0 }];
      }

      const current = rows[0];

      // Insert ledger entry
      await supabaseInsert('flowb_points_ledger', {
        user_id,
        platform: 'web',
        action,
        points,
        metadata: metadata || {},
      });

      // Update total
      const newTotal = (current.total_points || 0) + points;
      await supabasePatch('flowb_user_points', {
        user_id: `eq.${user_id}`,
        platform: 'eq.web',
      }, {
        total_points: newTotal,
        updated_at: new Date().toISOString(),
      });

      return { awarded: true, points, total: newTotal };
    });

    // GET /api/v1/points/balance - Get point balance (auto-generates referral code)
    fastify.get('/api/v1/points/balance', async (request) => {
      const { user_id, generate_ref } = request.query as { user_id?: string; generate_ref?: string };
      if (!user_id) return { error: 'Missing user_id' };

      let rows = await supabaseQuery('flowb_user_points', {
        select: '*',
        user_id: `eq.${user_id}`,
        platform: 'eq.web',
        limit: '1',
      });

      if (!rows?.length) {
        // Create user row on first balance check
        await supabaseInsert('flowb_user_points', {
          user_id,
          platform: 'web',
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          first_actions: {},
          milestone_level: 0,
        });
        rows = await supabaseQuery('flowb_user_points', {
          select: '*',
          user_id: `eq.${user_id}`,
          platform: 'eq.web',
          limit: '1',
        });
        if (!rows?.length) {
          return { totalPoints: 0, streak: 0, referralCode: null, milestoneLevel: 0 };
        }
      }

      const r = rows[0];

      // Auto-generate referral code if requested and missing
      let referralCode = r.referral_code || null;
      if (!referralCode && generate_ref === 'true') {
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        await supabasePatch('flowb_user_points', {
          user_id: `eq.${user_id}`,
          platform: 'eq.web',
        }, { referral_code: code });
        referralCode = code;
      }

      return {
        totalPoints: r.total_points || 0,
        streak: r.current_streak || 0,
        referralCode,
        milestoneLevel: r.milestone_level || 0,
      };
    });

    // POST /api/v1/points/transfer - Transfer anonymous points to registered account
    fastify.post('/api/v1/points/transfer', async (request) => {
      const { from_user_id, to_user_id } = request.body as any;
      if (!from_user_id || !to_user_id) {
        return { error: 'Missing from_user_id or to_user_id' };
      }

      const fromRows = await supabaseQuery('flowb_user_points', {
        select: '*',
        user_id: `eq.${from_user_id}`,
        platform: 'eq.web',
        limit: '1',
      });

      if (!fromRows?.length || fromRows[0].total_points === 0) {
        return { transferred: false, reason: 'No points to transfer' };
      }

      const toRows = await supabaseQuery('flowb_user_points', {
        select: '*',
        user_id: `eq.${to_user_id}`,
        platform: 'eq.web',
        limit: '1',
      });

      let toTotal = 0;
      if (toRows?.length) {
        toTotal = toRows[0].total_points || 0;
      } else {
        await supabaseInsert('flowb_user_points', {
          user_id: to_user_id,
          platform: 'web',
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          first_actions: {},
          milestone_level: 0,
        });
      }

      const fromTotal = fromRows[0].total_points;
      await supabasePatch('flowb_user_points', {
        user_id: `eq.${to_user_id}`,
        platform: 'eq.web',
      }, { total_points: toTotal + fromTotal });

      await supabasePatch('flowb_user_points', {
        user_id: `eq.${from_user_id}`,
        platform: 'eq.web',
      }, { total_points: 0 });

      return { transferred: true, points: fromTotal, newTotal: toTotal + fromTotal };
    });

    // POST /api/v1/points/referral-click - Track referral link click
    fastify.post('/api/v1/points/referral-click', async (request) => {
      const { ref_code, user_id } = request.body as any;
      if (!ref_code || !user_id) {
        return { error: 'Missing ref_code or user_id' };
      }

      // Find referrer
      const referrers = await supabaseQuery('flowb_user_points', {
        select: 'user_id,platform',
        referral_code: `eq.${ref_code}`,
        limit: '1',
      });

      if (!referrers?.length) return { tracked: false };

      const referrer = referrers[0];
      if (referrer.user_id === user_id) return { tracked: false };

      // Award referrer +3 for click
      await supabaseInsert('flowb_points_ledger', {
        user_id: referrer.user_id,
        platform: referrer.platform,
        action: 'referral_click',
        points: 3,
        metadata: { clicker: user_id },
      });

      // Update referrer total
      const referrerRows = await supabaseQuery('flowb_user_points', {
        select: 'total_points',
        user_id: `eq.${referrer.user_id}`,
        platform: `eq.${referrer.platform}`,
        limit: '1',
      });

      if (referrerRows?.length) {
        await supabasePatch('flowb_user_points', {
          user_id: `eq.${referrer.user_id}`,
          platform: `eq.${referrer.platform}`,
        }, {
          total_points: (referrerRows[0].total_points || 0) + 3,
        });
      }

      // Store referred_by on clicker
      let clickerRows = await supabaseQuery('flowb_user_points', {
        select: 'referred_by',
        user_id: `eq.${user_id}`,
        platform: 'eq.web',
        limit: '1',
      });

      if (!clickerRows?.length) {
        await supabaseInsert('flowb_user_points', {
          user_id,
          platform: 'web',
          total_points: 0,
          referred_by: ref_code,
          current_streak: 0,
          longest_streak: 0,
          first_actions: {},
          milestone_level: 0,
        });
      } else if (!clickerRows[0].referred_by) {
        await supabasePatch('flowb_user_points', {
          user_id: `eq.${user_id}`,
          platform: 'eq.web',
        }, { referred_by: ref_code });
      }

      return { tracked: true };
    });

    console.log('[server] FlowB Points API enabled');
  }

  // Start
  const port = parseInt(process.env.PORT || '3000', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`AIeGator API running at http://localhost:${port}`);
  console.log(`   Luma: ${luma.isConfigured() ? 'Connected (' + calendarIds.length + ' calendars)' : 'Not configured'}`);
}

main();
