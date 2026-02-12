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

import type { FlowBPlugin, EventProvider, FlowBConfig, ToolInput, FlowBContext, EventResult } from "./types.js";
import { DANZPlugin } from "./plugins/danz/index.js";
import { EGatorPlugin, formatEventList } from "./plugins/egator/index.js";

// ============================================================================
// Plugin Registry
// ============================================================================

const plugins: Map<string, FlowBPlugin> = new Map();
const eventProviders: EventProvider[] = [];

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
    '- **events in [city]** - Events in a specific city',
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

  lines.push("- **help** - Show this message");

  return lines.join("\n");
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
          // DANZ additional
          "my-events",
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
    },
    required: ["action"],
  };

  api.registerTool({
    name: "flowb",
    description: `FlowB - Your Flow & Bond Assistant. Privacy-centric helper for events, dance community, and more.

EVENTS:
- events: Discover upcoming events from all sources
- events in [city]: Events in a specific city

DANZ.NOW (dance community):
- signup: Connect your DANZ.Now account
- verify @username: Link existing DANZ account
- stats: Your dance stats & achievements
- my-events: Events you're registered for
- challenges: Active daily & weekly challenges
- leaderboard: Top dancers

OTHER:
- search: Search events across all sources
- help: Show all commands`,
    inputSchema: toolSchema,
    parameters: toolSchema,

    async execute(input: ToolInput): Promise<string> {
      const context: FlowBContext = {
        userId: input.user_id,
        platform: input.platform || "openclaw",
        config,
      };

      try {
        // Core actions handled by FlowB directly
        switch (input.action) {
          case "events":
            return await discoverEvents(input);
          case "help":
            return showHelp();
        }

        // Route to plugins
        for (const [, plugin] of plugins) {
          if (input.action in plugin.actions && plugin.isConfigured()) {
            return await plugin.execute(input.action, input, context);
          }
        }

        // Fallback
        return showHelp();
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
