import { db } from '@aiegator/database';
import { neighborhoods, userNeighborhoods } from '@aiegator/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type {
  Neighborhood,
  UserNeighborhood,
  LocationQuery,
  NeighborhoodStats,
  WalkingMinutes,
  WALKING_PRESETS,
} from '@aiegator/shared';

/**
 * NeighborhoodService
 * Handles hyper-local discovery with geo-boundary queries
 */
export class NeighborhoodService {
  /**
   * Get all neighborhoods for a city
   */
  async getNeighborhoodsByCity(city: string): Promise<Neighborhood[]> {
    const results = await db
      .select()
      .from(neighborhoods)
      .where(eq(neighborhoods.city, city));

    return results.map(this.mapToNeighborhood);
  }

  /**
   * Get a single neighborhood by ID/slug
   */
  async getNeighborhoodById(id: string): Promise<Neighborhood | null> {
    const [result] = await db
      .select()
      .from(neighborhoods)
      .where(eq(neighborhoods.id, id))
      .limit(1);

    return result ? this.mapToNeighborhood(result) : null;
  }

  /**
   * Find neighborhoods near a point (within radius)
   */
  async findNeighborhoodsNearPoint(
    lat: number,
    lng: number,
    radiusMiles: number = 5
  ): Promise<Neighborhood[]> {
    // Haversine formula approximation for nearby search
    // 1 degree latitude ≈ 69 miles
    const latDelta = radiusMiles / 69;
    // 1 degree longitude varies by latitude
    const lngDelta = radiusMiles / (69 * Math.cos(lat * (Math.PI / 180)));

    const results = await db
      .select()
      .from(neighborhoods)
      .where(
        and(
          sql`${neighborhoods.centerLat} BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
          sql`${neighborhoods.centerLng} BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`
        )
      );

    // Calculate actual distance and filter
    return results
      .map((n) => ({
        ...this.mapToNeighborhood(n),
        distance: this.haversineDistance(lat, lng, n.centerLat, n.centerLng),
      }))
      .filter((n) => n.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if a point is within a neighborhood boundary
   */
  async findNeighborhoodContainingPoint(
    lat: number,
    lng: number
  ): Promise<Neighborhood | null> {
    // Use PostGIS ST_Contains if available, otherwise simple bounding box + JS check
    const nearbyNeighborhoods = await this.findNeighborhoodsNearPoint(lat, lng, 2);

    for (const neighborhood of nearbyNeighborhoods) {
      if (this.pointInPolygon([lng, lat], neighborhood.boundary.coordinates[0])) {
        return neighborhood;
      }
    }

    return null;
  }

  /**
   * Get user's saved neighborhoods
   */
  async getUserNeighborhoods(userId: string): Promise<UserNeighborhood[]> {
    const results = await db
      .select({
        userNeighborhood: userNeighborhoods,
        neighborhood: neighborhoods,
      })
      .from(userNeighborhoods)
      .leftJoin(neighborhoods, eq(userNeighborhoods.neighborhoodId, neighborhoods.id))
      .where(eq(userNeighborhoods.userId, userId));

    return results.map((r) => ({
      userId: r.userNeighborhood.userId,
      neighborhoodId: r.userNeighborhood.neighborhoodId,
      type: r.userNeighborhood.type as UserNeighborhood['type'],
      walkingRadiusMinutes: r.userNeighborhood.walkingRadiusMinutes as WalkingMinutes,
      notificationsEnabled: r.userNeighborhood.notificationsEnabled,
      createdAt: r.userNeighborhood.createdAt,
      updatedAt: r.userNeighborhood.updatedAt,
    }));
  }

  /**
   * Save a neighborhood for a user
   */
  async saveUserNeighborhood(
    userId: string,
    neighborhoodId: string,
    type: UserNeighborhood['type'],
    options?: {
      walkingRadiusMinutes?: WalkingMinutes;
      notificationsEnabled?: boolean;
      customName?: string;
    }
  ): Promise<void> {
    await db
      .insert(userNeighborhoods)
      .values({
        userId,
        neighborhoodId,
        type,
        walkingRadiusMinutes: options?.walkingRadiusMinutes ?? 10,
        notificationsEnabled: options?.notificationsEnabled ?? true,
        customName: options?.customName,
      })
      .onConflictDoUpdate({
        target: [userNeighborhoods.userId, userNeighborhoods.neighborhoodId],
        set: {
          type,
          walkingRadiusMinutes: options?.walkingRadiusMinutes,
          notificationsEnabled: options?.notificationsEnabled,
          customName: options?.customName,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Remove a saved neighborhood
   */
  async removeUserNeighborhood(userId: string, neighborhoodId: string): Promise<void> {
    await db
      .delete(userNeighborhoods)
      .where(
        and(
          eq(userNeighborhoods.userId, userId),
          eq(userNeighborhoods.neighborhoodId, neighborhoodId)
        )
      );
  }

  /**
   * Get neighborhood statistics
   */
  async getNeighborhoodStats(neighborhoodId: string): Promise<NeighborhoodStats | null> {
    const neighborhood = await this.getNeighborhoodById(neighborhoodId);
    if (!neighborhood) return null;

    // TODO: Implement actual stats queries against events table
    // This is a placeholder structure
    return {
      neighborhoodId,
      totalEvents: 0,
      upcomingEvents: 0,
      eventsTonight: 0,
      eventsThisWeek: 0,
      holisticEvents: 0,
      danceEvents: 0,
      topMoods: [],
      peakHours: [],
    };
  }

  /**
   * Seed initial neighborhood data (for development)
   */
  async seedSFNeighborhoods(): Promise<void> {
    const sfNeighborhoodData = [
      {
        id: 'mission',
        name: 'Mission District',
        shortName: 'The Mission',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        centerLat: 37.7599,
        centerLng: -122.4148,
        vibe: 'Creative, diverse, late-night energy',
        knownFor: ['tacos', 'murals', 'nightlife', 'coffee'],
        neighborhoodType: 'mixed',
        boundary: this.createSimpleBoundary(37.7599, -122.4148, 0.015),
        center: { type: 'Point' as const, coordinates: [-122.4148, 37.7599] },
      },
      {
        id: 'castro',
        name: 'Castro',
        shortName: 'The Castro',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        centerLat: 37.7609,
        centerLng: -122.435,
        vibe: 'Historic, vibrant LGBTQ+ community',
        knownFor: ['nightlife', 'pride', 'history', 'community'],
        neighborhoodType: 'entertainment',
        boundary: this.createSimpleBoundary(37.7609, -122.435, 0.01),
        center: { type: 'Point' as const, coordinates: [-122.435, 37.7609] },
      },
      {
        id: 'haight',
        name: 'Haight-Ashbury',
        shortName: 'The Haight',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        centerLat: 37.7692,
        centerLng: -122.4481,
        vibe: 'Bohemian, eclectic, counterculture roots',
        knownFor: ['vintage shops', 'music', 'history', 'hippie culture'],
        neighborhoodType: 'cultural',
        boundary: this.createSimpleBoundary(37.7692, -122.4481, 0.01),
        center: { type: 'Point' as const, coordinates: [-122.4481, 37.7692] },
      },
      {
        id: 'soma',
        name: 'South of Market',
        shortName: 'SoMa',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        centerLat: 37.7785,
        centerLng: -122.4056,
        vibe: 'Tech hub, warehouse parties, diverse nightlife',
        knownFor: ['clubs', 'tech', 'museums', 'events'],
        neighborhoodType: 'mixed',
        boundary: this.createSimpleBoundary(37.7785, -122.4056, 0.02),
        center: { type: 'Point' as const, coordinates: [-122.4056, 37.7785] },
      },
      {
        id: 'hayes-valley',
        name: 'Hayes Valley',
        shortName: 'Hayes',
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        centerLat: 37.7759,
        centerLng: -122.4245,
        vibe: 'Trendy, boutique shopping, brunch culture',
        knownFor: ['boutiques', 'restaurants', 'art', 'cafes'],
        neighborhoodType: 'commercial',
        boundary: this.createSimpleBoundary(37.7759, -122.4245, 0.008),
        center: { type: 'Point' as const, coordinates: [-122.4245, 37.7759] },
      },
    ];

    for (const neighborhood of sfNeighborhoodData) {
      await db
        .insert(neighborhoods)
        .values(neighborhood)
        .onConflictDoNothing();
    }
  }

  // === Private Helpers ===

  private mapToNeighborhood(record: typeof neighborhoods.$inferSelect): Neighborhood {
    return {
      id: record.id,
      slug: record.id,
      name: record.name,
      shortName: record.shortName ?? undefined,
      city: record.city,
      state: record.state ?? undefined,
      country: record.country,
      boundary: record.boundary,
      center: record.center,
      areaSqMiles: record.areaSqMiles ?? undefined,
      vibe: record.vibe ?? undefined,
      knownFor: record.knownFor ?? undefined,
      neighborhoodType: record.neighborhoodType as Neighborhood['neighborhoodType'],
      adjacentNeighborhoods: record.adjacentNeighborhoods ?? undefined,
      parentArea: record.parentArea ?? undefined,
    };
  }

  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 3959; // Earth's radius in miles
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

  private pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  private createSimpleBoundary(
    centerLat: number,
    centerLng: number,
    size: number
  ): { type: 'Polygon'; coordinates: [number, number][][] } {
    // Create a simple square boundary around center point
    return {
      type: 'Polygon',
      coordinates: [
        [
          [centerLng - size, centerLat - size],
          [centerLng + size, centerLat - size],
          [centerLng + size, centerLat + size],
          [centerLng - size, centerLat + size],
          [centerLng - size, centerLat - size], // Close the polygon
        ],
      ],
    };
  }
}

export const neighborhoodService = new NeighborhoodService();
