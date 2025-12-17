import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });

// Demo events data
const DEMO_EVENTS = [
  {
    id: '1',
    title: 'Sunset Yoga in the Park',
    description: 'Join us for a relaxing outdoor yoga session as the sun sets over the city.',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venue: {
      name: 'Dolores Park',
      address: 'Dolores Park, San Francisco',
      lat: 37.7596,
      lng: -122.4269,
    },
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    price: { min: 15, max: 25, currency: 'USD' },
    vibe: {
      moods: ['chill', 'connect'],
      energyLevel: 2,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'evening',
      isHolistic: true,
      isDance: false,
      holisticTags: ['yoga', 'meditation'],
      danceTags: [],
      confidence: 0.9,
    },
    neighborhoodId: 'mission',
    neighborhoodName: 'Mission',
    distance: { meters: 800, miles: 0.5, walkingMinutes: 10, bikingMinutes: 3 },
  },
  {
    id: '2',
    title: 'House Music Night at The Midway',
    description: 'Deep house and techno all night long with resident DJs.',
    startTime: new Date(Date.now() + 172800000).toISOString(),
    venue: {
      name: 'The Midway SF',
      address: '900 Marin St, San Francisco',
      lat: 37.7516,
      lng: -122.3876,
    },
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
    price: { min: 20, max: 35, currency: 'USD' },
    vibe: {
      moods: ['move', 'celebrate'],
      energyLevel: 5,
      soloFriendly: true,
      socialDensity: 'crowd',
      intimacyLevel: 'open',
      timeVibe: 'late-night',
      isHolistic: false,
      isDance: true,
      holisticTags: [],
      danceTags: ['house', 'techno', 'dj-set'],
      confidence: 0.95,
    },
    neighborhoodId: 'dogpatch',
    neighborhoodName: 'Dogpatch',
    distance: { meters: 2400, miles: 1.5, walkingMinutes: 30, bikingMinutes: 10 },
  },
  {
    id: '3',
    title: 'Sound Bath & Meditation',
    description: 'Immerse yourself in healing sounds of crystal bowls and gongs.',
    startTime: new Date(Date.now() + 259200000).toISOString(),
    venue: {
      name: 'Grace Cathedral',
      address: '1100 California St, San Francisco',
      lat: 37.7921,
      lng: -122.4128,
    },
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800',
    price: { min: 30, max: 30, currency: 'USD' },
    vibe: {
      moods: ['chill', 'explore'],
      energyLevel: 1,
      soloFriendly: true,
      socialDensity: 'solo',
      intimacyLevel: 'sacred',
      timeVibe: 'evening',
      isHolistic: true,
      isDance: false,
      holisticTags: ['sound-bath', 'meditation', 'healing-circle'],
      danceTags: [],
      confidence: 0.92,
    },
    neighborhoodId: 'nob-hill',
    neighborhoodName: 'Nob Hill',
  },
  {
    id: '4',
    title: 'Salsa Social: Beginner Friendly',
    description: 'Learn to dance salsa! Lesson at 8pm, social dancing until midnight.',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venue: {
      name: 'The Cigar Bar & Grill',
      address: '850 Montgomery St, San Francisco',
      lat: 37.7969,
      lng: -122.4033,
    },
    imageUrl: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
    price: { min: 15, max: 15, currency: 'USD' },
    vibe: {
      moods: ['move', 'connect'],
      energyLevel: 4,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'evening',
      isHolistic: false,
      isDance: true,
      holisticTags: [],
      danceTags: ['salsa'],
      confidence: 0.88,
    },
    neighborhoodId: 'north-beach',
    neighborhoodName: 'North Beach',
    distance: { meters: 1200, miles: 0.75, walkingMinutes: 15, bikingMinutes: 5 },
  },
  {
    id: '5',
    title: 'Creative Writing Workshop',
    description: 'Explore your creativity through guided writing exercises and peer feedback.',
    startTime: new Date(Date.now() + 345600000).toISOString(),
    venue: {
      name: 'City Lights Bookstore',
      address: '261 Columbus Ave, San Francisco',
      lat: 37.7977,
      lng: -122.4066,
    },
    imageUrl: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800',
    price: { min: 25, max: 25, currency: 'USD' },
    vibe: {
      moods: ['create', 'learn'],
      energyLevel: 2,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'intimate',
      timeVibe: 'afternoon',
      isHolistic: false,
      isDance: false,
      holisticTags: [],
      danceTags: [],
      confidence: 0.85,
    },
    neighborhoodId: 'north-beach',
    neighborhoodName: 'North Beach',
  },
  {
    id: '6',
    title: 'Ecstatic Dance Journey',
    description: 'A sober, free-form dance experience. No talking on the dance floor.',
    startTime: new Date(Date.now() + 172800000).toISOString(),
    venue: {
      name: 'Dance Mission Theater',
      address: '3316 24th St, San Francisco',
      lat: 37.7523,
      lng: -122.4181,
    },
    imageUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800',
    price: { min: 20, max: 35, currency: 'USD' },
    vibe: {
      moods: ['move', 'explore', 'chill'],
      energyLevel: 4,
      soloFriendly: true,
      socialDensity: 'crowd',
      intimacyLevel: 'community',
      timeVibe: 'morning',
      isHolistic: true,
      isDance: true,
      holisticTags: ['ceremony'],
      danceTags: ['ecstatic-dance'],
      confidence: 0.94,
    },
    neighborhoodId: 'mission',
    neighborhoodName: 'Mission',
    distance: { meters: 600, miles: 0.37, walkingMinutes: 8, bikingMinutes: 2 },
  },
  // Humanitix events (charity-focused platform)
  {
    id: '7',
    title: 'Community Breathwork Circle',
    description: 'A guided breathwork session supporting mental health awareness. All proceeds go to local mental health nonprofits.',
    startTime: new Date(Date.now() + 432000000).toISOString(),
    venue: {
      name: 'The Center SF',
      address: '548 Fillmore St, San Francisco',
      lat: 37.7762,
      lng: -122.4315,
    },
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    price: { min: 25, max: 45, currency: 'USD' },
    vibe: {
      moods: ['chill', 'connect', 'explore'],
      energyLevel: 2,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'intimate',
      timeVibe: 'evening',
      isHolistic: true,
      isDance: false,
      holisticTags: ['breathwork', 'healing-circle', 'conscious-community'],
      danceTags: [],
      confidence: 0.91,
    },
    neighborhoodId: 'castro',
    neighborhoodName: 'Castro',
    source: 'humanitix',
    charityPartner: { name: 'SF Mental Health Foundation' },
  },
  {
    id: '8',
    title: 'Bachata & Salsa Fundraiser Night',
    description: 'Dance the night away while supporting youth arts programs. Beginner lesson included!',
    startTime: new Date(Date.now() + 518400000).toISOString(),
    venue: {
      name: 'SOMArts Cultural Center',
      address: '934 Brannan St, San Francisco',
      lat: 37.7722,
      lng: -122.4058,
    },
    imageUrl: 'https://images.unsplash.com/photo-1545959570-a94084071b5a?w=800',
    price: { min: 30, max: 50, currency: 'USD' },
    vibe: {
      moods: ['move', 'connect', 'celebrate'],
      energyLevel: 4,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'evening',
      isHolistic: false,
      isDance: true,
      holisticTags: [],
      danceTags: ['bachata', 'salsa'],
      confidence: 0.89,
    },
    neighborhoodId: 'soma',
    neighborhoodName: 'SoMa',
    source: 'humanitix',
    charityPartner: { name: 'Youth Arts SF' },
  },
  {
    id: '9',
    title: 'Sunrise Yoga & Ocean Swim',
    description: 'Start your weekend with beachside yoga followed by a guided ocean swim. Supporting ocean conservation.',
    startTime: new Date(Date.now() + 604800000).toISOString(),
    venue: {
      name: 'Ocean Beach',
      address: 'Ocean Beach, San Francisco',
      lat: 37.7594,
      lng: -122.5107,
    },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    price: { min: 20, max: 20, currency: 'USD' },
    vibe: {
      moods: ['move', 'chill', 'explore'],
      energyLevel: 3,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'open',
      timeVibe: 'morning',
      isHolistic: true,
      isDance: false,
      holisticTags: ['yoga', 'mindfulness'],
      danceTags: [],
      confidence: 0.88,
    },
    neighborhoodId: 'outer-sunset',
    neighborhoodName: 'Outer Sunset',
    source: 'humanitix',
    charityPartner: { name: 'Surfrider Foundation' },
  },
  // ClassPass events (fitness/wellness platform)
  {
    id: '10',
    title: 'Vinyasa Flow Yoga',
    description: 'Dynamic vinyasa class linking breath with movement. All levels welcome.',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venue: {
      name: 'YogaWorks Castro',
      address: '2215 Market St, San Francisco',
      lat: 37.7649,
      lng: -122.4319,
    },
    imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800',
    price: { min: 12, max: 12, currency: 'credits' },
    vibe: {
      moods: ['chill', 'move'],
      energyLevel: 3,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'morning',
      isHolistic: true,
      isDance: false,
      holisticTags: ['yoga', 'vinyasa', 'mindfulness'],
      danceTags: [],
      confidence: 0.92,
    },
    neighborhoodId: 'castro',
    neighborhoodName: 'Castro',
    source: 'classpass',
    distance: { meters: 1000, miles: 0.62, walkingMinutes: 12, bikingMinutes: 4 },
  },
  {
    id: '11',
    title: 'High Intensity Spin Class',
    description: 'Heart-pumping 45-minute ride with energizing music and motivating instructors.',
    startTime: new Date(Date.now() + 172800000).toISOString(),
    venue: {
      name: 'SoulCycle SOMA',
      address: '1 Embarcadero Center, San Francisco',
      lat: 37.7951,
      lng: -122.3998,
    },
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    price: { min: 18, max: 18, currency: 'credits' },
    vibe: {
      moods: ['move', 'celebrate'],
      energyLevel: 5,
      soloFriendly: true,
      socialDensity: 'crowd',
      intimacyLevel: 'open',
      timeVibe: 'morning',
      isHolistic: false,
      isDance: false,
      holisticTags: [],
      danceTags: [],
      confidence: 0.88,
    },
    neighborhoodId: 'soma',
    neighborhoodName: 'SoMa',
    source: 'classpass',
    distance: { meters: 2000, miles: 1.24, walkingMinutes: 25, bikingMinutes: 8 },
  },
  {
    id: '12',
    title: 'Pilates Mat Fundamentals',
    description: 'Build core strength and improve posture with classical Pilates techniques.',
    startTime: new Date(Date.now() + 259200000).toISOString(),
    venue: {
      name: 'Club Pilates Marina',
      address: '2044 Chestnut St, San Francisco',
      lat: 37.8003,
      lng: -122.4378,
    },
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
    price: { min: 10, max: 10, currency: 'credits' },
    vibe: {
      moods: ['chill', 'learn'],
      energyLevel: 2,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'afternoon',
      isHolistic: true,
      isDance: false,
      holisticTags: ['pilates', 'core-strength'],
      danceTags: [],
      confidence: 0.90,
    },
    neighborhoodId: 'marina',
    neighborhoodName: 'Marina',
    source: 'classpass',
  },
  {
    id: '13',
    title: 'Beginner Hip Hop Dance',
    description: 'Learn the latest hip hop moves in a fun, judgment-free environment.',
    startTime: new Date(Date.now() + 345600000).toISOString(),
    venue: {
      name: 'ODC Dance Commons',
      address: '351 Shotwell St, San Francisco',
      lat: 37.7599,
      lng: -122.4152,
    },
    imageUrl: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800',
    price: { min: 14, max: 14, currency: 'credits' },
    vibe: {
      moods: ['move', 'learn', 'connect'],
      energyLevel: 4,
      soloFriendly: true,
      socialDensity: 'social',
      intimacyLevel: 'community',
      timeVibe: 'evening',
      isHolistic: false,
      isDance: true,
      holisticTags: [],
      danceTags: ['hip-hop', 'beginner-friendly'],
      confidence: 0.91,
    },
    neighborhoodId: 'mission',
    neighborhoodName: 'Mission',
    source: 'classpass',
    distance: { meters: 500, miles: 0.31, walkingMinutes: 6, bikingMinutes: 2 },
  },
];

