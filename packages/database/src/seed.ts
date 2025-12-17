import { db } from './client.js';
import { sources } from './schema/sources.js';

/**
 * Seed the database with initial data
 */
async function seed() {
  console.log('Seeding database...');

  // Seed sources
  const sourcesData = [
    {
      id: 'eventbrite',
      name: 'Eventbrite',
      description: 'Global ticketing and event platform',
      websiteUrl: 'https://www.eventbrite.com',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 5,
    },
    {
      id: 'ticketmaster',
      name: 'Ticketmaster',
      description: 'Live entertainment ticketing platform',
      websiteUrl: 'https://www.ticketmaster.com',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 5,
    },
    {
      id: 'meetup',
      name: 'Meetup',
      description: 'Community-based event platform',
      websiteUrl: 'https://www.meetup.com',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 2,
    },
    {
      id: 'yelp',
      name: 'Yelp Events',
      description: 'Local business events',
      websiteUrl: 'https://www.yelp.com',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 5,
    },
    {
      id: 'allevents',
      name: 'AllEvents.in',
      description: 'Global event discovery platform',
      websiteUrl: 'https://allevents.in',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 3,
    },
    {
      id: 'bandsintown',
      name: 'Bandsintown',
      description: 'Concert and music event platform',
      websiteUrl: 'https://www.bandsintown.com',
      isActive: true,
      isConfigured: false,
      rateLimitPerSecond: 2,
    },
    {
      id: 'schema-crawler',
      name: 'Schema.org Crawler',
      description: 'Events extracted from structured data',
      websiteUrl: null,
      isActive: true,
      isConfigured: true,
      rateLimitPerSecond: 1,
    },
    {
      id: 'user',
      name: 'User Submitted',
      description: 'Events submitted by users',
      websiteUrl: null,
      isActive: true,
      isConfigured: true,
      rateLimitPerSecond: null,
    },
  ];

  for (const source of sourcesData) {
    await db
      .insert(sources)
      .values(source)
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          name: source.name,
          description: source.description,
          websiteUrl: source.websiteUrl,
          rateLimitPerSecond: source.rateLimitPerSecond,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${sourcesData.length} sources`);
  console.log('Database seeding complete!');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
