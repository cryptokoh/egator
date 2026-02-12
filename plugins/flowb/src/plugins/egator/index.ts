/**
 * eGator Plugin for FlowB
 *
 * Aggregated event discovery from multiple sources via the AIeGator API.
 * Pulls from Ticketmaster, Luma, Eventbrite, DANZ, and more.
 */

import type {
  FlowBPlugin,
  EventProvider,
  FlowBContext,
  ToolInput,
  EGatorPluginConfig,
  EventQuery,
  EventResult,
} from "../../types.js";

export class EGatorPlugin implements FlowBPlugin, EventProvider {
  id = "egator";
  name = "eGator Events";
  description = "Aggregated event discovery from multiple sources";
  eventSource = "egator";

  actions = {
    search: { description: "Search events across all sources" },
    categories: { description: "Browse events by category (DeFi, AI, Infra, etc.)" },
    browse: { description: "Browse events in a specific category" },
    tonight: { description: "Events happening tonight" },
    week: { description: "Events this week" },
    free: { description: "Free events only" },
  };

  private config: EGatorPluginConfig | null = null;

  configure(config: EGatorPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config?.apiBaseUrl;
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config) return "eGator plugin not configured.";

    switch (action) {
      case "search":
        return this.searchEvents(input);
      case "categories":
        return this.showCategories();
      case "browse":
        return this.browseCategory(input);
      case "tonight":
        return this.tonightEvents();
      case "week":
        return this.weekEvents();
      case "free":
        return this.freeEvents();
      default:
        return `Unknown eGator action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.config) return [];

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: params.city,
          limit: params.limit || 10,
          ...(params.danceStyle ? { isDance: true } : {}),
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const events = data.events || [];

      return events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        locationName: e.venue?.name,
        locationCity: e.venue?.city,
        price: e.price?.min,
        isFree: e.isFree ?? !e.price?.min,
        isVirtual: e.isOnline || false,
        danceStyles: e.tags || [],
        source: e.source || "egator",
        url: e.url,
        organizer: e.organizer?.name,
        categories: e.categories || [],
        attendeeCount: e.attendeeCount,
        imageUrl: e.imageUrl,
      }));
    } catch (err) {
      console.error("[egator] API fetch failed:", err);
      return [];
    }
  }

  // ========================================================================
  // Actions
  // ========================================================================

  private async searchEvents(input: ToolInput): Promise<string> {
    if (!this.config) return "Not configured.";

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.query || input.city,
          mainCategory: input.category,
          limit: 10,
        }),
      });

      if (!res.ok) return "Search failed. Try again.";
      const data = await res.json();
      const events = data.events || [];

      if (!events.length) {
        return `No events found. Try "categories" to browse by type.`;
      }

      return formatEventList(events, "Search Results");
    } catch {
      return "Search failed. Try again.";
    }
  }

  private async showCategories(): Promise<string> {
    if (!this.config) return "Not configured.";

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/categories`);
      if (!res.ok) return "Failed to load categories.";
      const data = await res.json();

      const lines = ["**Event Categories**\n"];
      for (const cat of data.categories) {
        lines.push(`${cat.emoji} **${cat.label}** — ${cat.count} events`);
      }
      lines.push("");
      lines.push('Say "browse defi" or "browse ai" to see events in a category.');
      lines.push('Or try: "tonight", "this week", "free events"');

