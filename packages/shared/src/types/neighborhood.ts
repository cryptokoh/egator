/**
 * Neighborhood API types
 * For hyper-local event discovery
 */

/**
 * GeoJSON types for neighborhood boundaries
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // Array of rings, each ring is array of [lng, lat]
}

/**
 * A neighborhood definition
 */
export interface Neighborhood {
  id: string;
  slug: string;                  // URL-friendly: "mission-district"
  name: string;                  // Display: "Mission District"
  shortName?: string;            // Short: "The Mission"

  // Location
  city: string;
  state?: string;
  country: string;

  // Geography
  boundary: GeoJSONPolygon;      // Neighborhood boundary
  center: GeoJSONPoint;          // Centroid for distance calc
  areaSqMiles?: number;

  // Character
  vibe?: string;                 // "Creative, diverse, late-night energy"
  knownFor?: string[];           // ["tacos", "murals", "nightlife"]
  neighborhoodType?: 'residential' | 'commercial' | 'mixed' | 'entertainment' | 'cultural';

  // Related
  adjacentNeighborhoods?: string[]; // IDs of neighboring areas
  parentArea?: string;           // e.g., "South of Market" for "SoMa"
}

/**
 * User's saved neighborhoods
 */
export interface UserNeighborhood {
  userId: string;
  neighborhoodId: string;

  // Relationship type
  type: 'home' | 'work' | 'favorite' | 'frequent';

  // Preferences
  walkingRadiusMinutes: 5 | 10 | 15 | 20 | 30;
  notificationsEnabled: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Walking distance presets
 */
export const WALKING_PRESETS = {
  5: { label: '5 min walk', meters: 400, icon: '🚶' },
  10: { label: '10 min walk', meters: 800, icon: '🚶' },
  15: { label: '15 min walk', meters: 1200, icon: '🚶' },
  20: { label: '20 min walk', meters: 1600, icon: '🚶' },
  30: { label: '30 min / bike', meters: 2400, icon: '🚴' },
} as const;

export type WalkingMinutes = keyof typeof WALKING_PRESETS;

/**
 * Location query options
 */
export interface LocationQuery {
  // Option 1: By neighborhood ID
  neighborhoodId?: string;

  // Option 2: By coordinates + radius
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  radiusMiles?: number;

  // Option 3: By city name (broader)
  city?: string;

  // Option 4: By user's saved neighborhoods
  userNeighborhoods?: ('home' | 'work' | 'favorite' | 'all')[];
}

/**
 * Event with distance information
 */
export interface EventWithDistance {
  eventId: string;
  distanceMeters: number;
  distanceMiles: number;
  walkingMinutes: number;
  bikingMinutes: number;
  neighborhoodId?: string;
  neighborhoodName?: string;
}

/**
 * Neighborhood statistics
 */
export interface NeighborhoodStats {
  neighborhoodId: string;
  totalEvents: number;
  upcomingEvents: number;
  eventsTonight: number;
  eventsThisWeek: number;

  // By vertical
  holisticEvents: number;
  danceEvents: number;

  // Popular moods in this area
  topMoods: { mood: string; count: number }[];

  // Active hours
  peakHours: { hour: number; avgEvents: number }[];
}

/**
 * San Francisco neighborhoods (initial set)
 * Will be stored in database, but defined here for reference
 */
export const SF_NEIGHBORHOODS = [
  'mission',
  'castro',
  'haight',
  'soma',
  'hayes-valley',
  'marina',
  'north-beach',
  'chinatown',
  'noe-valley',
  'potrero-hill',
  'dogpatch',
  'richmond',
  'sunset',
  'tenderloin',
  'financial-district',
  'pacific-heights',
  'lower-haight',
  'inner-richmond',
  'inner-sunset',
  'glen-park',
] as const;

export type SFNeighborhood = typeof SF_NEIGHBORHOODS[number];
