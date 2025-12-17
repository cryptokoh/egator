import Anthropic from '@anthropic-ai/sdk';
import {
  MOODS,
  MOOD_CONFIG,
  ENERGY_LEVELS,
  SOCIAL_DENSITIES,
  INTIMACY_LEVELS,
  TIME_VIBES,
  HOLISTIC_KEYWORDS,
  HOLISTIC_TAGS,
  DANCE_KEYWORDS,
  DANCE_TAGS,
  type Mood,
  type EnergyLevel,
  type SocialDensity,
  type IntimacyLevel,
  type TimeVibe,
  type HolisticTag,
  type DanceTag,
  type EventVibe,
} from '@aiegator/shared';

/**
 * Input event data for classification
 */
export interface EventInput {
  title: string;
  description?: string;
  category?: string;
  venueName?: string;
  startTime?: Date;
  tags?: string[];
}

/**
 * Classified vibe output
 */
export interface ClassifiedVibe {
  moods: Mood[];
  energyLevel: EnergyLevel;
  soloFriendly: boolean;
  socialDensity: SocialDensity;
  intimacyLevel: IntimacyLevel;
  timeVibe: TimeVibe;
  isHolistic: boolean;
  isDance: boolean;
  holisticTags: HolisticTag[];
  danceTags: DanceTag[];
  confidence: number;
}

/**
 * VibeClassifier
 * AI-powered event vibe classification using keyword matching + LLM
 */
export class VibeClassifier {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Classify an event's vibes using hybrid approach:
   * 1. Keyword matching for high-confidence signals
   * 2. LLM for nuanced classification
   */
  async classify(event: EventInput): Promise<ClassifiedVibe> {
    // First pass: keyword-based classification
    const keywordResult = this.classifyByKeywords(event);

    // If high confidence from keywords alone, skip LLM
    if (keywordResult.confidence >= 0.85) {
      return keywordResult;
    }

    // Second pass: LLM-enhanced classification
    try {
      const llmResult = await this.classifyWithLLM(event);

      // Merge results, preferring keyword matches for verticals
      return this.mergeClassifications(keywordResult, llmResult);
    } catch (error) {
      console.error('LLM classification failed, using keyword results:', error);
      return keywordResult;
    }
  }

