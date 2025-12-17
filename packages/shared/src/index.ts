// Event types
export type {
  Event,
  EventFilters,
  SearchQuery,
  SearchResult,
  Venue,
  Organizer,
  EventImage,
} from './types/event.js';

// API types
export type {
  PaginatedResponse,
  ApiError,
  ApiResponse,
} from './types/api.js';

// Category types
export { CATEGORIES, type Category } from './types/category.js';

// Source types
export { SOURCES, type Source } from './types/source.js';

// Vibe system
export {
  MOODS,
  MOOD_CONFIG,
  ENERGY_LEVELS,
  ENERGY_CONFIG,
  SOCIAL_DENSITIES,
  SOCIAL_DENSITY_CONFIG,
  INTIMACY_LEVELS,
  INTIMACY_CONFIG,
  TIME_VIBES,
  TIME_VIBE_CONFIG,
  type Mood,
  type EnergyLevel,
  type SocialDensity,
  type IntimacyLevel,
  type TimeVibe,
  type EventVibe,
} from './types/vibes.js';

// Holistic vertical
export {
  HOLISTIC_TAGS,
  HOLISTIC_TAG_GROUPS,
  HOLISTIC_KEYWORDS,
  HOLISTIC_COLOR,
  type HolisticTag,
} from './types/holistic.js';

// Dance vertical
export {
  DANCE_TAGS,
  DANCE_TAG_GROUPS,
  DANCE_KEYWORDS,
  DANCE_COLOR,
  type DanceTag,
} from './types/dance.js';

// Neighborhood API
export {
  WALKING_PRESETS,
  SF_NEIGHBORHOODS,
  type Neighborhood,
  type UserNeighborhood,
  type LocationQuery,
  type EventWithDistance,
  type NeighborhoodStats,
  type WalkingMinutes,
  type GeoJSONPoint,
  type GeoJSONPolygon,
} from './types/neighborhood.js';

// Utility types
export type { DeepPartial, Nullable } from './types/utils.js';
