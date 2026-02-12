/**
 * DANZ Plugin for FlowB
 *
 * Dance events, challenges, stats, leaderboard, and user verification
 * via DANZ.Now's Supabase backend.
 */

import type {
  FlowBPlugin,
  EventProvider,
  FlowBContext,
  ToolInput,
  DANZPluginConfig,
  EventQuery,
  EventResult,
} from "../../types.js";

// ============================================================================
// Types
// ============================================================================

interface DANZUser {
  privy_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  xp?: number;
  level?: number;
}

interface PendingVerification {
  id?: string;
  code: string;
  platform: string;
  platform_user_id: string;
  platform_username?: string;
  expires_at: string;
  verified_at?: string;
  danz_privy_id?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIGNUP_POINTS = 50;
const CODE_LENGTH = 6;
const CODE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const DANZ_BASE_URL = "https://danz.now";

// Local cache for verified users
const verifiedUsers = new Map<string, {
  odId: string;
  danzUsername: string;
  danzPrivyId: string;
  verifiedAt: number;
}>();

// ============================================================================
// Supabase Helpers
// ============================================================================

async function query<T>(
  config: DANZPluginConfig,
  table: string,
  params: Record<string, string>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function insert<T>(
  config: DANZPluginConfig,
  table: string,
  data: Record<string, any>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================================
// DANZ Plugin
// ============================================================================

export class DANZPlugin implements FlowBPlugin, EventProvider {
  id = "danz";
  name = "DANZ.Now";
  description = "Dance events, challenges, stats, and community";
  eventSource = "danz";

  actions = {
    signup: { description: "Get a verification link to connect your DANZ account" },
    join: { description: "Learn about DANZ.Now" },
    verify: { description: "Verify your existing DANZ account" },
    status: { description: "Check verification status" },
    stats: { description: "View your dance stats", requiresAuth: true },
    "my-events": { description: "View events you're registered for", requiresAuth: true },
    challenges: { description: "View active challenges" },
    leaderboard: { description: "View top dancers" },
  };

  private config: DANZPluginConfig | null = null;

  configure(config: DANZPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "DANZ plugin not configured.";

    const userId = input.user_id;
    const platform = input.platform || "openclaw";

    switch (action) {
      case "signup":
        return this.signup(cfg, platform, userId, input.platform_username);
      case "join":
        return this.joinInfo();
      case "verify":
        return this.verify(cfg, userId, input.danz_username);
      case "status":
        return this.checkStatus(cfg, platform, userId);
      case "stats":
        return this.getStats(cfg, platform, userId);
      case "my-events":
        return this.getMyEvents(cfg, platform, userId);
      case "challenges":
        return this.getChallenges(cfg, platform, userId);
      case "leaderboard":
        return this.getLeaderboard(cfg);
      default:
        return `Unknown DANZ action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.config) return [];

    const now = new Date().toISOString();
    const queryParams: Record<string, string> = {
      select: "id,title,description,category,location_name,location_city,price_usd,is_virtual,skill_level,dance_styles,start_date_time,end_date_time",
      start_date_time: `gt.${now}`,
      order: "start_date_time.asc",
      limit: String(params.limit || 10),
    };

    if (params.city) {
      queryParams["location_city"] = `ilike.*${params.city}*`;
    }
    if (params.category) {
      queryParams["category"] = `eq.${params.category}`;
    }
    if (params.danceStyle) {
      queryParams["dance_styles"] = `cs.{${params.danceStyle}}`;
    }

    const events = await query<any[]>(this.config, "events", queryParams);
    if (!events?.length) return [];

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.start_date_time,
      endTime: e.end_date_time,
      locationName: e.location_name,
      locationCity: e.location_city,
      price: e.price_usd,
      isFree: e.price_usd === 0 || e.price_usd === null,
      isVirtual: e.is_virtual,
      danceStyles: e.dance_styles,
      skillLevel: e.skill_level,
      source: "danz",
    }));
  }

  // ========================================================================
  // One-Time Verification (auto-hydrate from DB)
  // ========================================================================

  /**
   * Check if user is verified. Checks in-memory cache first, then falls
   * back to DB lookup. Once verified, the connection persists - users
   * never need to re-verify.
   */
  private async ensureVerified(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
  ): Promise<{ danzPrivyId: string; danzUsername: string } | null> {
    if (!userId) return null;

    // Check in-memory cache first
    const cached = verifiedUsers.get(userId);
    if (cached) return cached;

    // Check DB for completed verification (one-time connection)
    const verifications = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "not.is.null",
      order: "verified_at.desc",
      limit: "1",
    });

    if (!verifications?.length || !verifications[0].danz_privy_id) return null;

    const v = verifications[0];
    const users = await query<DANZUser[]>(cfg, "users", {
      select: "privy_id,username,display_name,xp,level",
      privy_id: `eq.${v.danz_privy_id}`,
      limit: "1",
    });

    const user = users?.[0];
    const username = user?.username || user?.display_name || "Dancer";

    // Cache for future calls in this session
    const verified = {
      odId: userId,
      danzUsername: username,
      danzPrivyId: v.danz_privy_id!,
      verifiedAt: Date.now(),
    };
    verifiedUsers.set(userId, verified);

    return verified;
  }

  // ========================================================================
  // Signup & Verification
  // ========================================================================

  private async signup(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    username?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required for signup.";

    const existing = verifiedUsers.get(userId);
    if (existing) {
      return `You're already verified as **@${existing.danzUsername}** on DANZ.Now!\n\nSay "stats" to see your dance stats.`;
    }

    // Check for existing pending verification
    const pendingList = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "is.null",
      order: "created_at.desc",
      limit: "1",
    });

    if (pendingList?.length) {
      const pending = pendingList[0];
      const expiresAt = new Date(pending.expires_at);
      if (expiresAt > new Date()) {
        const url = `${DANZ_BASE_URL}/link?code=${pending.code}`;
        const hours = Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000));
        return `**You have a pending verification!**\n\nClick to complete: ${url}\n\nThis link expires in ${hours} hours.`;
      }
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS).toISOString();

