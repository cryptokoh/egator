/**
 * Holistic vertical - wellness, mindfulness, healing events
 * "For slowing down, going inward, and healing"
 */

export const HOLISTIC_TAGS = [
  // Movement
  'yoga',
  'yoga-vinyasa',
  'yoga-yin',
  'yoga-restorative',
  'yoga-kundalini',
  'yoga-hot',
  'qigong',
  'tai-chi',

  // Stillness
  'meditation',
  'breathwork',
  'mindfulness',

  // Sound
  'sound-bath',
  'gong-ceremony',
  'kirtan',
  'mantra',

  // Ceremony
  'cacao-ceremony',
  'tea-ceremony',
  'moon-circle',
  'new-moon',
  'full-moon',
  'equinox',
  'solstice',

  // Healing
  'reiki',
  'energy-healing',
  'acupuncture',
  'massage',
  'bodywork',

  // Plant
  'plant-medicine',
  'microdosing',
  'integration',

  // Community
  'conscious-community',
  'mens-circle',
  'womens-circle',
  'sharing-circle',

  // Retreat
  'retreat',
  'day-retreat',
  'wellness-retreat',
  'silent-retreat',

  // Other
  'ecstatic-dance', // overlaps with dance
  'contact-improv', // overlaps with dance
  'tantra',
  'sensory-deprivation',
  'cold-plunge',
  'sauna',
] as const;

export type HolisticTag = typeof HOLISTIC_TAGS[number];

// Holistic tag groupings for UI
export const HOLISTIC_TAG_GROUPS: Record<string, HolisticTag[]> = {
  'Movement': ['yoga', 'yoga-vinyasa', 'yoga-yin', 'yoga-restorative', 'yoga-kundalini', 'yoga-hot', 'qigong', 'tai-chi'],
  'Stillness': ['meditation', 'breathwork', 'mindfulness'],
  'Sound': ['sound-bath', 'gong-ceremony', 'kirtan', 'mantra'],
  'Ceremony': ['cacao-ceremony', 'tea-ceremony', 'moon-circle', 'new-moon', 'full-moon', 'equinox', 'solstice'],
  'Healing': ['reiki', 'energy-healing', 'acupuncture', 'massage', 'bodywork'],
  'Community': ['conscious-community', 'mens-circle', 'womens-circle', 'sharing-circle'],
  'Retreat': ['retreat', 'day-retreat', 'wellness-retreat', 'silent-retreat'],
};

// Keywords for AI classification
export const HOLISTIC_KEYWORDS: Record<HolisticTag, string[]> = {
  'yoga': ['yoga', 'asana', 'flow', 'mat'],
  'yoga-vinyasa': ['vinyasa', 'power yoga', 'flow yoga'],
  'yoga-yin': ['yin yoga', 'yin', 'passive stretching'],
  'yoga-restorative': ['restorative', 'gentle yoga', 'supported'],
  'yoga-kundalini': ['kundalini', 'kriya', 'chakra'],
  'yoga-hot': ['hot yoga', 'bikram', 'heated'],
  'qigong': ['qigong', 'qi gong', 'chi kung'],
  'tai-chi': ['tai chi', 'taichi', 'tai ji'],
  'meditation': ['meditation', 'meditate', 'sit', 'stillness'],
  'breathwork': ['breathwork', 'breath work', 'holotropic', 'pranayama', 'wim hof'],
  'mindfulness': ['mindfulness', 'mindful', 'present moment', 'awareness'],
  'sound-bath': ['sound bath', 'sound healing', 'singing bowls', 'crystal bowls'],
  'gong-ceremony': ['gong', 'gong bath', 'gong meditation'],
  'kirtan': ['kirtan', 'chanting', 'bhakti'],
  'mantra': ['mantra', 'japa', 'chant'],
  'cacao-ceremony': ['cacao', 'ceremonial cacao', 'heart opening'],
  'tea-ceremony': ['tea ceremony', 'gongfu', 'chado'],
  'moon-circle': ['moon circle', 'lunar', 'moon gathering'],
  'new-moon': ['new moon', 'dark moon', 'intention setting'],
  'full-moon': ['full moon', 'luna', 'moon ritual'],
  'equinox': ['equinox', 'spring equinox', 'fall equinox'],
  'solstice': ['solstice', 'summer solstice', 'winter solstice'],
  'reiki': ['reiki', 'energy healing', 'hands on healing'],
  'energy-healing': ['energy work', 'energy healing', 'chakra balancing'],
  'acupuncture': ['acupuncture', 'acupressure', 'tcm'],
  'massage': ['massage', 'bodywork', 'thai massage'],
  'bodywork': ['bodywork', 'somatic', 'rolfing'],
  'plant-medicine': ['plant medicine', 'ayahuasca', 'psilocybin', 'ceremony'],
  'microdosing': ['microdosing', 'microdose'],
  'integration': ['integration', 'integration circle'],
  'conscious-community': ['conscious community', 'intentional community'],
  'mens-circle': ["men's circle", 'mens circle', 'brotherhood'],
  'womens-circle': ["women's circle", 'womens circle', 'sisterhood', 'goddess'],
  'sharing-circle': ['sharing circle', 'council', 'talking circle'],
  'retreat': ['retreat', 'getaway'],
  'day-retreat': ['day retreat', 'mini retreat'],
  'wellness-retreat': ['wellness retreat', 'health retreat'],
  'silent-retreat': ['silent retreat', 'vipassana', 'noble silence'],
  'ecstatic-dance': ['ecstatic dance', 'conscious dance', 'free movement'],
  'contact-improv': ['contact improvisation', 'contact improv', 'ci jam'],
  'tantra': ['tantra', 'tantric', 'sacred sexuality'],
  'sensory-deprivation': ['float', 'sensory deprivation', 'isolation tank'],
  'cold-plunge': ['cold plunge', 'ice bath', 'cold exposure'],
  'sauna': ['sauna', 'sweat lodge', 'steam'],
};

// Holistic vertical color
export const HOLISTIC_COLOR = '#7DD3A8'; // sage green
