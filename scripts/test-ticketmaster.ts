import 'dotenv/config';
import { TicketmasterAdapter } from '../packages/adapters/src/ticketmaster/index.js';

async function testTicketmaster() {
  console.log('🎫 Testing Ticketmaster API...\n');

  const adapter = new TicketmasterAdapter({
    apiKey: process.env.TICKETMASTER_API_KEY,
  });

  console.log('Configured:', adapter.isConfigured());

  if (!adapter.isConfigured()) {
    console.error('Ticketmaster not configured! Check your .env file');
    process.exit(1);
  }

  try {
    console.log('\nFetching events in San Francisco...\n');

    const result = await adapter.fetch({
      location: {
        city: 'San Francisco',
        state: 'CA',
      },
      limit: 20,
    });

    console.log(`✅ Found ${result.events.length} raw events`);
    console.log(`📄 Has more: ${result.hasMore}`);

    if (result.events.length > 0) {
      console.log('\n--- Sample Events ---\n');

      for (const raw of result.events.slice(0, 8)) {
        const normalized = adapter.normalize(raw);
        console.log(`🎵 ${normalized.name}`);
        console.log(`   📍 ${normalized.venue?.name ?? 'TBA'} - ${normalized.venue?.city ?? ''}`);
        console.log(`   🗓️  ${normalized.startDate.toLocaleDateString()} ${normalized.startDate.toLocaleTimeString()}`);
        console.log(`   🏷️  ${normalized.categories.join(', ') || 'uncategorized'}`);
        console.log(`   💰 ${normalized.isFree ? 'Free' : normalized.priceMin ? `$${normalized.priceMin}${normalized.priceMax ? `-$${normalized.priceMax}` : '+'}` : 'See tickets'}`);
        console.log(`   🔗 ${normalized.url}`);
        console.log('');
      }
    }

    // Also try fetching holistic/wellness events
    console.log('\n--- Searching for Yoga/Wellness Events ---\n');

    const holisticResult = await adapter.fetch({
      location: {
        city: 'San Francisco',
      },
      keywords: ['yoga', 'meditation', 'wellness'],
      limit: 5,
    });

    console.log(`Found ${holisticResult.events.length} wellness-related events`);

    // Try dance events
    console.log('\n--- Searching for Dance Events ---\n');

    const danceResult = await adapter.fetch({
      location: {
        city: 'San Francisco',
      },
      keywords: ['dance', 'salsa', 'bachata'],
      limit: 5,
    });

    console.log(`Found ${danceResult.events.length} dance-related events`);

  } catch (error: any) {
    console.error('❌ Error fetching events:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTicketmaster();
