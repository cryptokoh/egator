/**
 * FlowB Points Service
 *
 * Unified cross-platform points system with daily caps, milestones,
 * streaks, first-time bonuses, and referral tracking.
 */

import type {
  PointAwardResult,
  PointBalance,
  FlowBPointsConfig,
  Milestone,
} from "../types.js";
import { PointAction, POINT_VALUES, MILESTONES } from "../types.js";
import { query, insert } from "../utils/supabase.js";
import type { SupabaseConfig } from "../utils/supabase.js";

// ============================================================================
// Helpers
// ============================================================================

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateReferralCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getMilestoneForPoints(total: number): Milestone | undefined {
  // Return the highest milestone at or below total
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (total >= MILESTONES[i].points) return MILESTONES[i];
  }
  return undefined;
}

function getMilestoneLevel(total: number): number {
  const m = getMilestoneForPoints(total);
  return m ? m.level : 0;
}

// ============================================================================
// PointsService
// ============================================================================

export class PointsService {
  private config: SupabaseConfig;

  constructor(config: FlowBPointsConfig) {
    this.config = {
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
    };
  }

  /**
   * Award points for an action. Handles daily caps, first-time bonuses,
   * streak updates, and milestone detection.
   */
  async awardPoints(
    userId: string,
    platform: string,
    action: PointAction,
    metadata?: Record<string, any>,
  ): Promise<PointAwardResult> {
    const actionConfig = POINT_VALUES[action];
    if (!actionConfig) {
      return { awarded: false, points: 0, total: 0 };
    }

    // Ensure user row exists
    const userPoints = await this.ensureUserPoints(userId, platform);
    if (!userPoints) {
      return { awarded: false, points: 0, total: 0 };
    }

    // Check first-time actions (null dailyCap = once-only for FIRST_* actions)
    if (action.startsWith("first_")) {
      const firstActions = userPoints.first_actions || {};
      if (firstActions[action]) {
        return { awarded: false, points: 0, total: userPoints.total_points };
      }
    }

    // Check once-only actions (verification, welcome, streaks)
    const onceOnlyActions = [
      PointAction.COMPLETE_VERIFICATION,
      PointAction.REFERRAL_WELCOME,
      PointAction.STREAK_3,
      PointAction.STREAK_7,
      PointAction.STREAK_30,
    ];
    if (onceOnlyActions.includes(action) && actionConfig.dailyCap === null) {
      const existing = await this.getLedgerCount(userId, platform, action);
      if (existing > 0) {
        return { awarded: false, points: 0, total: userPoints.total_points };
      }
    }

    // Check daily cap
    if (actionConfig.dailyCap !== null && actionConfig.dailyCap > 0) {
      const todayCount = await this.getTodayCount(userId, platform, action);
      if (todayCount >= actionConfig.dailyCap) {
        return { awarded: false, points: 0, total: userPoints.total_points };
      }
    }

    // Insert ledger entry
    await insert(this.config, "flowb_points_ledger", {
      user_id: userId,
      platform,
      action,
      points: actionConfig.points,
      metadata: metadata || {},
    });

    // Update total + first_actions + streak
    const newTotal = userPoints.total_points + actionConfig.points;
    const today = todayDateStr();

    const updates: Record<string, any> = {
      total_points: newTotal,
      updated_at: new Date().toISOString(),
    };

    // Track first-time actions
    if (action.startsWith("first_")) {
      const firstActions = { ...(userPoints.first_actions || {}), [action]: today };
      updates.first_actions = firstActions;
    }

    // Update streak
    const streakResult = this.calculateStreak(
      userPoints.last_active_date,
      userPoints.current_streak,
      userPoints.longest_streak,
    );
    updates.current_streak = streakResult.currentStreak;
    updates.longest_streak = streakResult.longestStreak;
    updates.last_active_date = today;

    // Check milestone
    const oldLevel = userPoints.milestone_level;
    const newLevel = getMilestoneLevel(newTotal);
    if (newLevel > oldLevel) {
      updates.milestone_level = newLevel;
    }

    await this.updateUserPoints(userId, platform, updates);

    // Build result
    const milestone = newLevel > oldLevel
      ? MILESTONES.find((m) => m.level === newLevel)
      : undefined;

    return {
      awarded: true,
      points: actionConfig.points,
      total: newTotal,
      milestone,
      streak: streakResult.currentStreak,
    };
  }

