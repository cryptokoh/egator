'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/discovery/FilterBar';
import { MoodSelector, type Mood } from '@/components/discovery/MoodChip';
import { EventGrid } from '@/components/events/EventCard';
import type { DiscoveredEvent } from '@/lib/api';

// Demo data for initial development
const DEMO_EVENTS: DiscoveredEvent[] = [
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
    neighborhoodName: 'Mission',
    distance: { meters: 600, miles: 0.37, walkingMinutes: 8, bikingMinutes: 2 },
  },
];

type QuickFilter = 'tonight' | 'weekend' | 'holistic' | 'dance' | 'nearby';

export default function HomePage() {
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuickFilter | null>(null);
  const [neighborhood, setNeighborhood] = useState<string>('Mission');

  // Filter events based on selections
  const filteredEvents = DEMO_EVENTS.filter((event) => {
    // Mood filter
    if (selectedMoods.length > 0) {
      const hasMatchingMood = event.vibe.moods.some((m) => selectedMoods.includes(m));
      if (!hasMatchingMood) return false;
    }

    // Quick filter
    if (activeFilter === 'holistic' && !event.vibe.isHolistic) return false;
    if (activeFilter === 'dance' && !event.vibe.isDance) return false;

    return true;
  });

  return (
    <div className="min-h-screen">
      <Header neighborhood={neighborhood} />
      <FilterBar
        activeFilter={activeFilter ?? undefined}
        onFilterChange={setActiveFilter}
        neighborhood={neighborhood}
        onNeighborhoodClick={() => {}}
      />

      <main className="container-app py-8">
        {/* Hero section */}
        <section className="mb-12">
          <h1 className="text-display-sm sm:text-display font-bold text-text-primary mb-4 text-balance">
            Discover events by{' '}
            <span className="bg-gradient-to-r from-accent to-mood-connect bg-clip-text text-transparent">
              vibe
            </span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl">
            Find holistic workshops, dance parties, and community gatherings near you.
            Filter by mood, not category.
          </p>
        </section>

        {/* Mood selector */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-text-tertiary mb-3 uppercase tracking-wide">
            What mood are you in?
          </h2>
          <MoodSelector
            selected={selectedMoods}
            onChange={setSelectedMoods}
          />
        </section>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-text-secondary">
            {filteredEvents.length} events{' '}
            {neighborhood && <span>in {neighborhood}</span>}
          </p>
        </div>

        {/* Event grid */}
        <EventGrid
          events={filteredEvents}
          onEventClick={(event) => console.log('Event clicked:', event)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 mt-16">
        <div className="container-app text-center text-text-tertiary text-sm">
          <p>AIeGator - AI-powered event discovery</p>
        </div>
      </footer>
    </div>
  );
}
