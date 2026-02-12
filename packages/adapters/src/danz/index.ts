import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from '../types.js';
import { BaseAdapter } from '../base-adapter.js';

/**
 * DANZ.Now Event Adapter
 *
 * Fetches dance events from DANZ.Now's Supabase database.
 * Also provides user stats and challenge data for the FlowB plugin.
 */

// DANZ-specific types
interface DANZEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  image_url?: string;
  location_name: string;
  location_address?: string;
  location_city?: string;
  location_latitude?: number;
  location_longitude?: number;
  price_usd?: number;
  price_danz?: number;
  is_virtual?: boolean;
  virtual_link?: string;
  skill_level?: string;
  dance_styles?: string[];
  start_date_time: string;
  end_date_time: string;
  max_capacity?: number;
  is_featured?: boolean;
  facilitator?: {
    privy_id: string;
    display_name?: string;
    username?: string;
  };
  event_registrations?: Array<{ status: string }>;
}

interface DANZAdapterConfig extends AdapterConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class DANZAdapter extends BaseAdapter {
  private supabase: SupabaseClient;

  constructor(config: DANZAdapterConfig) {
    super('danz', {
      ...config,
      baseUrl: config.supabaseUrl,
      rateLimit: { maxRequestsPerSecond: 10 },
    });

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  isConfigured(): boolean {
    return !!(this.config as DANZAdapterConfig).supabaseUrl &&
           !!(this.config as DANZAdapterConfig).supabaseKey;
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    const limit = options.limit ?? 50;
    const now = new Date().toISOString();

    let query = this.supabase
      .from('events')
      .select('*, facilitator:users!facilitator_id(privy_id, display_name, username), event_registrations(status)', { count: 'exact' })
      .gt('start_date_time', now)
      .order('start_date_time', { ascending: true })
      .limit(limit);

    // Apply filters
    if (options.location?.city) {
      query = query.ilike('location_city', `%${options.location.city}%`);
    }

    if (options.categories?.length) {
      query = query.in('category', options.categories);
    }

    if (options.keywords?.length) {
      // Filter by dance styles
      const styles = options.keywords;
      query = query.overlaps('dance_styles', styles);
    }

    if (options.date?.startDate) {
      query = query.gte('start_date_time', options.date.startDate.toISOString());
    }

    if (options.date?.endDate) {
      query = query.lte('start_date_time', options.date.endDate.toISOString());
    }

    // Handle pagination
    if (options.cursor) {
      const offset = parseInt(options.cursor, 10);
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[danz] Fetch error:', error);
      return { events: [], hasMore: false };
    }

    const events: RawEvent[] = (data || []).map((event: DANZEvent) => ({
      sourceId: event.id,
      source: 'danz',
      rawData: event as unknown as Record<string, unknown>,
      fetchedAt: new Date(),
    }));

    const currentOffset = options.cursor ? parseInt(options.cursor, 10) : 0;
    const hasMore = count ? currentOffset + events.length < count : false;

    return {
      events,
      hasMore,
      nextCursor: hasMore ? String(currentOffset + limit) : undefined,
      totalCount: count ?? undefined,
    };
  }

  normalize(raw: RawEvent): NormalizedEvent {
    const event = raw.rawData as unknown as DANZEvent;

    const startDate = new Date(event.start_date_time);
    const endDate = event.end_date_time ? new Date(event.end_date_time) : null;

    // Calculate current capacity from registrations
    const registeredCount = event.event_registrations?.filter(
      r => r.status === 'registered' || r.status === 'attended'
    ).length ?? 0;

    return {
      sourceId: event.id,
      source: 'danz',
      url: `https://danz.now/events/${event.id}`,

      name: event.title,
      description: event.description ?? null,
      summary: event.description ? this.truncate(event.description, 200) : null,

      startDate,
      endDate,
      timezone: 'America/Denver', // Default for now
      isAllDay: false,

      venue: {
        name: event.location_name ?? null,
        address: event.location_address ?? null,
        city: event.location_city ?? null,
        state: null,
        country: 'US',
        postalCode: null,
        lat: event.location_latitude ?? null,
        lng: event.location_longitude ?? null,
      },
      isOnline: event.is_virtual ?? false,
      onlineUrl: event.virtual_link ?? null,

      categories: event.category ? [event.category] : [],
      tags: [
        ...(event.dance_styles || []),
        ...(event.skill_level ? [event.skill_level] : []),
        ...(event.is_featured ? ['featured'] : []),
      ],

      imageUrl: event.image_url ?? null,
      images: event.image_url ? [{
        url: event.image_url,
        width: null,
        height: null,
        type: 'banner' as const,
      }] : [],

      isFree: event.price_usd === 0 || event.price_usd === null,
      priceMin: event.price_usd ?? null,
      priceMax: event.price_usd ?? null,
      currency: event.price_usd ? 'USD' : null,
      ticketUrl: `https://danz.now/events/${event.id}`,

      organizer: event.facilitator ? {
        name: event.facilitator.display_name ?? event.facilitator.username ?? null,
        url: event.facilitator.username
          ? `https://danz.now/@${event.facilitator.username}`
          : null,
      } : null,

      attendeeCount: registeredCount,
      capacity: event.max_capacity ?? null,

      fetchedAt: raw.fetchedAt,
      rawData: raw.rawData,
    };
  }

  // =========================================================================
  // DANZ-specific methods for FlowB plugin
  // =========================================================================

  /**
   * Check if a username exists in DANZ
   */
  async verifyUsername(username: string): Promise<{
    exists: boolean;
    user?: {
      privy_id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
      xp?: number;
      level?: number;
      created_at?: string;
    };
  }> {
    const cleanUsername = username.toLowerCase().replace('@', '');

    const { data, error } = await this.supabase
      .from('users')
      .select('privy_id, username, display_name, avatar_url, xp, level, created_at')
      .eq('username', cleanUsername)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    return { exists: true, user: data };
  }

  /**
   * Get user stats from DANZ
   */
  async getUserStats(privyId: string): Promise<{
    xp: number;
    level: number;
    totalSessions: number;
    totalDanceTime: number;
    currentStreak: number;
    longestStreak: number;
    achievementsUnlocked: number;
    eventsAttended: number;
    danceBonds: number;
  } | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select(`
        xp, level, total_sessions, total_dance_time,
        longest_streak, total_events_attended, dance_bonds_count
      `)
      .eq('privy_id', privyId)
      .single();

    if (error || !user) return null;

    // Get achievement count
    const { count: achievementCount } = await this.supabase
      .from('user_achievements')
      .select('id', { count: 'exact' })
      .eq('user_id', privyId);

    return {
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      totalSessions: user.total_sessions ?? 0,
      totalDanceTime: user.total_dance_time ?? 0,
      currentStreak: 0, // Would need to calculate from sessions
      longestStreak: user.longest_streak ?? 0,
      achievementsUnlocked: achievementCount ?? 0,
      eventsAttended: user.total_events_attended ?? 0,
      danceBonds: user.dance_bonds_count ?? 0,
    };
  }

