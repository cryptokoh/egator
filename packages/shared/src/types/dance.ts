/**
 * Dance vertical - movement, rhythm, expression events
 * "For moving your body and feeling alive"
 */

export const DANCE_TAGS = [
  // Social Dance
  'salsa',
  'bachata',
  'kizomba',
  'zouk',
  'swing',
  'lindy-hop',
  'west-coast-swing',
  'tango',
  'blues',
  'fusion',
  'ballroom',

  // Conscious Movement
  'ecstatic-dance',
  '5rhythms',
  'soul-motion',
  'open-floor',
  'biodanza',
  'nia',
  'contact-improv',

  // Club / Electronic
  'club',
  'dj-set',
  'house',
  'techno',
  'disco',
  'afrobeats',
  'reggaeton',

  // Classes
  'dance-class',
  'hip-hop',
  'contemporary',
  'ballet',
  'jazz',
  'street-dance',
  'breaking',
  'popping',
  'locking',
  'voguing',
  'waacking',
  'heels',

  // Cultural
  'african-dance',
  'samba',
  'flamenco',
  'belly-dance',
  'bollywood',
  'latin',

  // Events
  'dance-party',
  'silent-disco',
  'rave',
  'dance-battle',
  'showcase',
  'social-dance',
  'practica',
  'milonga',

  // Specialty
  'partner-dance',
  'solo-dance',
  'freestyle',
  'choreography',
  'improv',
] as const;

export type DanceTag = typeof DANCE_TAGS[number];

// Dance tag groupings for UI
export const DANCE_TAG_GROUPS: Record<string, DanceTag[]> = {
  'Latin': ['salsa', 'bachata', 'kizomba', 'zouk', 'samba', 'reggaeton', 'latin'],
  'Swing & Blues': ['swing', 'lindy-hop', 'west-coast-swing', 'blues', 'fusion'],
  'Tango': ['tango', 'milonga', 'practica'],
  'Conscious Movement': ['ecstatic-dance', '5rhythms', 'soul-motion', 'open-floor', 'biodanza', 'nia', 'contact-improv'],
  'Club & Electronic': ['club', 'dj-set', 'house', 'techno', 'disco', 'afrobeats', 'rave', 'silent-disco'],
  'Street & Urban': ['hip-hop', 'street-dance', 'breaking', 'popping', 'locking', 'voguing', 'waacking'],
  'Studio': ['ballet', 'contemporary', 'jazz', 'heels', 'choreography'],
  'World': ['african-dance', 'flamenco', 'belly-dance', 'bollywood'],
};

// Keywords for AI classification
export const DANCE_KEYWORDS: Record<DanceTag, string[]> = {
  'salsa': ['salsa', 'on1', 'on2', 'mambo', 'casino'],
  'bachata': ['bachata', 'sensual bachata', 'dominican bachata'],
  'kizomba': ['kizomba', 'semba', 'urban kiz'],
  'zouk': ['zouk', 'brazilian zouk', 'lambazouk'],
  'swing': ['swing dance', 'swing dancing'],
  'lindy-hop': ['lindy hop', 'lindy', 'charleston'],
  'west-coast-swing': ['west coast swing', 'wcs', 'westie'],
  'tango': ['tango', 'argentine tango'],
  'blues': ['blues dance', 'blues dancing', 'slow dance'],
  'fusion': ['fusion dance', 'fusion dancing', 'cross-style'],
  'ballroom': ['ballroom', 'waltz', 'foxtrot', 'quickstep'],
  'ecstatic-dance': ['ecstatic dance', 'ecstatic', 'conscious dance', 'free dance'],
  '5rhythms': ['5rhythms', '5 rhythms', 'five rhythms'],
  'soul-motion': ['soul motion', 'soulmotion'],
  'open-floor': ['open floor'],
  'biodanza': ['biodanza'],
  'nia': ['nia', 'nia technique'],
  'contact-improv': ['contact improvisation', 'contact improv', 'ci', 'ci jam'],
  'club': ['club night', 'clubbing', 'nightclub'],
  'dj-set': ['dj set', 'dj night', 'live dj'],
  'house': ['house music', 'house night', 'deep house'],
  'techno': ['techno', 'techno night', 'industrial'],
  'disco': ['disco', 'nu disco', 'disco night'],
  'afrobeats': ['afrobeats', 'afro house', 'amapiano'],
  'reggaeton': ['reggaeton', 'perreo', 'dembow'],
  'dance-class': ['dance class', 'dance lesson', 'dance workshop'],
  'hip-hop': ['hip hop', 'hip-hop', 'hiphop'],
  'contemporary': ['contemporary', 'contemporary dance', 'modern dance'],
  'ballet': ['ballet', 'barre'],
  'jazz': ['jazz dance', 'jazz funk'],
  'street-dance': ['street dance', 'street style', 'urban dance'],
  'breaking': ['breaking', 'breakdance', 'bboy', 'bgirl'],
  'popping': ['popping', 'pop', 'animation'],
  'locking': ['locking', 'lock', 'funky'],
  'voguing': ['voguing', 'vogue', 'ballroom'],
  'waacking': ['waacking', 'waack', 'punking'],
  'heels': ['heels', 'heels dance', 'stiletto'],
  'african-dance': ['african dance', 'afro dance', 'west african'],
  'samba': ['samba', 'samba de gafieira', 'brazilian'],
  'flamenco': ['flamenco', 'spanish dance'],
  'belly-dance': ['belly dance', 'bellydance', 'oriental dance'],
  'bollywood': ['bollywood', 'bhangra', 'indian dance'],
  'latin': ['latin dance', 'latin night'],
  'dance-party': ['dance party', 'dance night'],
  'silent-disco': ['silent disco', 'silent party', 'headphone party'],
  'rave': ['rave', 'warehouse party', 'underground'],
  'dance-battle': ['dance battle', 'battle', 'competition'],
  'showcase': ['showcase', 'performance', 'show'],
  'social-dance': ['social dance', 'social dancing', 'social'],
  'practica': ['practica', 'practice session'],
  'milonga': ['milonga', 'tango social'],
  'partner-dance': ['partner dance', 'couples dance', 'lead follow'],
  'solo-dance': ['solo', 'solo dance', 'solo movement'],
  'freestyle': ['freestyle', 'free style', 'improv'],
  'choreography': ['choreography', 'choreo', 'routine'],
  'improv': ['improv', 'improvisation', 'spontaneous'],
};

// Dance vertical color
export const DANCE_COLOR = '#F472B6'; // warm pink
