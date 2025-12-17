/**
 * Mood-based discovery system
 * Replaces rigid categories with fluid, emotional states
 */

// Core moods that map to user intent
export const MOODS = [
  'move',      // "I need to get out of my head"
  'chill',     // "I want to slow down"
  'connect',   // "I want to meet people"
  'learn',     // "I want to grow"
  'celebrate', // "I want to let loose"
  'create',    // "I want to make something"
  'explore',   // "I'm curious"
] as const;

export type Mood = typeof MOODS[number];

// Mood metadata for UI
export const MOOD_CONFIG: Record<Mood, {
  label: string;
  prompt: string;
  color: string;
  icon: string;
}> = {
  move: {
    label: 'Move',
    prompt: 'I need to get out of my head',
    color: '#F59E0B', // amber
    icon: '🏃',
  },
  chill: {
    label: 'Chill',
    prompt: 'I want to slow down',
    color: '#8B5CF6', // purple
    icon: '🧘',
  },
  connect: {
    label: 'Connect',
    prompt: 'I want to meet people',
    color: '#EC4899', // pink
    icon: '💫',
  },
  learn: {
    label: 'Learn',
    prompt: 'I want to grow',
    color: '#3B82F6', // blue
    icon: '📚',
  },
  celebrate: {
    label: 'Celebrate',
    prompt: 'I want to let loose',
    color: '#EF4444', // red
    icon: '🎉',
  },
  create: {
    label: 'Create',
    prompt: 'I want to make something',
    color: '#10B981', // emerald
    icon: '🎨',
  },
  explore: {
    label: 'Explore',
    prompt: "I'm curious",
    color: '#F97316', // orange
    icon: '🔍',
  },
};

/**
 * Energy levels for events
 */
export const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
export type EnergyLevel = typeof ENERGY_LEVELS[number];

export const ENERGY_CONFIG: Record<EnergyLevel, {
  label: string;
  icon: string;
  description: string;
}> = {
  1: { label: 'Contemplative', icon: '🧘', description: 'Meditation, yin yoga, deep rest' },
  2: { label: 'Gentle', icon: '🌊', description: 'Restorative, sound baths, slow flow' },
  3: { label: 'Moderate', icon: '⚡', description: 'Vinyasa, social dance class, workshops' },
  4: { label: 'Energetic', icon: '🔥', description: 'Ecstatic dance, club night, vigorous' },
  5: { label: 'High-intensity', icon: '💥', description: 'Rave, competition, peak experience' },
};

/**
 * Social density of events
 */
export const SOCIAL_DENSITIES = ['solo', 'partner', 'social', 'crowd'] as const;
export type SocialDensity = typeof SOCIAL_DENSITIES[number];

export const SOCIAL_DENSITY_CONFIG: Record<SocialDensity, {
  label: string;
  icon: string;
  description: string;
}> = {
  solo: { label: 'Solo-friendly', icon: '👤', description: 'Drop in alone, totally fine' },
  partner: { label: 'Partner-friendly', icon: '👥', description: 'Bring someone, but not required' },
  social: { label: 'Social', icon: '👯', description: "You'll meet people" },
  crowd: { label: 'Crowd', icon: '🎉', description: 'Big group energy' },
};

/**
 * Intimacy level of events
 */
export const INTIMACY_LEVELS = ['open', 'community', 'intimate', 'sacred'] as const;
export type IntimacyLevel = typeof INTIMACY_LEVELS[number];

export const INTIMACY_CONFIG: Record<IntimacyLevel, {
  label: string;
  icon: string;
  description: string;
}> = {
  open: { label: 'Open', icon: '🌐', description: 'Anyone welcome, casual' },
  community: { label: 'Community', icon: '🏠', description: 'Regulars, familiar faces' },
  intimate: { label: 'Intimate', icon: '🔐', description: 'Small group, personal' },
  sacred: { label: 'Sacred', icon: '✨', description: 'Ceremonial, held space' },
};

/**
 * Time vibes for events
 */
export const TIME_VIBES = ['morning', 'afternoon', 'evening', 'late-night'] as const;
export type TimeVibe = typeof TIME_VIBES[number];

export const TIME_VIBE_CONFIG: Record<TimeVibe, {
  label: string;
  icon: string;
  hours: { start: number; end: number };
}> = {
  morning: { label: 'Morning', icon: '☀️', hours: { start: 6, end: 12 } },
  afternoon: { label: 'Afternoon', icon: '🌤️', hours: { start: 12, end: 18 } },
  evening: { label: 'Evening', icon: '🌆', hours: { start: 18, end: 22 } },
  'late-night': { label: 'Late Night', icon: '🌙', hours: { start: 22, end: 6 } },
};

/**
 * Complete vibe profile for an event
 */
export interface EventVibe {
  // Core moods (1-3 per event)
  moods: Mood[];

  // Energy level 1-5
  energyLevel: EnergyLevel;

  // Social characteristics
  soloFriendly: boolean;
  socialDensity: SocialDensity;
  intimacyLevel: IntimacyLevel;

  // Time classification
  timeVibe: TimeVibe;

  // Vertical flags
  isHolistic: boolean;
  isDance: boolean;

  // Confidence score (0-1) for AI-inferred vibes
  confidence: number;

  // Whether manually curated or AI-inferred
  source: 'ai' | 'curated' | 'community';
}