  /**
   * Get active challenges for a user
   */
  async getActiveChallenges(privyId?: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    difficulty: string;
    category: string;
    targetValue: number;
    targetUnit: string;
    xpReward: number;
    pointsReward: number;
    endsAt?: string;
    userProgress?: number;
    userStatus?: string;
  }>> {
    // Get available challenges
    const { data: challenges, error } = await this.supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
      .order('challenge_type', { ascending: true })
      .limit(20);

    if (error || !challenges) return [];

    // If user provided, get their progress
    let userChallenges: Record<string, { progress: number; status: string }> = {};
    if (privyId) {
      const { data: progress } = await this.supabase
        .from('user_challenges')
        .select('challenge_id, progress, status')
        .eq('user_id', privyId)
        .in('challenge_id', challenges.map(c => c.id));

      if (progress) {
        userChallenges = Object.fromEntries(
          progress.map(p => [p.challenge_id, { progress: p.progress, status: p.status }])
        );
      }
    }

    return challenges.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.challenge_type,
      difficulty: c.difficulty,
      category: c.category,
      targetValue: c.target_value,
      targetUnit: c.target_unit,
      xpReward: c.xp_reward,
      pointsReward: c.points_reward,
      endsAt: c.ends_at,
      userProgress: userChallenges[c.id]?.progress,
      userStatus: userChallenges[c.id]?.status,
    }));
  }

  /**
   * Get user's recent achievements
   */
  async getRecentAchievements(privyId: string, limit = 5): Promise<Array<{
    type: string;
    title: string;
    description: string;
    icon: string;
    rarity: string;
    xpReward: number;
    unlockedAt: string;
  }>> {
    const { data, error } = await this.supabase
      .from('user_achievements')
      .select('achievement_type, title, description, icon, xp_reward, unlocked_at')
      .eq('user_id', privyId)
      .order('unlocked_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(a => ({
      type: a.achievement_type,
      title: a.title,
      description: a.description ?? '',
      icon: a.icon ?? '',
      rarity: 'common', // Would need achievement definitions for this
      xpReward: a.xp_reward ?? 0,
      unlockedAt: a.unlocked_at,
    }));
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(limit = 10): Promise<Array<{
    rank: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    challengesCompleted: number;
    xpEarned: number;
  }>> {
    // This would ideally use a view or aggregation
    const { data, error } = await this.supabase
      .from('users')
      .select('username, display_name, avatar_url, xp')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((user, i) => ({
      rank: i + 1,
      username: user.username ?? 'anon',
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      challengesCompleted: 0, // Would need to count from user_challenges
      xpEarned: user.xp ?? 0,
    }));
  }
}

// Factory function for creating adapter
export function createDANZAdapter(config: DANZAdapterConfig): DANZAdapter {
  return new DANZAdapter(config);
}

export default DANZAdapter;