  /**
   * Get user's current point balance and status.
   */
  async getBalance(userId: string, platform: string): Promise<PointBalance> {
    const userPoints = await this.ensureUserPoints(userId, platform);
    if (!userPoints) {
      return {
        totalPoints: 0,
        streak: 0,
        longestStreak: 0,
        referralCode: null,
        milestoneLevel: 0,
        milestoneName: null,
      };
    }

    const milestone = getMilestoneForPoints(userPoints.total_points);

    return {
      totalPoints: userPoints.total_points,
      streak: userPoints.current_streak,
      longestStreak: userPoints.longest_streak,
      referralCode: userPoints.referral_code,
      milestoneLevel: userPoints.milestone_level,
      milestoneName: milestone?.title || null,
    };
  }

  /**
   * Generate or retrieve referral code for a user.
   */
  async getReferralCode(userId: string, platform: string): Promise<string | null> {
    const userPoints = await this.ensureUserPoints(userId, platform);
    if (!userPoints) return null;

    if (userPoints.referral_code) return userPoints.referral_code;

    // Generate new code
    const code = generateReferralCode();
    await this.updateUserPoints(userId, platform, { referral_code: code });
    return code;
  }

  /**
   * Process when someone clicks a referral link.
   */
  async processReferralClick(
    referralCode: string,
    clickerUserId: string,
    platform: string,
  ): Promise<boolean> {
    // Find the referrer
    const referrers = await query<any[]>(this.config, "flowb_user_points", {
      select: "user_id,platform",
      referral_code: `eq.${referralCode}`,
      limit: "1",
    });

    if (!referrers?.length) return false;

    const referrer = referrers[0];

    // Don't award if clicking own link
    if (referrer.user_id === clickerUserId) return false;

    // Award referrer for the click
    await this.awardPoints(referrer.user_id, referrer.platform, PointAction.REFERRAL_CLICK, {
      clicker: clickerUserId,
    });

    // Store referred_by on clicker's record
    const clickerPoints = await this.ensureUserPoints(clickerUserId, platform);
    if (clickerPoints && !clickerPoints.referred_by) {
      await this.updateUserPoints(clickerUserId, platform, {
        referred_by: referralCode,
      });
    }

    return true;
  }

  /**
   * Process when a referred user registers/verifies.
   */
  async processReferralSignup(userId: string, platform: string): Promise<void> {
    const userPoints = await this.ensureUserPoints(userId, platform);
    if (!userPoints?.referred_by) return;

    // Award the new user welcome bonus
    await this.awardPoints(userId, platform, PointAction.REFERRAL_WELCOME);

    // Award the referrer signup bonus
    const referrers = await query<any[]>(this.config, "flowb_user_points", {
      select: "user_id,platform",
      referral_code: `eq.${userPoints.referred_by}`,
      limit: "1",
    });

    if (referrers?.length) {
      await this.awardPoints(
        referrers[0].user_id,
        referrers[0].platform,
        PointAction.REFERRAL_SIGNUP,
        { referred_user: userId },
      );
    }
  }