      return lines.join("\n");
    } catch {
      return "Failed to load categories.";
    }
  }

  private async browseCategory(input: ToolInput): Promise<string> {
    if (!this.config) return "Not configured.";

    const category = (input.category || input.query || "").toLowerCase().trim();

    // Map common aliases
    const aliases: Record<string, string> = {
      "defi": "defi", "trading": "defi", "finance": "defi",
      "ai": "ai", "agents": "ai", "artificial intelligence": "ai",
      "infra": "infra", "infrastructure": "infra", "l2": "infra", "scaling": "infra",
      "build": "build", "builder": "build", "dev": "build", "hack": "build", "hackathon": "build",
      "capital": "capital", "vc": "capital", "investor": "capital", "funding": "capital",
      "social": "social", "party": "social", "networking": "social", "happy hour": "social",
      "wellness": "wellness", "fitness": "wellness", "health": "wellness",
      "privacy": "privacy", "security": "privacy", "zk": "privacy",
      "art": "art", "culture": "art", "nft": "art",
    };

    const mainCategory = aliases[category] || category;

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainCategory, limit: 10 }),
      });

      if (!res.ok) return "Failed to browse category.";
      const data = await res.json();
      const events = data.events || [];

      if (!events.length) {
        return `No events in "${category}". Try "categories" to see all options.`;
      }

      return formatEventList(events, `${mainCategory.charAt(0).toUpperCase() + mainCategory.slice(1)} Events`);
    } catch {
      return "Failed to browse category.";
    }
  }

  private async tonightEvents(): Promise<string> {
    if (!this.config) return "Not configured.";

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover/tonight`);
      if (!res.ok) return "Failed to fetch tonight's events.";
      const data = await res.json();

      if (!data.events?.length) {
        return "No events happening tonight. Try \"this week\" or \"categories\".";
      }

      return formatEventList(data.events, "Tonight's Events");
    } catch {
      return "Failed to fetch tonight's events.";
    }
  }

  private async weekEvents(): Promise<string> {
    if (!this.config) return "Not configured.";

    try {
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: now.toISOString().slice(0, 10),
          endDate: endOfWeek.toISOString().slice(0, 10),
          limit: 15,
        }),
      });

      if (!res.ok) return "Failed to fetch this week's events.";
      const data = await res.json();

      if (!data.events?.length) {
        return "No events this week. Try \"categories\" to browse all events.";
      }

      return formatEventList(data.events, "This Week's Events");
    } catch {
      return "Failed to fetch this week's events.";
    }
  }

  private async freeEvents(): Promise<string> {
    if (!this.config) return "Not configured.";

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeOnly: true, limit: 10 }),
      });

      if (!res.ok) return "Failed to fetch free events.";
      const data = await res.json();

      if (!data.events?.length) {
        return "No free events found. Try \"categories\" to browse all events.";
      }

      return formatEventList(data.events, "Free Events");
    } catch {
      return "Failed to fetch free events.";
    }
  }
}

// ============================================================================
// Shared formatting
// ============================================================================

export function formatEventList(events: any[], title: string): string {
  const lines: string[] = [`**${title}** (${events.length})\n`];

  for (const e of events) {
    const date = new Date(e.startTime);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const catEmoji = e.mainCategoryEmoji || "📅";
    lines.push(`${catEmoji} **${e.title}**`);
    lines.push(`🗓 ${dateStr}`);

    if (e.isVirtual || e.isOnline) {
      lines.push(`🌐 Online`);
    } else if (e.venue?.name || e.locationName) {
      lines.push(`📍 ${e.venue?.name || e.locationName}${e.venue?.city || e.locationCity ? `, ${e.venue?.city || e.locationCity}` : ""}`);
    }

    if (e.organizer?.name || e.organizer) {
      const orgName = typeof e.organizer === "string" ? e.organizer : e.organizer?.name;
      if (orgName) lines.push(`👤 ${orgName}`);
    }

    const meta: string[] = [];
    if (e.isFree) {
      meta.push("🆓 Free");
    } else if (e.price?.min) {
      meta.push(`💵 $${e.price.min}${e.price.max > e.price.min ? "-$" + e.price.max : ""}`);
    }
    if (e.attendeeCount) {
      meta.push(`👥 ${e.attendeeCount}`);
    }
    if (e.mainCategoryLabel) {
      meta.push(e.mainCategoryLabel);
    }
    if (meta.length) lines.push(meta.join(" | "));

    if (e.url) {
      lines.push(`${e.url}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
