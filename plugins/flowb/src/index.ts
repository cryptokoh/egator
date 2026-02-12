/**
 * FlowB - FlowBond's Core Agent
 *
 * A privacy-centric assistant that helps users flow and bond.
 * Loads plugins for domain-specific capabilities:
 *   - danz:   Dance events, challenges, stats
 *   - egator: Aggregated multi-source event discovery
 *   - (more plugins coming: harmonik, etc.)
 *
 * FlowB handles:
 *   - Plugin routing and orchestration
 *   - Unified event discovery across plugins
 *   - Core help and onboarding
 */

import type { FlowBPlugin, EventProvider, FlowBConfig, ToolInput, FlowBContext, EventResult, PointAwardResult, FlowBPointsConfig } from "./types.js";
import { PointAction } from "./types.js";
import { DANZPlugin } from "./plugins/danz/index.js";
import { EGatorPlugin, formatEventList } from "./plugins/egator/index.js";
import { PointsService } from "./services/points.js";

// ============================================================================
// Plugin Registry
// ============================================================================

const plugins: Map<string, FlowBPlugin> = new Map();
const eventProviders: EventProvider[] = [];
let pointsService: PointsService | null = null;

function registerPlugin(plugin: FlowBPlugin) {
  plugins.set(plugin.id, plugin);
  // If the plugin can provide events, track it
  if ("getEvents" in plugin && "eventSource" in plugin) {
    eventProviders.push(plugin as unknown as EventProvider);
  }
}

// ============================================================================
// Core Actions
// ============================================================================

