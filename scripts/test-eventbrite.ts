import 'dotenv/config';
import { EventbriteAdapter } from '../packages/adapters/src/eventbrite/index.js';

async function testEventbrite() {
  console.log('Testing Eventbrite API...\n');

  // Try private token first (most permissive)
  const adapter = new EventbriteAdapter({
    accessToken: process.env.EVENTBRITE_PRIVATE_TOKEN,
  });

  console.log('Configured:', adapter.isConfigured());

  if (!adapter.isConfigured()) {
    console.error('Eventbrite not configured! Check your .env file');
    process.exit(1);
  }

  try {
    console.log('\nFetching events in San Francisco...\n');

    const result = await adapter.fetch({
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
      categories: ['holistic', 'dance'],
      limit: 10,
    });

    console.log(`Found ${result.events.length} raw events`);
    console.log(`Has more: ${result.hasMore}`);
    console.log(`Total count: ${result.totalCount ?? 'N/A'}`);

    if (result.events.length > 0) {
      console.log('\n--- Sample Events ---\n');

      for (const raw of result.events.slice(0, 5)) {
        const normalized = adapter.normalize(raw);
        console.log(`📅 ${normalized.name}`);
        console.log(`   📍 ${normalized.venue?.name ?? 'Online'}`);
        console.log(`   🗓️  ${normalized.startDate.toLocaleDateString()}`);
        console.log(`   🏷️  ${normalized.categories.join(', ')}`);
        console.log(`   💰 ${normalized.isFree ? 'Free' : `$${normalized.priceMin ?? '?'}`}`);
        console.log('');
      }
    }

  } catch (error: any) {
    console.error('Error fetching events:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEventbrite();
