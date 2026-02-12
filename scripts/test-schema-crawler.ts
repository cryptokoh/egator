import { SchemaOrgCrawler } from '../packages/adapters/src/schema-crawler/index.js';

// Sites known to have good schema.org Event markup
const TEST_SITES = [
  // Individual event pages (more likely to have schema.org)
  { name: 'Dice.fm Event', url: 'https://dice.fm/event/prggbv-boiler-room-san-francisco-29th-feb-sf-2024' },
  { name: 'Resident Advisor', url: 'https://ra.co/events/us/sanfrancisco' },

  // Venues with calendars
  { name: 'The Fillmore', url: 'https://www.livenation.com/venue/KovZpZAE6enA/the-fillmore-events' },
  { name: 'Eventbrite SF Dance', url: 'https://www.eventbrite.com/d/ca--san-francisco/dance-classes/' },

  // Test a known working schema.org page
  { name: 'Google Events Test', url: 'https://developers.google.com/search/docs/appearance/structured-data/event' },
];

async function testSchemaCrawler() {
  console.log('🕷️  Testing Schema.org Crawler\n');
  console.log('Crawling SF event sites for structured data...\n');

  const crawler = new SchemaOrgCrawler();
  let totalEvents = 0;

  for (const site of TEST_SITES) {
    console.log(`\n📍 ${site.name}`);
    console.log(`   ${site.url}`);

    try {
      const rawEvents = await crawler.crawlUrl(site.url);
      console.log(`   ✅ Found ${rawEvents.length} events`);

      if (rawEvents.length > 0) {
        totalEvents += rawEvents.length;

        // Show first 3 events from this site
        for (const raw of rawEvents.slice(0, 3)) {
          try {
            const event = crawler.normalize(raw);
            console.log(`\n   🎫 ${event.name}`);
            console.log(`      📅 ${event.startDate.toLocaleDateString()} ${event.startDate.toLocaleTimeString()}`);
            if (event.venue?.name) {
              console.log(`      📍 ${event.venue.name}`);
            }
            if (event.priceMin !== null) {
              console.log(`      💰 $${event.priceMin}${event.priceMax && event.priceMax !== event.priceMin ? `-$${event.priceMax}` : ''}`);
            }
          } catch (e: any) {
            console.log(`      ⚠️ Failed to normalize: ${e.message}`);
          }
        }

        if (rawEvents.length > 3) {
          console.log(`\n   ... and ${rawEvents.length - 3} more events`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Total events found: ${totalEvents}`);
  console.log(`${'='.repeat(50)}\n`);

  // Also try a direct Eventbrite event page (they have good schema.org)
  console.log('\n🎪 Testing Eventbrite event page schema...');
  try {
    const ebEvents = await crawler.crawlUrl('https://www.eventbrite.com/d/ca--san-francisco/yoga/');
    console.log(`   Found ${ebEvents.length} events on Eventbrite search page`);
  } catch (e: any) {
    console.log(`   Note: ${e.message}`);
  }
}

testSchemaCrawler();
