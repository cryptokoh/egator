/**
 * Event category taxonomy
 */
export const CATEGORIES = [
  'music',
  'tech',
  'sports',
  'arts',
  'food',
  'networking',
  'wellness',
  'education',
  'community',
  'outdoor',
  'nightlife',
  'family',
  'business',
  'charity',
  'other',
] as const;

export type Category = typeof CATEGORIES[number];
