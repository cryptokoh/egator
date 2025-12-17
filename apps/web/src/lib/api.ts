const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * API client for AIeGator backend
 */

// === Types (inline for frontend isolation) ===

export type Mood = 'move' | 'chill' | 'connect' | 'learn' | 'celebrate' | 'create' | 'explore';
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;
export type SocialDensity = 'solo' | 'partner' | 'social' | 'crowd';
export type IntimacyLevel = 'open' | 'community' | 'intimate' | 'sacred';
export type TimeVibe = 'morning' | 'afternoon' | 'evening' | 'late-night';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface Neighborhood {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  city: string;
  state?: string;
  country: string;
  boundary: GeoJSONPolygon;
  center: GeoJSONPoint;
  areaSqMiles?: number;
  vibe?: string;
  knownFor?: string[];
  neighborhoodType?: 'residential' | 'commercial' | 'mixed' | 'entertainment' | 'cultural';
  adjacentNeighborhoods?: string[];
  parentArea?: string;
}

export interface NeighborhoodStats {
  neighborhoodId: string;
  totalEvents: number;
  upcomingEvents: number;
  eventsTonight: number;
  eventsThisWeek: number;
  holisticEvents: number;
  danceEvents: number;
  topMoods: { mood: string; count: number }[];
  peakHours: { hour: number; avgEvents: number }[];
}

export interface DiscoveredEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  venue?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  imageUrl?: string;
  url?: string;
  price?: {
    min?: number;
    max?: number;
    currency: string;
  };
  vibe: {
    moods: Mood[];
    energyLevel?: EnergyLevel;
    soloFriendly: boolean;
    socialDensity?: SocialDensity;
    intimacyLevel?: IntimacyLevel;
    timeVibe?: TimeVibe;
    isHolistic: boolean;
    isDance: boolean;
    holisticTags: string[];
    danceTags: string[];
    confidence: number;
  };
  distance?: {
    meters: number;
    miles: number;
    walkingMinutes: number;
    bikingMinutes: number;
  };
  neighborhoodId?: string;
  neighborhoodName?: string;
  source?: string;
  charityPartner?: {
    name: string;
    logo?: string;
  };
}

export interface DiscoveryFilters {
  moods?: Mood[];
  energyLevel?: EnergyLevel | EnergyLevel[];
  soloFriendly?: boolean;
  socialDensity?: SocialDensity[];
  intimacyLevel?: IntimacyLevel[];
  timeVibe?: TimeVibe[];
  isHolistic?: boolean;
  isDance?: boolean;
  holisticTags?: string[];
  danceTags?: string[];
  location?: {
    neighborhoodId?: string;
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    city?: string;
  };
  startDate?: string;
  endDate?: string;
  tonight?: boolean;
  thisWeekend?: boolean;
  limit?: number;
  offset?: number;
}

// === API Functions ===

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// === Discovery API ===

export async function discover(filters: DiscoveryFilters): Promise<{ events: DiscoveredEvent[] }> {
  return fetchAPI('/discover', {
    method: 'POST',
    body: JSON.stringify(filters),
  });
}

export async function getTonight(location?: { lat?: number; lng?: number; neighborhoodId?: string }): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (location?.lat) params.set('lat', String(location.lat));
  if (location?.lng) params.set('lng', String(location.lng));
  if (location?.neighborhoodId) params.set('neighborhoodId', location.neighborhoodId);

  return fetchAPI(`/discover/tonight?${params}`);
}

export async function getThisWeekend(location?: { lat?: number; lng?: number; neighborhoodId?: string }): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (location?.lat) params.set('lat', String(location.lat));
  if (location?.lng) params.set('lng', String(location.lng));
  if (location?.neighborhoodId) params.set('neighborhoodId', location.neighborhoodId);

  return fetchAPI(`/discover/weekend?${params}`);
}

export async function getHolisticEvents(options?: {
  tags?: string[];
  location?: { lat?: number; lng?: number; neighborhoodId?: string };
  limit?: number;
}): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (options?.tags?.length) params.set('tags', options.tags.join(','));
  if (options?.location?.lat) params.set('lat', String(options.location.lat));
  if (options?.location?.lng) params.set('lng', String(options.location.lng));
  if (options?.location?.neighborhoodId) params.set('neighborhoodId', options.location.neighborhoodId);
  if (options?.limit) params.set('limit', String(options.limit));

  return fetchAPI(`/discover/holistic?${params}`);
}

export async function getDanceEvents(options?: {
  tags?: string[];
  location?: { lat?: number; lng?: number; neighborhoodId?: string };
  limit?: number;
}): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (options?.tags?.length) params.set('tags', options.tags.join(','));
  if (options?.location?.lat) params.set('lat', String(options.location.lat));
  if (options?.location?.lng) params.set('lng', String(options.location.lng));
  if (options?.location?.neighborhoodId) params.set('neighborhoodId', options.location.neighborhoodId);
  if (options?.limit) params.set('limit', String(options.limit));

  return fetchAPI(`/discover/dance?${params}`);
}

export async function getByMood(mood: Mood, location?: { lat?: number; lng?: number; neighborhoodId?: string }): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (location?.lat) params.set('lat', String(location.lat));
  if (location?.lng) params.set('lng', String(location.lng));
  if (location?.neighborhoodId) params.set('neighborhoodId', location.neighborhoodId);

  return fetchAPI(`/discover/mood/${mood}?${params}`);
}

export async function getNearby(lat: number, lng: number, radius?: number): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set('radius', String(radius));

  return fetchAPI(`/discover/nearby?${params}`);
}

export async function getInNeighborhood(neighborhoodId: string, moods?: Mood[]): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (moods?.length) params.set('moods', moods.join(','));

  return fetchAPI(`/discover/neighborhood/${neighborhoodId}?${params}`);
}

export async function getForYou(userId: string, moods?: Mood[]): Promise<{ events: DiscoveredEvent[] }> {
  const params = new URLSearchParams();
  if (moods?.length) params.set('moods', moods.join(','));

  return fetchAPI(`/discover/for-you?${params}`, {
    headers: {
      'x-user-id': userId,
    },
  });
}

// === Neighborhood API ===

export async function getNeighborhoods(city: string): Promise<{ neighborhoods: Neighborhood[] }> {
  return fetchAPI(`/neighborhoods?city=${encodeURIComponent(city)}`);
}

export async function getNeighborhood(id: string): Promise<{ neighborhood: Neighborhood }> {
  return fetchAPI(`/neighborhoods/${id}`);
}

export async function getNeighborhoodStats(id: string): Promise<{ stats: NeighborhoodStats }> {
  return fetchAPI(`/neighborhoods/${id}/stats`);
}

export async function getNearbyNeighborhoods(lat: number, lng: number, radius?: number): Promise<{ neighborhoods: Neighborhood[] }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radius) params.set('radius', String(radius));

  return fetchAPI(`/neighborhoods/nearby?${params}`);
}

export async function locateNeighborhood(lat: number, lng: number): Promise<{ neighborhood: Neighborhood | null }> {
  return fetchAPI(`/neighborhoods/locate?lat=${lat}&lng=${lng}`);
}
