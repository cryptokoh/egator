import 'dotenv/config';
import { LumaAdapter } from '../packages/adapters/src/luma/index.js';

// ETHDenver 2026 Luma calendar IDs
const ETHDENVER_CALENDARS = [
  'cal-VFzfuxD01QUFkSs',   // ETHDenver 2026 Official Side Event Calendar (lu.ma/ethdenver)
  'cal-pJcL21PdduPHgJM',   // ETHDenver 2026 (lu.ma/calendar/cal-pJcL21PdduPHgJM)
  'cal-X3TOThcQU7sSzzZ',   // Based House (lu.ma/BasedHouse)
  'cal-dJSBptlAksJ9HRJ',   // TABASCO @ ETHDenver (lu.ma/tabascoweb3)
  'cal-8lN9EdWEXJSAvkR',   // Sui @ ETH Denver (lu.ma/suiethdenver)
  'cal-bs7P9hDqw2D2g8A',   // Base @ ETHDenver (lu.ma/BaseETHDenver)
  'cal-CrOLYq0GGUyx1d8',   // NEAR @ ETHDenver (lu.ma/NEAR_ETHDenver25)
  'cal-QSbmCSXtpG6Op5N',   // EthDenver Full Event List (lu.ma/ethdenverfeb)
];

async function testLuma() {
  console.log('Testing Luma Adapter — ETHDenver Multi-Calendar Scrape\n');

  const adapter = new LumaAdapter({
    apiKey: process.env.LUMA_API_KEY,
    calendarApiId: ETHDENVER_CALENDARS,
  });

  const mode = process.env.LUMA_API_KEY ? 'paid API' : 'public calendar scrape';
  console.log(`Mode: ${mode}`);
  console.log(`Calendars: ${ETHDENVER_CALENDARS.length}`);
  console.log('Configured:', adapter.isConfigured());

  try {
    console.log('\nFetching from all ETHDenver calendars...\n');

    const result = await adapter.fetch({
      limit: 100,
    });

    console.log(`Found ${result.events.length} unique events (deduplicated across ${ETHDENVER_CALENDARS.length} calendars)`);
    console.log(`Has more: ${result.hasMore}`);

    if (result.events.length > 0) {
      console.log('\n--- ETHDenver 2026 Events ---\n');

      for (const raw of result.events) {
        const n = adapter.normalize(raw);
        const date = n.startDate.toLocaleString('en-US', {
          timeZone: n.timezone ?? 'America/Denver',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        console.log(`📅 ${n.name}`);
        console.log(`   📍 ${n.venue?.city ? `${n.venue.city}, ${n.venue.state}` : (n.isOnline ? 'Online' : 'TBA')}`);
        console.log(`   🗓️  ${date}`);
        if (n.organizer) console.log(`   👤 ${n.organizer.name}`);
        if (n.attendeeCount) console.log(`   👥 ${n.attendeeCount} guests`);
        console.log(`   💰 ${n.isFree ? 'Free' : (n.priceMin ? `$${n.priceMin}` : 'RSVP')}`);
        console.log(`   🔗 ${n.url}`);
        console.log('');
      }

      // Stats
      const cities = new Map<string, number>();
      let freeCount = 0;
      let onlineCount = 0;
      for (const raw of result.events) {
        const n = adapter.normalize(raw);
        const city = n.venue?.city ?? 'Unknown';
        cities.set(city, (cities.get(city) ?? 0) + 1);
        if (n.isFree) freeCount++;
        if (n.isOnline) onlineCount++;
      }

      console.log('--- Stats ---');
      console.log(`Total: ${result.events.length} events`);
      console.log(`Free: ${freeCount} | Online: ${onlineCount}`);
      console.log('By city:', [...cities.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(', '));
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLuma();
