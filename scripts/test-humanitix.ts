import { HumanitixAdapter } from '../packages/adapters/src/humanitix/index.js';

async function testHumanitix() {
  console.log('🎗️  Testing Humanitix API (charity events)\n');

  // No API key needed for public searches
  const adapter = new HumanitixAdapter({});

  console.log('Configured:', adapter.isConfigured());

  try {
    console.log('\nFetching events in San Francisco...\n');

    const result = await adapter.fetch({
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      },
      limit: 20,
    });

    console.log(`✅ Found ${result.events.length} raw events`);
    console.log(`📄 Has more: ${result.hasMore}`);

    if (result.events.length > 0) {
      console.log('\n--- Sample Events ---\n');

      for (const raw of result.events.slice(0, 5)) {
        const normalized = adapter.normalize(raw);
        console.log(`🎗️  ${normalized.name}`);
        console.log(`   📍 ${normalized.venue?.name ?? 'Online'} - ${normalized.venue?.city ?? ''}`);
        console.log(`   🗓️  ${normalized.startDate.toLocaleDateString()}`);
        if (normalized.rawData && (normalized.rawData as any).charityPartner) {
          console.log(`   💝 Charity: ${(normalized.rawData as any).charityPartner.name}`);
        }
        console.log(`   💰 ${normalized.isFree ? 'Free' : normalized.priceMin ? `$${normalized.priceMin}` : 'See tickets'}`);
        console.log('');
      }
    } else {
      // Try broader search
      console.log('No results for SF, trying California...\n');

      const caResult = await adapter.fetch({
        location: {
          state: 'CA',
          country: 'US',
        },
        limit: 10,
      });

      console.log(`Found ${caResult.events.length} events in California`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    // Check if it's a DNS/connection issue
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  API endpoint might not be publicly accessible');
      console.log('   Humanitix may require partnership for API access');
    }
  }
}

testHumanitix();