    const inserted = await insert(cfg, "pending_verifications", {
      code,
      platform,
      platform_user_id: userId,
      platform_username: username || null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    if (!inserted) return "Failed to create verification. Please try again.";

    const url = `${DANZ_BASE_URL}/link?code=${code}`;
    return `**Let's get you verified!**\n\nClick the link below to connect your DANZ.Now account:\n\n${url}\n\n**What happens next:**\n1. Click the link above\n2. Sign up or log in to DANZ.Now\n3. Your accounts will be automatically linked!\n\nThis link expires in 24 hours.`;
  }

  private joinInfo(): string {
    return `**Join DANZ.Now**\n\nThe home for dancers - find events, track your journey, earn achievements, connect with the community.\n\n**New to DANZ?** Say "signup"\n**Already have an account?** Say "verify @your-username"`;
  }

  private async verify(cfg: DANZPluginConfig, userId?: string, danzUsername?: string): Promise<string> {
    if (!userId) return "User ID is required for verification.";
    if (!danzUsername) return `Please provide your DANZ.Now username.\n\nExample: verify @yourname\n\n**Don't have an account yet?** Say "signup" to create one!`;

    const existing = verifiedUsers.get(userId);
    if (existing) {
      return `You're already verified as **@${existing.danzUsername}** on DANZ.Now!`;
    }

    const cleanUsername = danzUsername.toLowerCase().replace("@", "");
    let users = await query<DANZUser[]>(cfg, "users", {
      select: "privy_id,username,display_name,xp,level",
      username: `eq.${cleanUsername}`,
      limit: "1",
    });

    if (!users?.length) {
      users = await query<DANZUser[]>(cfg, "users", {
        select: "privy_id,username,display_name,xp,level",
        display_name: `ilike.${cleanUsername}`,
        limit: "1",
      });
    }

    if (!users?.length) {
      return `No account found for **@${cleanUsername}** on DANZ.Now.\n\nSay "signup" to create a new account.`;
    }

    const user = users[0];

    // Check if already claimed
    for (const [, v] of verifiedUsers) {
      if (v.danzPrivyId === user.privy_id) {
        return "This DANZ.Now account has already been verified by another user.";
      }
    }

    verifiedUsers.set(userId, {
      odId: userId,
      danzUsername: user.username || user.display_name || cleanUsername,
      danzPrivyId: user.privy_id,
      verifiedAt: Date.now(),
    });

    return `**Welcome to the dance community!**\n\nYou're now verified as **@${user.username || user.display_name}** on DANZ.Now!\n\n+${SIGNUP_POINTS} pts\n\nTry "stats" or "challenges" next!`;
  }

  private async checkStatus(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const cached = verifiedUsers.get(userId);
    if (cached) {
      return `You're verified as **@${cached.danzUsername}** on DANZ.Now!\n\nSay "stats" to see your dance stats.`;
    }

    // Check DB for completed verification
    const verifications = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "not.is.null",
      order: "verified_at.desc",
      limit: "1",
    });

