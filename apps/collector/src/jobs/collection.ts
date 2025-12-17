import { Job, Queue } from 'bullmq';
import { AdapterRegistry, type NormalizedEvent } from '@aiegator/adapters';
import { db, events, fetchLogs, sources } from '@aiegator/database';
import { eq } from 'drizzle-orm';
import type { EnrichmentJobData } from './enrichment.js';

export interface CollectionJobData {
  source: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    radiusMiles?: number;
  };
  date?: {
    startDate?: string;
    endDate?: string;
  };
  categories?: string[];
  keywords?: string[];
  cursor?: string;
}

interface CollectionResult {
  eventsFound: number;
  eventsNew: number;
  eventsUpdated: number;
  errors: string[];
}

export async function processCollectionJob(
  job: Job<CollectionJobData>,
  registry: AdapterRegistry,
  enrichmentQueue: Queue<EnrichmentJobData>
): Promise<CollectionResult> {
  const { source, location, date, categories, keywords, cursor } = job.data;
  const startTime = Date.now();

  console.log(`[Collection] Starting job for ${source}`);

  // Create fetch log entry
  const logId = crypto.randomUUID();
  await db.insert(fetchLogs).values({
    id: logId,
    sourceId: source,
    startedAt: new Date(),
    status: 'running',
    filters: { city: location?.city, startDate: date?.startDate, endDate: date?.endDate, categories },
  });

  const result: CollectionResult = {
    eventsFound: 0,
    eventsNew: 0,
    eventsUpdated: 0,
    errors: [],
  };

  try {
    const adapter = registry.getAdapter(source);
    if (!adapter || !adapter.isConfigured()) {
      throw new Error(`Adapter ${source} not configured`);
    }

    // Fetch events
    const fetchResult = await adapter.fetch({
      location,
      date: date ? {
        startDate: date.startDate ? new Date(date.startDate) : undefined,
        endDate: date.endDate ? new Date(date.endDate) : undefined,
      } : undefined,
      categories,
      keywords,
      cursor,
    });

    result.eventsFound = fetchResult.events.length;

    // Normalize and save events
    const newEventIds: string[] = [];

    for (const rawEvent of fetchResult.events) {
      try {
        const normalized = adapter.normalize(rawEvent);
        const saveResult = await saveEvent(normalized);

        if (saveResult.isNew) {
          result.eventsNew++;
          newEventIds.push(saveResult.id);
        } else {
          result.eventsUpdated++;
        }
      } catch (error) {
        result.errors.push(`Failed to save event ${rawEvent.sourceId}: ${error}`);
      }
    }

    // Queue enrichment for new events
    if (newEventIds.length > 0) {
      await enrichmentQueue.add(
        `enrich-${source}-${Date.now()}`,
        { eventIds: newEventIds },
        { priority: 2 }
      );
    }

    // If there are more pages, queue the next fetch
    if (fetchResult.hasMore && fetchResult.nextCursor) {
      await job.queue?.add(
        `${job.name}-page`,
        { ...job.data, cursor: fetchResult.nextCursor },
        { priority: 3 }
      );
    }

    // Update fetch log
    await db
      .update(fetchLogs)
      .set({
        completedAt: new Date(),
        status: result.errors.length > 0 ? 'partial' : 'success',
        eventsFound: result.eventsFound,
        eventsNew: result.eventsNew,
        eventsUpdated: result.eventsUpdated,
        durationMs: Date.now() - startTime,
        errorMessage: result.errors.length > 0 ? result.errors.join('\n') : null,
      })
      .where(eq(fetchLogs.id, logId));

    // Update source stats
    await db
      .update(sources)
      .set({
        lastFetchAt: new Date(),
        lastFetchStatus: result.errors.length > 0 ? 'partial' : 'success',
        updatedAt: new Date(),
      })
      .where(eq(sources.id, source));

    console.log(`[Collection] Completed ${source}: ${result.eventsNew} new, ${result.eventsUpdated} updated`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(fetchLogs)
      .set({
        completedAt: new Date(),
        status: 'failed',
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - startTime,
      })
      .where(eq(fetchLogs.id, logId));

    await db
      .update(sources)
      .set({
        lastFetchAt: new Date(),
        lastFetchStatus: 'failed',
        lastFetchError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, source));

    throw error;
  }

  return result;
}

async function saveEvent(event: NormalizedEvent): Promise<{ id: string; isNew: boolean }> {
  // Check if event already exists
  const existing = await db.query.events.findFirst({
    where: (e, { and, eq }) => and(
      eq(e.source, event.source),
      eq(e.sourceId, event.sourceId)
    ),
  });

  if (existing) {
    // Update existing event
    await db
      .update(events)
      .set({
        name: event.name,
        description: event.description,
        summary: event.summary,
        startDate: event.startDate,
        endDate: event.endDate,
        timezone: event.timezone,
        isAllDay: event.isAllDay,
        venueName: event.venue.name,
        venueAddress: event.venue.address,
        venueCity: event.venue.city,
        venueState: event.venue.state,
        venueCountry: event.venue.country,
        venuePostalCode: event.venue.postalCode,
        venueLat: event.venue.lat,
        venueLng: event.venue.lng,
        isOnline: event.isOnline,
        onlineUrl: event.onlineUrl,
        categories: event.categories,
        tags: event.tags,
        imageUrl: event.imageUrl,
        images: event.images,
        isFree: event.isFree,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        currency: event.currency,
        ticketUrl: event.ticketUrl,
        organizerName: event.organizer?.name,
        organizerUrl: event.organizer?.url,
        attendeeCount: event.attendeeCount,
        capacity: event.capacity,
        fetchedAt: event.fetchedAt,
        rawData: event.rawData,
        updatedAt: new Date(),
      })
      .where(eq(events.id, existing.id));

    return { id: existing.id, isNew: false };
  }

  // Insert new event
  const [newEvent] = await db
    .insert(events)
    .values({
      sourceId: event.sourceId,
      source: event.source,
      url: event.url,
      name: event.name,
      description: event.description,
      summary: event.summary,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
      venueName: event.venue.name,
      venueAddress: event.venue.address,
      venueCity: event.venue.city,
      venueState: event.venue.state,
      venueCountry: event.venue.country,
      venuePostalCode: event.venue.postalCode,
      venueLat: event.venue.lat,
      venueLng: event.venue.lng,
      isOnline: event.isOnline,
      onlineUrl: event.onlineUrl,
      categories: event.categories,
      tags: event.tags,
      imageUrl: event.imageUrl,
      images: event.images,
      isFree: event.isFree,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      currency: event.currency,
      ticketUrl: event.ticketUrl,
      organizerName: event.organizer?.name,
      organizerUrl: event.organizer?.url,
      attendeeCount: event.attendeeCount,
      capacity: event.capacity,
      fetchedAt: event.fetchedAt,
      rawData: event.rawData,
    })
    .returning({ id: events.id });

  return { id: newEvent.id, isNew: true };
}
