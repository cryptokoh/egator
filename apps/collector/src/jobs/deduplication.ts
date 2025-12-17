import { Job } from 'bullmq';
import { DeduplicationService } from '@aiegator/ai';
import { db, events, duplicateClusters, clusterMembers, deduplicationRuns } from '@aiegator/database';
import { eq, isNull, and, gte } from 'drizzle-orm';

export interface DeduplicationJobData {
  eventIds?: string[];
  onlyRecent?: boolean;
  daysBack?: number;
}

interface DeduplicationResult {
  totalProcessed: number;
  clustersFound: number;
  eventsMarkedDuplicate: number;
  errors: string[];
}

export async function processDeduplicationJob(
  job: Job<DeduplicationJobData>,
  service: DeduplicationService
): Promise<DeduplicationResult> {
  const { eventIds, onlyRecent = true, daysBack = 1 } = job.data;
  const startTime = Date.now();

  console.log('[Deduplication] Starting deduplication job');

  const result: DeduplicationResult = {
    totalProcessed: 0,
    clustersFound: 0,
    eventsMarkedDuplicate: 0,
    errors: [],
  };

  // Create deduplication run record
  const [run] = await db
    .insert(deduplicationRuns)
    .values({
      startedAt: new Date(),
      status: 'running',
      config: {
        similarityThreshold: 0.7,
        minClusterSize: 2,
        useLLMVerification: true,
      },
    })
    .returning();

  try {
    // Get events to process
    let eventsToProcess;

    if (eventIds?.length) {
      // Process specific events
      eventsToProcess = await db.query.events.findMany({
        where: and(
          eq(events.isDuplicate, false),
          // Could add: inArray(events.id, eventIds)
        ),
      });
    } else if (onlyRecent) {
      // Process recent events
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      eventsToProcess = await db.query.events.findMany({
        where: and(
          eq(events.isDuplicate, false),
          gte(events.createdAt, cutoffDate)
        ),
      });
    } else {
      // Process all non-duplicate events
      eventsToProcess = await db.query.events.findMany({
        where: eq(events.isDuplicate, false),
      });
    }

    result.totalProcessed = eventsToProcess.length;

    if (eventsToProcess.length < 2) {
      console.log('[Deduplication] Not enough events to process');
      return result;
    }

    // Convert to deduplication format
    const deduplicationEvents = eventsToProcess.map((e) => ({
      id: e.id,
      name: e.name,
      venue: e.venueName,
      city: e.venueCity,
      date: e.startDate,
      source: e.source,
      description: e.description,
      embedding: e.embedding as number[] | undefined,
    }));

    // Run deduplication
    const deduplicationResult = await service.findDuplicates(deduplicationEvents);

    result.clustersFound = deduplicationResult.clustersFound;

    // Save duplicate clusters
    for (const cluster of deduplicationResult.clusters) {
      try {
        // Create cluster record
        const [newCluster] = await db
          .insert(duplicateClusters)
          .values({
            primaryEventId: cluster.primaryEventId!,
            avgSimilarity: cluster.avgSimilarity,
            confidence: cluster.confidence,
            llmVerified: cluster.llmVerified,
            llmReasoning: cluster.llmReasoning,
            status: 'active',
          })
          .returning();

        // Add cluster members
        for (const eventId of cluster.eventIds) {
          const isPrimary = eventId === cluster.primaryEventId;

          await db.insert(clusterMembers).values({
            clusterId: newCluster.id,
            eventId,
            isPrimary,
          });

          // Mark non-primary events as duplicates
          if (!isPrimary) {
            await db
              .update(events)
              .set({
                isDuplicate: true,
                primaryEventId: cluster.primaryEventId,
                duplicateClusterId: newCluster.id,
                updatedAt: new Date(),
              })
              .where(eq(events.id, eventId));

            result.eventsMarkedDuplicate++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to save cluster ${cluster.clusterId}: ${error}`);
      }
    }

    // Update deduplication run
    await db
      .update(deduplicationRuns)
      .set({
        completedAt: new Date(),
        status: 'completed',
        totalEventsProcessed: result.totalProcessed,
        clustersFound: result.clustersFound,
        eventsMarkedDuplicate: result.eventsMarkedDuplicate,
        durationMs: Date.now() - startTime,
      })
      .where(eq(deduplicationRuns.id, run.id));

    console.log(`[Deduplication] Completed: ${result.clustersFound} clusters, ${result.eventsMarkedDuplicate} duplicates marked`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(deduplicationRuns)
      .set({
        completedAt: new Date(),
        status: 'failed',
        errorMessage,
        durationMs: Date.now() - startTime,
      })
      .where(eq(deduplicationRuns.id, run.id));

    throw error;
  }

  return result;
}
