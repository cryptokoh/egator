import { Job } from 'bullmq';
import { EnrichmentPipeline } from '@aiegator/ai';
import { db, events } from '@aiegator/database';
import { eq, inArray } from 'drizzle-orm';

export interface EnrichmentJobData {
  eventIds: string[];
}

interface EnrichmentResult {
  processed: number;
  enriched: number;
  errors: string[];
}

export async function processEnrichmentJob(
  job: Job<EnrichmentJobData>,
  pipeline: EnrichmentPipeline
): Promise<EnrichmentResult> {
  const { eventIds } = job.data;

  console.log(`[Enrichment] Processing ${eventIds.length} events`);

  const result: EnrichmentResult = {
    processed: 0,
    enriched: 0,
    errors: [],
  };

  // Fetch events from database
  const eventsToEnrich = await db.query.events.findMany({
    where: inArray(events.id, eventIds),
  });

  result.processed = eventsToEnrich.length;

  // Convert to format expected by enrichment pipeline
  const normalizedEvents = eventsToEnrich.map((e) => ({
    sourceId: e.sourceId,
    source: e.source,
    url: e.url,
    name: e.name,
    description: e.description,
    summary: e.summary,
    startDate: e.startDate,
    endDate: e.endDate,
    timezone: e.timezone,
    isAllDay: e.isAllDay,
    venue: {
      name: e.venueName,
      address: e.venueAddress,
      city: e.venueCity,
      state: e.venueState,
      country: e.venueCountry,
      postalCode: e.venuePostalCode,
      lat: e.venueLat,
      lng: e.venueLng,
    },
    isOnline: e.isOnline,
    onlineUrl: e.onlineUrl,
    categories: e.categories as string[],
    tags: e.tags as string[],
    imageUrl: e.imageUrl,
    images: e.images as any[],
    isFree: e.isFree,
    priceMin: e.priceMin,
    priceMax: e.priceMax,
    currency: e.currency,
    ticketUrl: e.ticketUrl,
    organizer: e.organizerName ? { name: e.organizerName, url: e.organizerUrl } : null,
    attendeeCount: e.attendeeCount,
    capacity: e.capacity,
    fetchedAt: e.fetchedAt,
    rawData: e.rawData as Record<string, unknown>,
  }));

  // Enrich events
  const enrichedEvents = await pipeline.enrichEvents(normalizedEvents);

  // Save enriched data back to database
  for (let i = 0; i < enrichedEvents.length; i++) {
    const enriched = enrichedEvents[i];
    const originalId = eventsToEnrich[i].id;

    try {
      await db
        .update(events)
        .set({
          embedding: enriched.embedding,
          inferredCategories: enriched.inferredCategories,
          enrichedAt: enriched.enrichedAt,
          updatedAt: new Date(),
        })
        .where(eq(events.id, originalId));

      result.enriched++;
    } catch (error) {
      result.errors.push(`Failed to save enrichment for ${originalId}: ${error}`);
    }
  }

  console.log(`[Enrichment] Completed: ${result.enriched}/${result.processed} enriched`);

  return result;
}
