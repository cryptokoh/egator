import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AdapterRegistry } from '@aiegator/adapters';
import { EnrichmentPipeline } from '@aiegator/ai';
import { db, events } from '@aiegator/database';
import { processCollectionJob, CollectionJobData } from './jobs/collection.js';
import { processEnrichmentJob, EnrichmentJobData } from './jobs/enrichment.js';
import { processDeduplicationJob, DeduplicationJobData } from './jobs/deduplication.js';

// Redis connection
const redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Initialize services
const adapterRegistry = new AdapterRegistry({
  eventbrite: {
    apiKey: process.env.EVENTBRITE_API_KEY,
  },
  ticketmaster: {
    apiKey: process.env.TICKETMASTER_API_KEY,
  },
  meetup: {
    accessToken: process.env.MEETUP_ACCESS_TOKEN,
    clientId: process.env.MEETUP_CLIENT_ID,
    clientSecret: process.env.MEETUP_CLIENT_SECRET,
  },
  yelp: {
    apiKey: process.env.YELP_API_KEY,
  },
  allevents: {
    apiKey: process.env.ALLEVENTS_API_KEY,
  },
  bandsintown: {
    apiKey: process.env.BANDSINTOWN_APP_ID,
  },
});

const enrichmentPipeline = new EnrichmentPipeline({
  generateEmbeddings: true,
  inferCategories: true,
  generateSummary: false,
  batchSize: 50,
});

// Create queues
export const collectionQueue = new Queue<CollectionJobData>('collection', {
  connection: redisConnection,
});

export const enrichmentQueue = new Queue<EnrichmentJobData>('enrichment', {
  connection: redisConnection,
});

export const deduplicationQueue = new Queue<DeduplicationJobData>('deduplication', {
  connection: redisConnection,
});

// Create workers
const collectionWorker = new Worker<CollectionJobData>(
  'collection',
  async (job) => processCollectionJob(job, adapterRegistry, enrichmentQueue),
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

const enrichmentWorker = new Worker<EnrichmentJobData>(
  'enrichment',
  async (job) => processEnrichmentJob(job, enrichmentPipeline),
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

const deduplicationWorker = new Worker<DeduplicationJobData>(
  'deduplication',
  async (job) => processDeduplicationJob(job, enrichmentPipeline.createDeduplicationService()),
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

// Worker event handlers
[collectionWorker, enrichmentWorker, deduplicationWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error(`[${worker.name}] Worker error:`, err);
  });
});

console.log('AIeGator Collector started');
console.log(`Configured adapters: ${adapterRegistry.getConfiguredAdapters().join(', ') || 'none'}`);
console.log('Waiting for jobs...');

// Schedule recurring collection jobs
async function scheduleRecurringJobs() {
  const configuredSources = adapterRegistry.getConfiguredAdapters();
  const defaultCity = process.env.DEFAULT_CITY ?? 'San Francisco';

  for (const source of configuredSources) {
    // Add collection job for each source
    await collectionQueue.add(
      `collect-${source}`,
      {
        source,
        location: { city: defaultCity },
        date: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        },
      },
      {
        repeat: {
          every: parseInt(process.env.COLLECTOR_INTERVAL_MS ?? '300000'), // 5 minutes default
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  }

  // Schedule deduplication job
  await deduplicationQueue.add(
    'deduplicate-all',
    {},
    {
      repeat: {
        every: 60 * 60 * 1000, // Every hour
      },
      removeOnComplete: 10,
      removeOnFail: 10,
    }
  );

  console.log('Recurring jobs scheduled');
}

scheduleRecurringJobs().catch(console.error);

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...');

  await collectionWorker.close();
  await enrichmentWorker.close();
  await deduplicationWorker.close();

  await redisConnection.quit();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
