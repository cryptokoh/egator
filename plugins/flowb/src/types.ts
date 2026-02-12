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
  user_id?: string;
  platform?: "telegram" | "discord" | "farcaster" | "openclaw";
  platform_username?: string;
  danz_username?: string;
  city?: string;
  category?: string;
  dance_style?: string;
  query?: string;
}
