import { db } from '@aiegator/database';
import { events, eventVibes } from '@aiegator/database/schema';
import { eq, and, or, gte, lte, sql, inArray } from 'drizzle-orm';
import type {
  Mood,
  EnergyLevel,
  SocialDensity,
  IntimacyLevel,
  TimeVibe,
  EventWithDistance,
  LocationQuery,
  WALKING_PRESETS,
} from '@aiegator/shared';
import { neighborhoodService } from './neighborhood-service.js';

/**
 * Discovery filters for mood-based event search
 */
export interface DiscoveryFilters {
  // Mood-based
  moods?: Mood[];
  energyLevel?: EnergyLevel | EnergyLevel[];
  soloFriendly?: boolean;
  socialDensity?: SocialDensity[];
  intimacyLevel?: IntimacyLevel[];
  timeVibe?: TimeVibe[];

  // Vertical filters
  isHolistic?: boolean;
  isDance?: boolean;
  holisticTags?: string[];
  danceTags?: string[];

  // Location
  location?: LocationQuery;

  // Time
  startDate?: Date;
  endDate?: Date;
  tonight?: boolean;
  thisWeekend?: boolean;

  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * Discovered event with vibe and distance info
 */
export interface DiscoveredEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
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
}

/**
 * DiscoveryService
 * Mood-based event discovery with hyper-local filtering
 */
export class DiscoveryService {
  /**
   * Main discovery endpoint - find events by mood and location
   */
  async discover(filters: DiscoveryFilters): Promise<DiscoveredEvent[]> {
    // Build base query
    let query = db
      .select({
        event: events,
        vibe: eventVibes,
      })
      .from(events)
      .leftJoin(eventVibes, eq(events.id, eventVibes.eventId))
      .where(eq(events.status, 'active'));

    const conditions: ReturnType<typeof eq>[] = [];

    // Time filters
    if (filters.tonight) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(
        gte(events.startTime, today),
        lte(events.startTime, tomorrow)
      );
    } else if (filters.thisWeekend) {
      const { start, end } = this.getWeekendRange();
      conditions.push(
        gte(events.startTime, start),
        lte(events.startTime, end)
      );
    } else {
      if (filters.startDate) {
        conditions.push(gte(events.startTime, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(events.startTime, filters.endDate));
      } else {
        // Default: upcoming events only
        conditions.push(gte(events.startTime, new Date()));
      }
    }

    // Mood filters (using JSONB contains)
    if (filters.moods && filters.moods.length > 0) {
      // Check if any of the requested moods are in the event's moods array
      const moodConditions = filters.moods.map(mood =>
        sql`${eventVibes.moods} @> ${JSON.stringify([mood])}::jsonb`
      );
      conditions.push(or(...moodConditions)!);
    }

    // Energy level
    if (filters.energyLevel) {
      const levels = Array.isArray(filters.energyLevel)
        ? filters.energyLevel
        : [filters.energyLevel];
      conditions.push(inArray(eventVibes.energyLevel, levels));
    }

    // Solo friendly
    if (filters.soloFriendly !== undefined) {
      conditions.push(eq(eventVibes.soloFriendly, filters.soloFriendly));
    }

    // Social density
    if (filters.socialDensity && filters.socialDensity.length > 0) {
      conditions.push(inArray(eventVibes.socialDensity, filters.socialDensity));
    }

    // Intimacy level
    if (filters.intimacyLevel && filters.intimacyLevel.length > 0) {
      conditions.push(inArray(eventVibes.intimacyLevel, filters.intimacyLevel));
    }

    // Time vibe
    if (filters.timeVibe && filters.timeVibe.length > 0) {
      conditions.push(inArray(eventVibes.timeVibe, filters.timeVibe));
    }

    // Vertical filters
    if (filters.isHolistic !== undefined) {
      conditions.push(eq(eventVibes.isHolistic, filters.isHolistic));
    }

    if (filters.isDance !== undefined) {
      conditions.push(eq(eventVibes.isDance, filters.isDance));
    }

    // Holistic tags
    if (filters.holisticTags && filters.holisticTags.length > 0) {
      const tagConditions = filters.holisticTags.map(tag =>
        sql`${eventVibes.holisticTags} @> ${JSON.stringify([tag])}::jsonb`
      );
      conditions.push(or(...tagConditions)!);
    }

    // Dance tags
    if (filters.danceTags && filters.danceTags.length > 0) {
      const tagConditions = filters.danceTags.map(tag =>
        sql`${eventVibes.danceTags} @> ${JSON.stringify([tag])}::jsonb`
      );
      conditions.push(or(...tagConditions)!);
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Add ordering and pagination
    const results = await query
      .orderBy(events.startTime)
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    // Process results
    let discoveredEvents = results.map((r) => this.mapToDiscoveredEvent(r.event, r.vibe));

    // Apply location filtering (post-query for now, can optimize with PostGIS later)
    if (filters.location) {
      discoveredEvents = await this.applyLocationFilter(
        discoveredEvents,
        filters.location
      );
    }

    return discoveredEvents;
  }

  /**
   * Get events for "Tonight" quick filter
   */
  async getTonight(location?: LocationQuery): Promise<DiscoveredEvent[]> {
    return this.discover({
      tonight: true,
      location,
      limit: 30,
    });
  }

  /**
   * Get events for "This Weekend" quick filter
   */
  async getThisWeekend(location?: LocationQuery): Promise<DiscoveredEvent[]> {
    return this.discover({
      thisWeekend: true,
      location,
      limit: 50,
    });
  }

  /**
   * Get holistic events
   */
  async getHolisticEvents(
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    return this.discover({
      ...filters,
      isHolistic: true,
    });
  }

  /**
   * Get dance events
   */
  async getDanceEvents(
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    return this.discover({
      ...filters,
      isDance: true,
    });
  }

  /**
   * Get events by mood
   */
  async getByMood(
    moods: Mood[],
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    return this.discover({
      ...filters,
      moods,
    });
  }

  /**
   * Get events near a location
   */
  async getNearby(
    lat: number,
    lng: number,
    radiusMeters: number = 1600, // ~1 mile default
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    return this.discover({
      ...filters,
      location: {
        lat,
        lng,
        radiusMeters,
      },
    });
  }

  /**
   * Get events in a neighborhood
   */
  async getInNeighborhood(
    neighborhoodId: string,
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    return this.discover({
      ...filters,
      location: {
        neighborhoodId,
      },
    });
  }

  /**
   * Get curated "For You" feed based on user preferences
   */
  async getForYou(
    userId: string,
    filters?: Partial<DiscoveryFilters>
  ): Promise<DiscoveredEvent[]> {
    // Get user's saved neighborhoods
    const userNeighborhoods = await neighborhoodService.getUserNeighborhoods(userId);

    if (userNeighborhoods.length === 0) {
      // Fallback to general discovery
      return this.discover({ ...filters, limit: 30 });
    }

    // Query events from user's neighborhoods
    const allEvents: DiscoveredEvent[] = [];
    for (const un of userNeighborhoods) {
      const events = await this.getInNeighborhood(un.neighborhoodId, {
        ...filters,
        limit: 10,
      });
      allEvents.push(...events);
    }

    // Dedupe and sort by time
    const uniqueEvents = this.dedupeEvents(allEvents);
    return uniqueEvents.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }

  // === Private Helpers ===

  private mapToDiscoveredEvent(
    event: typeof events.$inferSelect,
    vibe: typeof eventVibes.$inferSelect | null
  ): DiscoveredEvent {
    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      startTime: event.startTime,
      endTime: event.endTime ?? undefined,
      venue: event.venueName
        ? {
            name: event.venueName,
            address: event.venueAddress ?? undefined,
            lat: event.venueLat ?? undefined,
            lng: event.venueLng ?? undefined,
          }
        : undefined,
      imageUrl: event.imageUrl ?? undefined,
      url: event.url ?? undefined,
      price: event.priceMin || event.priceMax
        ? {
            min: event.priceMin ?? undefined,
            max: event.priceMax ?? undefined,
            currency: event.priceCurrency ?? 'USD',
          }
        : undefined,
      vibe: {
        moods: (vibe?.moods as Mood[]) ?? [],
        energyLevel: vibe?.energyLevel as EnergyLevel | undefined,
        soloFriendly: vibe?.soloFriendly ?? true,
        socialDensity: vibe?.socialDensity as SocialDensity | undefined,
        intimacyLevel: vibe?.intimacyLevel as IntimacyLevel | undefined,
        timeVibe: vibe?.timeVibe as TimeVibe | undefined,
        isHolistic: vibe?.isHolistic ?? false,
        isDance: vibe?.isDance ?? false,
        holisticTags: (vibe?.holisticTags as string[]) ?? [],
        danceTags: (vibe?.danceTags as string[]) ?? [],
        confidence: vibe?.confidence ?? 0,
      },
    };
  }