  /**
   * Batch classify multiple events
   */
  async classifyBatch(events: EventInput[]): Promise<ClassifiedVibe[]> {
    // Process in parallel with concurrency limit
    const concurrency = 5;
    const results: ClassifiedVibe[] = [];

    for (let i = 0; i < events.length; i += concurrency) {
      const batch = events.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((e) => this.classify(e)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Keyword-based classification (fast, deterministic)
   */
  private classifyByKeywords(event: EventInput): ClassifiedVibe {
    const text = `${event.title} ${event.description ?? ''} ${event.category ?? ''} ${event.tags?.join(' ') ?? ''}`.toLowerCase();

    // Detect verticals
    const isHolistic = this.detectHolistic(text);
    const isDance = this.detectDance(text);
    const holisticTags = isHolistic ? this.extractHolisticTags(text) : [];
    const danceTags = isDance ? this.extractDanceTags(text) : [];

    // Detect moods
    const moods = this.detectMoods(text, isHolistic, isDance);

    // Detect time vibe from start time
    const timeVibe = this.detectTimeVibe(event.startTime);

    // Estimate other attributes
    const energyLevel = this.estimateEnergy(text, isDance, isHolistic);
    const socialDensity = this.estimateSocialDensity(text, isDance);
    const intimacyLevel = this.estimateIntimacy(text, isHolistic);
    const soloFriendly = this.estimateSoloFriendly(text, socialDensity);

    // Calculate confidence based on keyword matches
    const confidence = this.calculateKeywordConfidence(
      text,
      isHolistic,
      isDance,
      moods.length
    );

    return {
      moods,
      energyLevel,
      soloFriendly,
      socialDensity,
      intimacyLevel,
      timeVibe,
      isHolistic,
      isDance,
      holisticTags,
      danceTags,
      confidence,
    };
  }

  /**
   * LLM-enhanced classification
   */
  private async classifyWithLLM(event: EventInput): Promise<ClassifiedVibe> {
    const prompt = `Classify this event's vibes. Return ONLY valid JSON, no explanation.

Event:
Title: ${event.title}
Description: ${event.description ?? 'N/A'}
Category: ${event.category ?? 'N/A'}
Venue: ${event.venueName ?? 'N/A'}
Time: ${event.startTime?.toISOString() ?? 'N/A'}

Classify into these categories:

1. moods (pick 1-3): ${MOODS.join(', ')}
   - move: Physical activity, dance, sports
   - chill: Relaxation, calm, peaceful
   - connect: Social, networking, community
   - learn: Educational, workshops, talks
   - celebrate: Parties, celebrations, festivities
   - create: Art, making, creative expression
   - explore: Adventure, discovery, new experiences

2. energyLevel (1-5): 1=very calm, 5=very high energy

3. soloFriendly (true/false): Good for attending alone?

4. socialDensity: solo | partner | social | crowd

5. intimacyLevel: open | community | intimate | sacred

6. timeVibe: morning | afternoon | evening | late-night

7. isHolistic (true/false): Wellness, yoga, meditation, spiritual?

8. isDance (true/false): Dancing, club, rave, social dance?

9. holisticTags (if isHolistic, pick relevant): yoga, meditation, breathwork, sound-bath, ceremony, plant-medicine, reiki, acupuncture, massage, wellness-workshop, retreat, healing-circle, astrology, tarot, shamanic, tantra, qi-gong, ayurveda, crystal-healing, energy-work

10. danceTags (if isDance, pick relevant): salsa, bachata, tango, swing, ecstatic-dance, contact-improv, club, techno, house, bass, afrobeats, reggaeton, hip-hop, zouk, kizomba, west-coast-swing, line-dance, ballroom, fusion, dj-set

Return JSON:
{
  "moods": ["mood1", "mood2"],
  "energyLevel": 3,
  "soloFriendly": true,
  "socialDensity": "social",
  "intimacyLevel": "open",
  "timeVibe": "evening",
  "isHolistic": false,
  "isDance": false,
  "holisticTags": [],
  "danceTags": [],
  "confidence": 0.8
}`;

    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and type the result
    return {
      moods: this.validateMoods(result.moods),
      energyLevel: this.validateEnergyLevel(result.energyLevel),
      soloFriendly: Boolean(result.soloFriendly),
      socialDensity: this.validateSocialDensity(result.socialDensity),
      intimacyLevel: this.validateIntimacyLevel(result.intimacyLevel),
      timeVibe: this.validateTimeVibe(result.timeVibe),
      isHolistic: Boolean(result.isHolistic),
      isDance: Boolean(result.isDance),
      holisticTags: this.validateHolisticTags(result.holisticTags),
      danceTags: this.validateDanceTags(result.danceTags),
      confidence: Math.min(1, Math.max(0, result.confidence ?? 0.7)),
    };
  }

  /**
   * Merge keyword and LLM classifications
   */
  private mergeClassifications(
    keyword: ClassifiedVibe,
    llm: ClassifiedVibe
  ): ClassifiedVibe {
    // Prefer keyword detection for verticals (more reliable)
    const isHolistic = keyword.isHolistic || llm.isHolistic;
    const isDance = keyword.isDance || llm.isDance;

    // Merge tags
    const holisticTags = [...new Set([...keyword.holisticTags, ...llm.holisticTags])];
    const danceTags = [...new Set([...keyword.danceTags, ...llm.danceTags])];

    // Prefer LLM for nuanced attributes if keyword confidence is low
    const useLLM = keyword.confidence < 0.6;

    return {
      moods: useLLM ? llm.moods : keyword.moods.length > 0 ? keyword.moods : llm.moods,
      energyLevel: useLLM ? llm.energyLevel : keyword.energyLevel,
      soloFriendly: useLLM ? llm.soloFriendly : keyword.soloFriendly,
      socialDensity: useLLM ? llm.socialDensity : keyword.socialDensity,
      intimacyLevel: useLLM ? llm.intimacyLevel : keyword.intimacyLevel,
      timeVibe: keyword.timeVibe, // Always use keyword for time (it's based on actual time)
      isHolistic,
      isDance,
      holisticTags: holisticTags as HolisticTag[],
      danceTags: danceTags as DanceTag[],
      confidence: Math.max(keyword.confidence, llm.confidence),
    };
  }

  // === Detection helpers ===

  private detectHolistic(text: string): boolean {
    return Object.values(HOLISTIC_KEYWORDS).flat().some((kw) => text.includes(kw.toLowerCase()));
  }

  private detectDance(text: string): boolean {
    return Object.values(DANCE_KEYWORDS).flat().some((kw) => text.includes(kw.toLowerCase()));
  }

  private extractHolisticTags(text: string): HolisticTag[] {
    const tags: HolisticTag[] = [];
    for (const tag of HOLISTIC_TAGS) {
      if (text.includes(tag.toLowerCase().replace('-', ' ')) || text.includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }
    return tags.slice(0, 5); // Max 5 tags
  }

  private extractDanceTags(text: string): DanceTag[] {
    const tags: DanceTag[] = [];
    for (const tag of DANCE_TAGS) {
      if (text.includes(tag.toLowerCase().replace('-', ' ')) || text.includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }
    return tags.slice(0, 5);
  }

  private detectMoods(text: string, isHolistic: boolean, isDance: boolean): Mood[] {
    const moods: Mood[] = [];

    // Mood-specific keywords for detection
    const MOOD_KEYWORDS: Record<Mood, string[]> = {
      move: ['dance', 'yoga', 'fitness', 'workout', 'movement', 'exercise', 'run', 'hike'],
      chill: ['meditation', 'relax', 'calm', 'peaceful', 'restorative', 'gentle', 'spa'],
      connect: ['networking', 'social', 'meetup', 'community', 'gathering', 'mixer'],
      learn: ['workshop', 'class', 'course', 'lecture', 'seminar', 'training', 'lesson'],
      celebrate: ['party', 'festival', 'concert', 'celebration', 'gala', 'rave'],
      create: ['art', 'craft', 'creative', 'make', 'build', 'paint', 'draw', 'write'],
      explore: ['tour', 'adventure', 'discover', 'experience', 'visit', 'explore'],
    };

    // Keyword-based mood detection
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some((kw: string) => text.includes(kw.toLowerCase()))) {
        moods.push(mood as Mood);
      }
    }

    // Default moods based on verticals
    if (moods.length === 0) {
      if (isDance) moods.push('move', 'celebrate');
      if (isHolistic) moods.push('chill', 'connect');
    }

    // Fallback
    if (moods.length === 0) {
      moods.push('explore');
    }

    return [...new Set(moods)].slice(0, 3); // Max 3 unique moods
  }

  private detectTimeVibe(startTime?: Date): TimeVibe {
    if (!startTime) return 'evening'; // Default

    const hour = startTime.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'late-night';
  }

  private estimateEnergy(text: string, isDance: boolean, isHolistic: boolean): EnergyLevel {
    const highEnergyKeywords = ['party', 'rave', 'club', 'high energy', 'workout', 'hiit', 'cardio'];
    const lowEnergyKeywords = ['meditation', 'gentle', 'restorative', 'calm', 'quiet', 'peaceful'];

    if (highEnergyKeywords.some((kw) => text.includes(kw))) return 5;
    if (lowEnergyKeywords.some((kw) => text.includes(kw))) return 1;
    if (isDance) return 4;
    if (isHolistic) return 2;
    return 3; // Default moderate
  }

  private estimateSocialDensity(text: string, isDance: boolean): SocialDensity {
    if (text.includes('crowd') || text.includes('festival') || text.includes('rave')) return 'crowd';
    if (text.includes('partner') || text.includes('couples') || text.includes('duo')) return 'partner';
    if (text.includes('solo') || text.includes('individual') || text.includes('personal')) return 'solo';
    if (isDance) return 'social';
    return 'social'; // Default
  }

  private estimateIntimacy(text: string, isHolistic: boolean): IntimacyLevel {
    if (text.includes('ceremony') || text.includes('sacred') || text.includes('ritual')) return 'sacred';
    if (text.includes('private') || text.includes('intimate') || text.includes('small group')) return 'intimate';
    if (text.includes('community') || isHolistic) return 'community';
    return 'open'; // Default
  }

  private estimateSoloFriendly(text: string, socialDensity: SocialDensity): boolean {
    if (text.includes('singles') || text.includes('solo') || text.includes('individual')) return true;
    if (text.includes('couples only') || text.includes('pairs')) return false;
    if (socialDensity === 'partner') return false;
    return true; // Most events are solo-friendly
  }

  private calculateKeywordConfidence(
    text: string,
    isHolistic: boolean,
    isDance: boolean,
    moodCount: number
  ): number {
    let confidence = 0.4; // Base confidence

    // Strong vertical detection
    if (isHolistic || isDance) confidence += 0.25;

    // Mood detection
    if (moodCount >= 2) confidence += 0.15;
    if (moodCount >= 1) confidence += 0.1;

    // Text length (more data = more confidence)
    if (text.length > 500) confidence += 0.1;
    if (text.length > 200) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  // === Validation helpers ===

  private validateMoods(moods: unknown): Mood[] {
    if (!Array.isArray(moods)) return ['explore'];
    return moods
      .filter((m): m is Mood => MOODS.includes(m as Mood))
      .slice(0, 3);
  }

  private validateEnergyLevel(level: unknown): EnergyLevel {
    const num = Number(level);
    if (num >= 1 && num <= 5) return num as EnergyLevel;
    return 3;
  }

  private validateSocialDensity(density: unknown): SocialDensity {
    if (SOCIAL_DENSITIES.includes(density as SocialDensity)) {
      return density as SocialDensity;
    }
    return 'social';
  }

  private validateIntimacyLevel(level: unknown): IntimacyLevel {
    if (INTIMACY_LEVELS.includes(level as IntimacyLevel)) {
      return level as IntimacyLevel;
    }
    return 'open';
  }

  private validateTimeVibe(vibe: unknown): TimeVibe {
    if (TIME_VIBES.includes(vibe as TimeVibe)) {
      return vibe as TimeVibe;
    }
    return 'evening';
  }

  private validateHolisticTags(tags: unknown): HolisticTag[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter((t): t is HolisticTag => HOLISTIC_TAGS.includes(t as HolisticTag))
      .slice(0, 5);
  }

  private validateDanceTags(tags: unknown): DanceTag[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter((t): t is DanceTag => DANCE_TAGS.includes(t as DanceTag))
      .slice(0, 5);
  }
}

export const vibeClassifier = new VibeClassifier();
