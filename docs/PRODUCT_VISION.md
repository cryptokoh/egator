# AIeGator Product Vision

## The Problem

Event discovery is broken:

1. **Too Much Noise** — Eventbrite shows 10,000 events. Which 3 matter to you?
2. **No Soul** — Algorithms optimize for clicks, not meaningful experiences
3. **Category Prison** — "Sports" vs "Wellness" when you just want to move your body
4. **No Community** — Transactional platforms, no sense of who's there
5. **City-Scale Thinking** — SF is 47 sq miles. Your life is 3 neighborhoods.

## The Insight

> People don't want events. They want **experiences that match their current state**.

The question isn't "What's happening?"
It's "What do I need right now?"

## Core Product Principles

### 1. Curated Over Comprehensive
Better to show 5 perfect events than 500 mediocre ones.
Quality is the product.

### 2. Mood Over Category
Not "dance events" → "I want to move my body"
Not "wellness" → "I need to slow down"
Not "networking" → "I want to meet interesting people"

### 3. Neighborhood Over City
Your life happens in 3-5 neighborhoods.
Walking distance changes everything.
"10 min from home" > "In San Francisco"

### 4. Now Over Later
Tonight matters more than next month.
Spontaneity is a feature.
Last-minute discovery is magic.

### 5. Community Over Content
Who's going > What's happening
Trust networks > Algorithms
"People like you" > "Popular events"

### 6. Calm Over Anxious
No red badges. No FOMO manipulation.
Events are invitations, not obligations.
Missing out is fine.

---

## The Three Verticals

### 🌿 Holistic
*For slowing down, going inward, and healing*

**Event Types:**
- Yoga (all styles)
- Meditation & breathwork
- Sound baths & gong ceremonies
- Ecstatic dance
- Cacao ceremonies
- Plant medicine (where legal)
- Reiki & energy healing
- Moon circles
- Wellness retreats
- Conscious community gatherings

**Vibe Keywords:** grounding, healing, sacred, intimate, transformative, gentle, ceremonial, contemplative

**Target Mood:** "I need to slow down" / "I want to go deeper"

---

### 💃 Dance
*For moving your body and feeling alive*

**Event Types:**
- Social dance (salsa, bachata, swing, tango, zouk)
- Ecstatic dance & conscious movement
- Club nights & DJ sets
- Dance classes & workshops
- Silent discos
- Rave & electronic events
- Dance battles & competitions
- African dance, house, voguing
- Contact improvisation

**Vibe Keywords:** energetic, sweaty, liberating, social, rhythmic, expressive, late-night, euphoric

**Target Mood:** "I want to move" / "I need to let go"

---

### 🏘️ Neighborhood
*For hyper-local discovery*

**Core Concept:**
Events within walking/biking distance. Not "San Francisco" but "your corner of the Mission."

**Features:**
- Define your neighborhoods (home, work, third place)
- Walkability radius (5, 10, 15, 20 min)
- "What's happening on my block"
- Neighborhood personality profiles
- Local curator spotlights

---

## Mood-Based Discovery

Replace rigid categories with fluid moods:

| Mood | Feeling | Event Types |
|------|---------|-------------|
| **Move** | "I need to get out of my head" | Dance, yoga, sports, hiking |
| **Chill** | "I want to slow down" | Sound baths, meditation, gentle yoga |
| **Connect** | "I want to meet people" | Networking, social dance, community |
| **Learn** | "I want to grow" | Workshops, classes, talks |
| **Celebrate** | "I want to let loose" | Parties, concerts, festivals |
| **Create** | "I want to make something" | Art, music, writing workshops |
| **Explore** | "I'm curious" | Tours, pop-ups, new experiences |

**AI Mapping:**
Events are tagged with 1-3 moods via:
- Keyword analysis
- Time of day patterns
- Venue type signals
- Community feedback

---

## Vibe System

Every event has a vibe profile:

### Energy Level (1-5)
1. 🧘 Contemplative (meditation, yin yoga)
2. 🌊 Gentle (restorative, sound baths)
3. ⚡ Moderate (vinyasa, social dance class)
4. 🔥 Energetic (ecstatic dance, club night)
5. 💥 High-intensity (rave, competition)

