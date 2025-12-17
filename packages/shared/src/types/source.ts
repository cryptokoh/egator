/**
 * Event data sources
 */
export const SOURCES = [
  'eventbrite',
  'ticketmaster',
  'meetup',
  'yelp',
  'allevents',
  'bandsintown',
  'schema-crawler',
  'user',
] as const;

export type Source = typeof SOURCES[number];
