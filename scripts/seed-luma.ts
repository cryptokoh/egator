import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { events } from '../packages/database/src/schema/events.js';
import { sources } from '../packages/database/src/schema/sources.js';
import { LumaAdapter } from '../packages/adapters/src/luma/index.js';

const ETHDENVER_CALENDARS = [
  'cal-VFzfuxD01QUFkSs',
  'cal-pJcL21PdduPHgJM',
  'cal-X3TOThcQU7sSzzZ',
  'cal-dJSBptlAksJ9HRJ',
  'cal-8lN9EdWEXJSAvkR',
  'cal-bs7P9hDqw2D2g8A',
  'cal-CrOLYq0GGUyx1d8',
  'cal-QSbmCSXtpG6Op5N',
];

async function seedLuma() {
  const dbUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aiegator';
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  console.log('Connecting to database...');

  // Ensure luma source exists
  await db.insert(sources).values({
    id: 'luma',
    name: 'Luma',
    description: 'Event hosting and ticketing platform',
    websiteUrl: 'https://lu.ma',
    isActive: true,
    isConfigured: true,
    rateLimitPerSecond: 5,
  }).onConflictDoNothing();

  const calendarIds = process.env.LUMA_CALENDAR_IDS
    ? process.env.LUMA_CALENDAR_IDS.split(',').map(s => s.trim())
    : ETHDENVER_CALENDARS;

  const adapter = new LumaAdapter({
    apiKey: process.env.LUMA_API_KEY,
    calendarApiId: calendarIds,
  });

  console.log(`Fetching from ${calendarIds.length} Luma calendars...`);

  const result = await adapter.fetch({ limit: 200 });
  console.log(`Fetched ${result.events.length} events`);

  let inserted = 0;
  let updated = 0;

  for (const raw of result.events) {
    const n = adapter.normalize(raw);

    // Skip events without sourceId
    if (!n.sourceId) {
      console.warn(`Skipping event without sourceId: ${n.name}`);
      continue;
    }

    // Skip events with invalid dates
    if (!n.startDate || isNaN(n.startDate.getTime())) {
      console.warn(`Skipping event with invalid date: ${n.name}`);
      continue;
    }
    if (n.endDate && isNaN(n.endDate.getTime())) {
      n.endDate = null as any;
    }

    const existing = await db.select({ id: events.id })
      .from(events)
      .where(and(eq(events.source, n.source), eq(events.sourceId, n.sourceId)))
      .limit(1);

    const values = {
      sourceId: n.sourceId,
      source: n.source,
      url: n.url,
      name: n.name,
      description: n.description,
      summary: n.summary,
      startDate: n.startDate,
      endDate: n.endDate,
      timezone: n.timezone,
      isAllDay: n.isAllDay,
      venueName: n.venue.name,
      venueAddress: n.venue.address,
      venueCity: n.venue.city,
      venueState: n.venue.state,
      venueCountry: n.venue.country,
      venuePostalCode: n.venue.postalCode,
      venueLat: n.venue.lat,
      venueLng: n.venue.lng,
      isOnline: n.isOnline,
      onlineUrl: n.onlineUrl,
      categories: n.categories,
      tags: n.tags,
      imageUrl: n.imageUrl,
      images: n.images,
      isFree: n.isFree,
      priceMin: n.priceMin,
      priceMax: n.priceMax,
      currency: n.currency,
      ticketUrl: n.ticketUrl,
      organizerName: n.organizer?.name ?? null,
      organizerUrl: n.organizer?.url ?? null,
      attendeeCount: n.attendeeCount,
      capacity: n.capacity,
      fetchedAt: n.fetchedAt,
      rawData: n.rawData,
    };

    if (existing.length > 0) {
      await db.update(events).set({ ...values, updatedAt: new Date() }).where(eq(events.id, existing[0].id));
      updated++;
    } else {
      await db.insert(events).values(values);
      inserted++;
    }
  }

  // Update source stats
  await db.update(sources).set({
    lastFetchAt: new Date(),
    lastFetchStatus: 'success',
    totalEventsFetched: result.events.length,
    updatedAt: new Date(),
  }).where(eq(sources.id, 'luma'));

  console.log(`\nDone: ${inserted} inserted, ${updated} updated`);
  await pool.end();
}

seedLuma().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
