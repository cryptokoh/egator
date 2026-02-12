// ============================================================================
// FlowB Core Types
// ============================================================================

export interface FlowBConfig {
  // Plugin-specific configs
  plugins?: {
    danz?: DANZPluginConfig;
    egator?: EGatorPluginConfig;
    [key: string]: any;
  };
}

export interface DANZPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface EGatorPluginConfig {
  apiBaseUrl: string;
}

// ============================================================================
// FlowB Plugin Interface
// ============================================================================

export interface FlowBPlugin {
  /** Unique plugin identifier */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Actions this plugin handles */
  actions: Record<string, {
    description: string;
    requiresAuth?: boolean;
  }>;

  /** Check if plugin is configured and ready */
  isConfigured(): boolean;

  /** Execute an action */
  execute(action: string, input: ToolInput, context: FlowBContext): Promise<string>;
}

/** Plugin that can provide events */
export interface EventProvider {
  /** Fetch events for discovery */
  getEvents(params: EventQuery): Promise<EventResult[]>;

  /** Source identifier for attribution */
  eventSource: string;
}

export interface EventQuery {
  city?: string;
  category?: string;
  danceStyle?: string;
  limit?: number;
}

export interface EventResult {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  locationName?: string;
  locationCity?: string;
  price?: number;
  isFree?: boolean;
  isVirtual?: boolean;
  danceStyles?: string[];
  skillLevel?: string;
  source: string;
  url?: string;
}

// ============================================================================
// FlowB Context & Input
// ============================================================================

export interface FlowBContext {
  userId?: string;
  platform: string;
  config: FlowBConfig;
}

export interface ToolInput {
  action: string;
  /** For multi-action requests: array of sub-actions to execute in one call */
  actions?: Array<{ action: string; query?: string; category?: string; city?: string }>;
  user_id?: string;
  platform?: "telegram" | "discord" | "farcaster" | "openclaw" | "web";
  platform_username?: string;
  danz_username?: string;
  city?: string;
  category?: string;
  dance_style?: string;
  query?: string;
  ref_code?: string;
}

// ============================================================================
// FlowB Points System
// ============================================================================

export enum PointAction {
  // Interaction
  ASK = "ask",
  DISCOVER_EVENTS = "discover_events",
  SEARCH_EVENTS = "search_events",
  VIEW_EVENT = "view_event",
  // Engagement
  COMPLETE_VERIFICATION = "complete_verification",
  CHECK_STATS = "check_stats",
  CHECK_CHALLENGES = "check_challenges",
  CHECK_LEADERBOARD = "check_leaderboard",
  SET_LOCATION = "set_location",
  // Social
  SHARE_EVENT = "share_event",
  REFERRAL_CLICK = "referral_click",
  REFERRAL_SIGNUP = "referral_signup",
  REFERRAL_WELCOME = "referral_welcome",
  // Loyalty
  DAILY_INTERACTION = "daily_interaction",
  STREAK_3 = "streak_3",
  STREAK_7 = "streak_7",
  STREAK_30 = "streak_30",
  // First-time
  FIRST_SEARCH = "first_search",
  FIRST_EVENT_CLICK = "first_event_click",
  FIRST_MOOD = "first_mood",
  FIRST_FILTER = "first_filter",
  FIRST_PLATFORM = "first_platform",
  FIRST_SHARE = "first_share",
}

export interface PointActionConfig {
  points: number;
  dailyCap: number | null; // null = once-only or unlimited
}

export const POINT_VALUES: Record<PointAction, PointActionConfig> = {
  [PointAction.ASK]: { points: 1, dailyCap: 20 },
  [PointAction.DISCOVER_EVENTS]: { points: 2, dailyCap: 10 },
  [PointAction.SEARCH_EVENTS]: { points: 3, dailyCap: 10 },
  [PointAction.VIEW_EVENT]: { points: 2, dailyCap: 15 },
  [PointAction.COMPLETE_VERIFICATION]: { points: 25, dailyCap: null },
  [PointAction.CHECK_STATS]: { points: 1, dailyCap: 3 },
  [PointAction.CHECK_CHALLENGES]: { points: 1, dailyCap: 3 },
  [PointAction.CHECK_LEADERBOARD]: { points: 1, dailyCap: 3 },
  [PointAction.SET_LOCATION]: { points: 2, dailyCap: 1 },
  [PointAction.SHARE_EVENT]: { points: 5, dailyCap: 5 },
  [PointAction.REFERRAL_CLICK]: { points: 3, dailyCap: 20 },
  [PointAction.REFERRAL_SIGNUP]: { points: 15, dailyCap: null },
  [PointAction.REFERRAL_WELCOME]: { points: 10, dailyCap: null },
  [PointAction.DAILY_INTERACTION]: { points: 5, dailyCap: 1 },
  [PointAction.STREAK_3]: { points: 10, dailyCap: null },
  [PointAction.STREAK_7]: { points: 25, dailyCap: null },
  [PointAction.STREAK_30]: { points: 100, dailyCap: null },
  [PointAction.FIRST_SEARCH]: { points: 5, dailyCap: null },
  [PointAction.FIRST_EVENT_CLICK]: { points: 5, dailyCap: null },
  [PointAction.FIRST_MOOD]: { points: 3, dailyCap: null },
  [PointAction.FIRST_FILTER]: { points: 3, dailyCap: null },
  [PointAction.FIRST_PLATFORM]: { points: 10, dailyCap: null },
  [PointAction.FIRST_SHARE]: { points: 5, dailyCap: null },
};

export interface Milestone {
  points: number;
  level: number;
  title: string;
  message: string;
}

export const MILESTONES: Milestone[] = [
  { points: 25, level: 1, title: "Explorer", message: "You're getting the hang of this!" },
  { points: 50, level: 2, title: "Seeker", message: "You've found your rhythm." },
  { points: 100, level: 3, title: "Pathfinder", message: "100 points - you know your way around." },
  { points: 250, level: 4, title: "Navigator", message: "A true navigator of vibes." },
  { points: 500, level: 5, title: "Trailblazer", message: "Half a thousand. Impressive." },
  { points: 1000, level: 6, title: "Legend", message: "Welcome to the 1K club." },
];

export interface PointAwardResult {
  awarded: boolean;
  points: number;
  total: number;
  milestone?: Milestone;
  streak?: number;
}

export interface PointBalance {
  totalPoints: number;
  streak: number;
  longestStreak: number;
  referralCode: string | null;
  milestoneLevel: number;
  milestoneName: string | null;
}

export interface FlowBPointsConfig {
  supabaseUrl: string;
  supabaseKey: string;
}