  private async applyLocationFilter(
    events: DiscoveredEvent[],
    location: LocationQuery
  ): Promise<DiscoveredEvent[]> {
    // Filter by neighborhood
    if (location.neighborhoodId) {
      const neighborhood = await neighborhoodService.getNeighborhoodById(
        location.neighborhoodId
      );
      if (!neighborhood) return events;

      return events.filter((event) => {
        if (!event.venue?.lat || !event.venue?.lng) return false;
        // Simple bounding box check
        const bounds = neighborhood.boundary.coordinates[0];
        const lngs = bounds.map((p) => p[0]);
        const lats = bounds.map((p) => p[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        return (
          event.venue.lng >= minLng &&
          event.venue.lng <= maxLng &&
          event.venue.lat >= minLat &&
          event.venue.lat <= maxLat
        );
      });
    }

    // Filter by coordinates + radius
    if (location.lat && location.lng) {
      const radiusMeters = location.radiusMeters ?? location.radiusMiles ? location.radiusMiles! * 1609.34 : 1600;

      return events
        .map((event) => {
          if (!event.venue?.lat || !event.venue?.lng) return null;

          const distance = this.haversineDistanceMeters(
            location.lat!,
            location.lng!,
            event.venue.lat,
            event.venue.lng
          );

          if (distance > radiusMeters) return null;

          return {
            ...event,
            distance: {
              meters: Math.round(distance),
              miles: Math.round((distance / 1609.34) * 100) / 100,
              walkingMinutes: Math.round(distance / 80), // ~80m/min walking
              bikingMinutes: Math.round(distance / 250), // ~250m/min biking
            },
          };
        })
        .filter((e): e is DiscoveredEvent => e !== null)
        .sort((a, b) => (a.distance?.meters ?? 0) - (b.distance?.meters ?? 0));
    }

    return events;
  }

  private haversineDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getWeekendRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Find next Friday (or today if it's Friday-Sunday)
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (dayOfWeek >= 5) daysUntilFriday = 0; // Already weekend

    const friday = new Date(now);
    friday.setDate(now.getDate() + daysUntilFriday);
    friday.setHours(17, 0, 0, 0); // Friday 5pm

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + (dayOfWeek === 0 ? 0 : 7 - friday.getDay()));
    sunday.setHours(23, 59, 59, 999);

    return { start: friday, end: sunday };
  }

  private dedupeEvents(events: DiscoveredEvent[]): DiscoveredEvent[] {
    const seen = new Set<string>();
    return events.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }
}

export const discoveryService = new DiscoveryService();