    if (verifications?.length && verifications[0].danz_privy_id) {
      const v = verifications[0];
      const users = await query<DANZUser[]>(cfg, "users", {
        select: "privy_id,username,display_name,xp,level",
        privy_id: `eq.${v.danz_privy_id}`,
        limit: "1",
      });

      const user = users?.[0];
      const username = user?.username || user?.display_name || "Dancer";

      verifiedUsers.set(userId, {
        odId: userId,
        danzUsername: username,
        danzPrivyId: v.danz_privy_id!,
        verifiedAt: Date.now(),
      });

      return `**You're verified!**\n\nWelcome back, **@${username}**!\n\n+${SIGNUP_POINTS} pts for signing up!\n\nTry "stats", "challenges", or "events" next.`;
    }

    // Check for pending
    const pending = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "is.null",
      order: "created_at.desc",
      limit: "1",
    });

    if (pending?.length) {
      const p = pending[0];
      const expiresAt = new Date(p.expires_at);
      if (expiresAt > new Date()) {
        const url = `${DANZ_BASE_URL}/link?code=${p.code}`;
        return `**Verification pending**\n\nClick to complete: ${url}\n\nThen say "status" to confirm.`;
      }
      return `Your verification link expired. Say "signup" to get a new one!`;
    }

    return `You haven't started verification yet.\n\nSay "signup" to connect your DANZ.Now account!`;
  }

  // ========================================================================
  // Stats, Challenges, Leaderboard
  // ========================================================================

  private async getStats(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    const users = await query<any[]>(cfg, "users", {
      select: "username,display_name,xp,level,total_sessions,total_dance_time,longest_streak,current_streak,total_events_attended,dance_bonds_count,total_achievements",
      privy_id: `eq.${status.danzPrivyId}`,
      limit: "1",
    });

    if (!users?.length) return "Could not load your stats.";

    const u = users[0];
    const hours = Math.floor((u.total_dance_time || 0) / 60);
    const mins = (u.total_dance_time || 0) % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const name = u.username || u.display_name || status.danzUsername;

    return `**@${name}'s DANZ Stats**\n\n**Level ${u.level || 1}** | ${u.xp || 0} XP\n\nDance Time: ${timeStr}\nSessions: ${u.total_sessions || 0}\nCurrent Streak: ${u.current_streak || 0} days\nLongest Streak: ${u.longest_streak || 0} days\nEvents Attended: ${u.total_events_attended || 0}\nDance Bonds: ${u.dance_bonds_count || 0}\nAchievements: ${u.total_achievements || 0} unlocked`;
  }

  private async getChallenges(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    let privyId: string | undefined;
    if (userId) {
      const verified = await this.ensureVerified(cfg, platform, userId);
      privyId = verified?.danzPrivyId;
    }

    const now = new Date().toISOString();
    const challenges = await query<any[]>(cfg, "challenges", {
      select: "*",
      is_active: "eq.true",
      or: `(ends_at.is.null,ends_at.gt.${now})`,
      order: "challenge_type.asc",
      limit: "15",
    });

    if (!challenges?.length) return "No active challenges right now. Check back soon!";

    const byType: Record<string, any[]> = {};
    for (const c of challenges) {
      const type = c.challenge_type || "OTHER";
      if (!byType[type]) byType[type] = [];
      byType[type].push(c);
    }

    const emoji: Record<string, string> = {
      DAILY: "Daily", WEEKLY: "Weekly", SPECIAL: "Special", EVENT: "Event", STREAK: "Streak", SOCIAL: "Social",
    };

    const lines: string[] = ["**Active Challenges**\n"];
    for (const [type, items] of Object.entries(byType)) {
      lines.push(`**${emoji[type] || type}**`);
      for (const c of items.slice(0, 5)) {
        lines.push(` **${c.title}** - ${c.xp_reward} XP`);
        lines.push(`   ${c.description}`);
      }
      lines.push("");
    }

    lines.push("Complete challenges to earn XP and level up!");
    return lines.join("\n");
  }

  private async getMyEvents(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    const now = new Date().toISOString();

    // Query event registrations with embedded event data
    const registrations = await query<any[]>(cfg, "event_registrations", {
      select: "id,status,events(id,title,start_date_time,end_date_time,location_name,location_city,dance_styles)",
      user_id: `eq.${status.danzPrivyId}`,
      order: "created_at.desc",
      limit: "15",
    });

    if (!registrations?.length) {
      return `**No registered events yet**\n\nSay "events" to discover upcoming events!`;
    }

    // Separate upcoming vs past
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const r of registrations) {
      const event = r.events;
      if (!event) continue;
      if (event.start_date_time > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    const lines: string[] = [`**@${status.danzUsername}'s Events**\n`];

    if (upcoming.length) {
      lines.push(`**Upcoming** (${upcoming.length})\n`);
      for (const e of upcoming) {
        const date = new Date(e.start_date_time);
        const dateStr = date.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit",
        });
        lines.push(`**${e.title}**`);
        lines.push(`${dateStr}`);
        if (e.location_name) {
          lines.push(`${e.location_name}${e.location_city ? `, ${e.location_city}` : ""}`);
        }
        lines.push("");
      }
    }

    if (past.length) {
      lines.push(`**Past** (${past.length})\n`);
      for (const e of past.slice(0, 5)) {
        const date = new Date(e.start_date_time);
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        lines.push(`${dateStr} - ${e.title}`);
      }
      if (past.length > 5) {
        lines.push(`...and ${past.length - 5} more`);
      }
    }

    if (!upcoming.length && !past.length) {
      lines.push(`No events found. Say "events" to discover what's happening!`);
    }

    return lines.join("\n");
  }

  private async getLeaderboard(cfg: DANZPluginConfig): Promise<string> {
    const users = await query<any[]>(cfg, "users", {
      select: "username,display_name,xp,level",
      order: "xp.desc",
      limit: "10",
    });

    if (!users?.length) return "No leaderboard data yet.";

    const medals = ["1.", "2.", "3."];
    const lines: string[] = ["**DANZ Leaderboard**\n"];

    users.forEach((u, i) => {
      const rank = medals[i] || `${i + 1}.`;
      const name = u.display_name || u.username || "Dancer";
      lines.push(`${rank} **${name}** - Level ${u.level || 1} (${u.xp || 0} XP)`);
    });

    return lines.join("\n");
  }
}