// Demo neighborhoods
const DEMO_NEIGHBORHOODS = [
  { id: 'mission', name: 'Mission', slug: 'mission', city: 'San Francisco', country: 'USA' },
  { id: 'dogpatch', name: 'Dogpatch', slug: 'dogpatch', city: 'San Francisco', country: 'USA' },
  { id: 'nob-hill', name: 'Nob Hill', slug: 'nob-hill', city: 'San Francisco', country: 'USA' },
  { id: 'north-beach', name: 'North Beach', slug: 'north-beach', city: 'San Francisco', country: 'USA' },
  { id: 'soma', name: 'SoMa', slug: 'soma', city: 'San Francisco', country: 'USA' },
  { id: 'castro', name: 'Castro', slug: 'castro', city: 'San Francisco', country: 'USA' },
  { id: 'outer-sunset', name: 'Outer Sunset', slug: 'outer-sunset', city: 'San Francisco', country: 'USA' },
  { id: 'marina', name: 'Marina', slug: 'marina', city: 'San Francisco', country: 'USA' },
];

async function main() {
  // Register CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Discovery endpoints
  fastify.post('/api/v1/discover', async (request) => {
    const body = request.body as any;
    let events = [...DEMO_EVENTS];

    // Filter by moods
    if (body.moods?.length > 0) {
      events = events.filter(e => e.vibe.moods.some((m: string) => body.moods.includes(m)));
    }

    // Filter by holistic
    if (body.isHolistic === true) {
      events = events.filter(e => e.vibe.isHolistic);
    }

    // Filter by dance
    if (body.isDance === true) {
      events = events.filter(e => e.vibe.isDance);
    }

    // Filter by neighborhood
    if (body.location?.neighborhoodId) {
      events = events.filter(e => e.neighborhoodId === body.location.neighborhoodId);
    }

    return { events };
  });

  fastify.get('/api/v1/discover/tonight', async () => {
    const tonight = DEMO_EVENTS.filter(e => {
      const eventDate = new Date(e.startTime);
      const now = new Date();
      return eventDate.toDateString() === now.toDateString();
    });
    return { events: tonight.length > 0 ? tonight : DEMO_EVENTS.slice(0, 3) };
  });

  fastify.get('/api/v1/discover/weekend', async () => {
    return { events: DEMO_EVENTS.slice(0, 4) };
  });

  fastify.get('/api/v1/discover/holistic', async () => {
    return { events: DEMO_EVENTS.filter(e => e.vibe.isHolistic) };
  });

  fastify.get('/api/v1/discover/dance', async () => {
    return { events: DEMO_EVENTS.filter(e => e.vibe.isDance) };
  });

  fastify.get('/api/v1/discover/mood/:mood', async (request) => {
    const { mood } = request.params as { mood: string };
    return { events: DEMO_EVENTS.filter(e => e.vibe.moods.includes(mood)) };
  });

  fastify.get('/api/v1/discover/nearby', async () => {
    return { events: DEMO_EVENTS.filter(e => e.distance) };
  });

  fastify.get('/api/v1/discover/neighborhood/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { events: DEMO_EVENTS.filter(e => e.neighborhoodId === id) };
  });

  fastify.get('/api/v1/discover/for-you', async () => {
    return { events: DEMO_EVENTS.slice(0, 4) };
  });

  // Neighborhood endpoints
  fastify.get('/api/v1/neighborhoods', async (request) => {
    const { city } = request.query as { city?: string };
    const neighborhoods = city
      ? DEMO_NEIGHBORHOODS.filter(n => n.city.toLowerCase() === city.toLowerCase())
      : DEMO_NEIGHBORHOODS;
    return { neighborhoods };
  });

  fastify.get('/api/v1/neighborhoods/:id', async (request) => {
    const { id } = request.params as { id: string };
    const neighborhood = DEMO_NEIGHBORHOODS.find(n => n.id === id);
    return { neighborhood };
  });

  fastify.get('/api/v1/neighborhoods/nearby', async () => {
    return { neighborhoods: DEMO_NEIGHBORHOODS.slice(0, 3) };
  });

  fastify.get('/api/v1/neighborhoods/locate', async () => {
    return { neighborhood: DEMO_NEIGHBORHOODS[0] };
  });

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🐊 AIeGator Mock API running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