/** Unified event discovery - queries all event-providing plugins and merges results */
async function discoverEvents(input: ToolInput): Promise<string> {
  const configuredProviders = eventProviders.filter((p) => {
    const plugin = plugins.get((p as unknown as FlowBPlugin).id);
    return plugin?.isConfigured();
  });

  if (configuredProviders.length === 0) {
    return "No event sources are configured. Ask your admin to set up DANZ or eGator.";
  }

  // Query all providers in parallel
  const results = await Promise.allSettled(
    configuredProviders.map((provider) =>
      provider.getEvents({
        city: input.city,
        category: input.category,
        danceStyle: input.dance_style,
        limit: 10,
      })
    )
  );

  // Merge results
  const allEvents: EventResult[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length) {
      allEvents.push(...result.value);
    }
  }

  if (allEvents.length === 0) {
    const cityNote = input.city ? ` in ${input.city}` : "";
    return `No upcoming events found${cityNote}. Check back soon!`;
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Dedupe by title similarity (simple exact match for now)
  const seen = new Set<string>();
  const unique = allEvents.filter((e) => {
    const key = e.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sourceCount = new Set(unique.map((e) => e.source)).size;
  const title = input.city
    ? `Upcoming Events in ${input.city}`
    : "Upcoming Events";
  const subtitle = sourceCount > 1 ? ` (from ${sourceCount} sources)` : "";

  return formatEventList(unique.slice(0, 15), `${title}${subtitle}`);
}

function showHelp(): string {
  const lines: string[] = [
    "**FlowB - Your Flow & Bond Assistant**",
    "",
    "**Events**",
    "- **events** - Discover upcoming events",
    "- **categories** - Browse by category (DeFi, AI, Infra, etc.)",
    "- **browse [category]** - Events in a category",
    "- **tonight** - Tonight's events",
    "- **week** - This week's events",
    "- **free** - Free events only",
    "- **search [query]** - Search events",
    "",
  ];

  // Add plugin-specific help
  for (const [, plugin] of plugins) {
    if (!plugin.isConfigured()) continue;

    const actionNames = Object.keys(plugin.actions);
    if (actionNames.length) {
      lines.push(`**${plugin.name}**`);
      for (const [name, info] of Object.entries(plugin.actions)) {
        lines.push(`- **${name}** - ${info.description}`);
      }
      lines.push("");
    }
  }

  // Points section
  if (pointsService) {
    lines.push("**Points**");
    lines.push("- **points** - Check your FlowB points and milestone");
    lines.push("- **referral** - Get your referral link");
    lines.push("");
  }

  lines.push("- **help** - Show this message");

  return lines.join("\n");
}

// ============================================================================
// Points Integration
// ============================================================================

/** Map FlowB actions to point actions for automatic awarding */
const ACTION_POINT_MAP: Record<string, PointAction> = {
  events: PointAction.DISCOVER_EVENTS,
  search: PointAction.SEARCH_EVENTS,
  categories: PointAction.DISCOVER_EVENTS,
  browse: PointAction.DISCOVER_EVENTS,
  tonight: PointAction.DISCOVER_EVENTS,
  week: PointAction.DISCOVER_EVENTS,
  free: PointAction.DISCOVER_EVENTS,
  help: PointAction.ASK,
  stats: PointAction.CHECK_STATS,
  challenges: PointAction.CHECK_CHALLENGES,
  leaderboard: PointAction.CHECK_LEADERBOARD,
  signup: PointAction.ASK,
  join: PointAction.ASK,
  verify: PointAction.COMPLETE_VERIFICATION,
  status: PointAction.ASK,
  "my-events": PointAction.ASK,
};

/** Format a subtle points footer for chat responses */
function appendPointsFooter(response: string, result: PointAwardResult): string {
  if (!result.awarded) return response;

  let footer = `+${result.points} pts  |  ${result.total} total`;
  if (result.milestone) {
    footer += `  ${result.milestone.title}!`;
  }

  return `${response}\n\n---\n${footer}`;
}

/** Award points for an action and handle daily + streak bonuses */
async function awardForAction(
  userId: string | undefined,
  platform: string,
  action: string,
): Promise<PointAwardResult | null> {
  if (!pointsService || !userId) return null;

  const pointAction = ACTION_POINT_MAP[action];
  if (!pointAction) return null;

  const result = await pointsService.awardPoints(userId, platform, pointAction);

  // Also award daily interaction bonus (once per day)
  await pointsService.awardPoints(userId, platform, PointAction.DAILY_INTERACTION);

  // Check for streak bonuses (3/7/30 day thresholds)
  await pointsService.updateStreak(userId, platform);

  // If this was a verification, also process referral signup bonus
  if (action === "verify" && result.awarded) {
    await pointsService.processReferralSignup(userId, platform);
  }

  return result;
}

// ============================================================================
// OpenClaw Plugin Registration
// ============================================================================

export default function register(api: any) {
  const rawConfig = api.config || {};

  // Build FlowB config from raw OpenClaw config
  const config: FlowBConfig = {
    plugins: {
      danz: rawConfig.danzSupabaseUrl ? {
        supabaseUrl: rawConfig.danzSupabaseUrl,
        supabaseKey: rawConfig.danzSupabaseKey,
      } : undefined,
      egator: rawConfig.apiBaseUrl ? {
        apiBaseUrl: rawConfig.apiBaseUrl,
      } : undefined,
    },
  };

  // Initialize points service (reuses DANZ Supabase for now)
  if (rawConfig.danzSupabaseUrl && rawConfig.danzSupabaseKey) {
    pointsService = new PointsService({
      supabaseUrl: rawConfig.danzSupabaseUrl,
      supabaseKey: rawConfig.danzSupabaseKey,
    });
  }

  // Initialize plugins
  const danz = new DANZPlugin();
  if (config.plugins?.danz) {
    danz.configure(config.plugins.danz);
  }
  registerPlugin(danz);

  const egator = new EGatorPlugin();
  if (config.plugins?.egator) {
    egator.configure(config.plugins.egator);
  }
  registerPlugin(egator);

  // Register the FlowB tool with OpenClaw
  const toolSchema = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          // Core actions
          "events",
          "help",
          // DANZ actions
          "signup",
          "join",
          "verify",
          "status",
          "stats",
          "challenges",
          "leaderboard",
          // eGator actions
          "search",
          "categories",
          "browse",
          "tonight",
          "week",
          "free",
          // DANZ additional
          "my-events",
          // Points actions
          "points",
          "referral",
        ],
        description: "The action to perform",
      },
      user_id: { type: "string", description: "User identifier" },
      platform: {
        type: "string",
        enum: ["telegram", "discord", "farcaster", "openclaw"],
        description: "User's platform",
      },
      platform_username: { type: "string", description: "Username on the platform" },
      danz_username: { type: "string", description: "DANZ.Now username for verification" },
      city: { type: "string", description: "City filter for events" },
      category: { type: "string", description: "Event category filter" },
      dance_style: { type: "string", description: "Dance style filter" },
      query: { type: "string", description: "Search query" },
      ref_code: { type: "string", description: "Referral code" },
    },
    required: ["action"],
  };

  api.registerTool({
    name: "flowb",
    description: `FlowB - Your Flow & Bond Assistant. Privacy-centric helper for events, dance community, and more.

EVENTS:
- events: Discover upcoming events from all sources
- categories: Browse events by category (DeFi, AI, Infra, Build, Capital, Social, Wellness, Privacy, Art)
- browse [category]: See events in a category (e.g. "browse defi", "browse ai")
- tonight: Events happening tonight
- week: Events this week
- free: Free events only
- search [query]: Search events by keyword

DANZ.NOW (dance community):
- signup: Connect your DANZ.Now account
- verify @username: Link existing DANZ account
- stats: Your dance stats & achievements
- my-events: Events you're registered for
- challenges: Active daily & weekly challenges
- leaderboard: Top dancers

POINTS:
- points: Check your FlowB points balance and milestone
- referral: Get your referral link to share with friends

- help: Show all commands`,
    inputSchema: toolSchema,
    parameters: toolSchema,

    async execute(input: ToolInput): Promise<string> {
      const context: FlowBContext = {
        userId: input.user_id,
        platform: input.platform || "openclaw",
        config,
      };
      const userId = input.user_id;
      const platform = input.platform || "openclaw";

      try {
        // Points-specific actions
        if (input.action === "points" && pointsService && userId) {
          const balance = await pointsService.getBalance(userId, platform);
          let msg = `**Your FlowB Points**\n\n**${balance.totalPoints}** pts`;
          if (balance.milestoneName) msg += `  |  ${balance.milestoneName}`;
          if (balance.streak > 0) msg += `\nStreak: ${balance.streak} day${balance.streak > 1 ? "s" : ""}`;
          if (balance.referralCode) msg += `\nReferral code: ${balance.referralCode}`;
          return msg;
        }

        if (input.action === "referral" && pointsService && userId) {
          const code = await pointsService.getReferralCode(userId, platform);
          if (!code) return "Could not generate referral code. Try again.";
          return `**Your Referral Link**\n\nShare this with friends:\nhttps://aiegator.app/?ref=${code}\n\nYou earn **+3 pts** per click and **+15 pts** when they register!`;
        }

        let response: string;

        // Core actions handled by FlowB directly
        switch (input.action) {
          case "events":
            response = await discoverEvents(input);
            break;
          case "help":
            response = showHelp();
            break;
          default: {
            // Route to plugins
            let handled = false;
            for (const [, plugin] of plugins) {
              if (input.action in plugin.actions && plugin.isConfigured()) {
                response = await plugin.execute(input.action, input, context);
                handled = true;
                break;
              }
            }
            if (!handled) {
              response = showHelp();
            }
            break;
          }
        }

        // Award points for the action and append footer
        const pointResult = await awardForAction(userId, platform, input.action);
        if (pointResult?.awarded) {
          response = appendPointsFooter(response!, pointResult);
        }

        return response!;
      } catch (err) {
        console.error("[flowb] Error:", err);
        return "Something went wrong. Please try again.";
      }
    },
  });

  // Log status
  const configured = Array.from(plugins.values())
    .filter((p) => p.isConfigured())
    .map((p) => p.name);

  api.logger?.info(`[flowb] Agent loaded | Plugins: ${configured.join(", ") || "none"}`);
}