  /**
   * Update streak and award streak bonuses. Called internally by awardPoints,
   * but can also be called directly for daily login detection.
   */
  async updateStreak(userId: string, platform: string): Promise<PointAwardResult | null> {
    const userPoints = await this.ensureUserPoints(userId, platform);
    if (!userPoints) return null;

    const streakResult = this.calculateStreak(
      userPoints.last_active_date,
      userPoints.current_streak,
      userPoints.longest_streak,
    );

    // Check for streak bonuses
    const streak = streakResult.currentStreak;
    let bonusResult: PointAwardResult | null = null;

    if (streak >= 30) {
      bonusResult = await this.awardPoints(userId, platform, PointAction.STREAK_30);
    } else if (streak >= 7) {
      bonusResult = await this.awardPoints(userId, platform, PointAction.STREAK_7);
    } else if (streak >= 3) {
      bonusResult = await this.awardPoints(userId, platform, PointAction.STREAK_3);
    }

    return bonusResult;
  }

  /**
   * Transfer anonymous points to a registered user account.
   */
  async transferPoints(
    fromUserId: string,
    toUserId: string,
    platform: string,
  ): Promise<boolean> {
    const fromPoints = await this.ensureUserPoints(fromUserId, platform);
    if (!fromPoints || fromPoints.total_points === 0) return false;

    const toPoints = await this.ensureUserPoints(toUserId, platform);
    if (!toPoints) return false;

    // Add points to target
    await this.updateUserPoints(toUserId, platform, {
      total_points: toPoints.total_points + fromPoints.total_points,
      // Merge first_actions
      first_actions: { ...(toPoints.first_actions || {}), ...(fromPoints.first_actions || {}) },
      // Keep best streak
      current_streak: Math.max(toPoints.current_streak, fromPoints.current_streak),
      longest_streak: Math.max(toPoints.longest_streak, fromPoints.longest_streak),
      // Keep referral if target doesn't have one
      referred_by: toPoints.referred_by || fromPoints.referred_by,
    });

    // Zero out source
    await this.updateUserPoints(fromUserId, platform, {
      total_points: 0,
    });

    return true;
  }

  // ========================================================================
  // Internal helpers
  // ========================================================================

  private async ensureUserPoints(userId: string, platform: string): Promise<any | null> {
    const rows = await query<any[]>(this.config, "flowb_user_points", {
      select: "*",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      limit: "1",
    });

    if (rows?.length) return rows[0];

    // Create new row
    return await insert(this.config, "flowb_user_points", {
      user_id: userId,
      platform,
      total_points: 0,
      current_streak: 0,
      longest_streak: 0,
      first_actions: {},
      milestone_level: 0,
    });
  }

  private async updateUserPoints(
    userId: string,
    platform: string,
    data: Record<string, any>,
  ): Promise<void> {
    const url = new URL(`${this.config.supabaseUrl}/rest/v1/flowb_user_points`);
    url.searchParams.set("user_id", `eq.${userId}`);
    url.searchParams.set("platform", `eq.${platform}`);

    await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        apikey: this.config.supabaseKey,
        Authorization: `Bearer ${this.config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(data),
    });
  }

  private async getTodayCount(userId: string, platform: string, action: string): Promise<number> {
    const today = todayDateStr();
    const rows = await query<any[]>(this.config, "flowb_points_ledger", {
      select: "id",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      action: `eq.${action}`,
      created_at: `gte.${today}T00:00:00Z`,
    });
    return rows?.length || 0;
  }

  private async getLedgerCount(userId: string, platform: string, action: string): Promise<number> {
    const rows = await query<any[]>(this.config, "flowb_points_ledger", {
      select: "id",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      action: `eq.${action}`,
    });
    return rows?.length || 0;
  }

  private calculateStreak(
    lastActiveDate: string | null,
    currentStreak: number,
    longestStreak: number,
  ): { currentStreak: number; longestStreak: number } {
    const today = todayDateStr();

    if (!lastActiveDate) {
      return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) };
    }

    if (lastActiveDate === today) {
      // Already active today, no change
      return { currentStreak, longestStreak };
    }

    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastActiveDate === yesterdayStr) {
      // Consecutive day
      const newStreak = currentStreak + 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
      };
    }

    // Streak broken - reset to 1
    return { currentStreak: 1, longestStreak };
  }
}