### Social Density
- 👤 Solo-friendly (drop in alone, totally fine)
- 👥 Partner-friendly (bring someone, but not required)
- 👯 Social (you'll meet people)
- 🎉 Crowd (big group energy)

### Intimacy Level
- 🌐 Open (anyone welcome, casual)
- 🏠 Community (regulars, familiar faces)
- 🔐 Intimate (small group, personal)
- ✨ Sacred (ceremonial, held space)

### Time Vibe
- ☀️ Morning (6am-12pm)
- 🌤️ Afternoon (12pm-6pm)
- 🌆 Evening (6pm-10pm)
- 🌙 Late night (10pm+)

---

## User Experience Flows

### 1. The "Right Now" Flow
```
[Open app at 7pm Friday]
     ↓
"What's your vibe tonight?"
  → Move | Chill | Connect | Celebrate
     ↓
[Select: Move]
     ↓
"How much energy do you have?"
  → Low | Medium | High
     ↓
[Shows 3-5 curated events happening TONIGHT within 15 min]
     ↓
[Swipe through cards]
     ↓
[Tap to see details + who's going]
```

### 2. The "This Weekend" Flow
```
[Planning mode]
     ↓
"Show me the weekend"
     ↓
[Saturday / Sunday tabs]
     ↓
[Filtered by your neighborhoods + interests]
     ↓
[Save to personal calendar]
```

### 3. The "Neighborhood" Flow
```
[Tap neighborhood icon]
     ↓
"Your neighborhoods"
  → Home (Mission) | Work (SoMa) | + Add
     ↓
[Select: Mission]
     ↓
[Map view with event pins]
[List view sorted by distance]
     ↓
"5 things happening within 10 min walk"
```

---

## Data Model Extensions

### Event Vibes
```typescript
interface EventVibe {
  // Core moods (1-3 per event)
  moods: ('move' | 'chill' | 'connect' | 'learn' | 'celebrate' | 'create' | 'explore')[];

  // Energy level 1-5
  energyLevel: number;

  // Social characteristics
  soloFriendly: boolean;
  socialDensity: 'solo' | 'partner' | 'social' | 'crowd';
  intimacyLevel: 'open' | 'community' | 'intimate' | 'sacred';

  // Vertical tags
  isHolistic: boolean;
  isDance: boolean;

  // Sub-categories for verticals
  holisticTags?: ('yoga' | 'meditation' | 'breathwork' | 'sound-bath' | 'ceremony' | 'healing' | 'retreat' | 'moon-circle')[];
  danceTags?: ('social-dance' | 'ecstatic' | 'club' | 'class' | 'silent-disco' | 'rave' | 'latin' | 'swing' | 'contact-improv')[];
}
```

### Neighborhoods
```typescript
interface Neighborhood {
  id: string;
  name: string;           // "Mission District"
  city: string;           // "San Francisco"

  // Boundary (GeoJSON polygon)
  boundary: GeoJSON.Polygon;

  // Centroid for distance calculations
  center: { lat: number; lng: number };

  // Personality
  vibe: string;           // "Creative, diverse, late-night energy"
  knownFor: string[];     // ["tacos", "murals", "nightlife", "tech workers"]
}

interface UserNeighborhood {
  userId: string;
  neighborhoodId: string;
  type: 'home' | 'work' | 'favorite';
  walkingRadiusMinutes: number;  // 5, 10, 15, 20
}
```

---

## Design Principles

### Visual Language
- **Dark mode first** — Evening is prime discovery time
- **Card-based UI** — One event at a time, focus attention
- **Rich imagery** — Events are visual, show the vibe
- **Generous whitespace** — Calm, not cluttered
- **Subtle motion** — Smooth transitions, no jarring

### Typography
- **Headlines**: Clean sans-serif, bold but not aggressive
- **Body**: Highly readable, generous line height
- **Accent**: A touch of warmth (not cold/corporate)

### Color System
```
Background:  #0A0A0B (near black)
Surface:     #141416 (cards)
Border:      #2A2A2E (subtle)
Text:        #FAFAFA (primary)
Text Muted:  #8A8A8E (secondary)

Holistic:    #7DD3A8 (sage green)
Dance:       #F472B6 (warm pink)
Mood Colors:
  Move:      #F59E0B (amber)
  Chill:     #8B5CF6 (purple)
  Connect:   #EC4899 (pink)
  Learn:     #3B82F6 (blue)
  Celebrate: #EF4444 (red)
  Create:    #10B981 (emerald)
  Explore:   #F97316 (orange)
```

### Motion
- Page transitions: 200ms ease-out
- Card swipes: spring physics
- Loading states: subtle pulse, not spinner
- Micro-interactions: tactile feedback

---

## Success Metrics

### North Star
**Weekly Active Discoverers** — Users who discover AND attend an event

### Leading Indicators
- Events saved to calendar
- Time spent browsing (quality, not quantity)
- Return visits within 48 hours
- Events attended (self-reported or geo-verified)

### Quality Signals
- "This was exactly what I needed" rating
- Vibe accuracy score (expected vs. experienced)
- Community trust (follows, recommendations)

---

## MVP Scope

### Phase 1: Foundation
- [ ] Holistic + Dance verticals with curated taxonomy
- [ ] Neighborhood boundaries for SF (start with 10 neighborhoods)
- [ ] Mood-based discovery flow
- [ ] Event vibe profiles (AI-inferred + manual curation)
- [ ] Clean, dark-mode-first mobile web UI

### Phase 2: Community
- [ ] User profiles with vibe preferences
- [ ] "Going" / "Interested" signals
- [ ] See who from your network is attending
- [ ] Curator profiles (tastemakers)

### Phase 3: Intelligence
- [ ] Personalized recommendations
- [ ] "Because you went to X" suggestions
- [ ] Vibe learning from attendance patterns
- [ ] Neighborhood personality matching

---

## The AIeGator Promise

> "Find experiences that match your current state, in the neighborhoods you love, curated by people with taste."

Not more events. Better discovery.
Not algorithms. Community wisdom.
Not FOMO. Calm invitation.
