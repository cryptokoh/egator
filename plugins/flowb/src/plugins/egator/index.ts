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
        locationCity: e.venue?.city || e.neighborhoodName,
        price: e.price?.min,
        isFree: !e.price?.min,
        isVirtual: false,
        danceStyles: e.vibe?.danceTags || [],
        source: e.source || "egator",
        url: e.url,
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
    const events = await this.getEvents({
      city: input.city,
      category: input.category,
      danceStyle: input.dance_style,
      limit: 10,
    });

    if (!events.length) {
      const note = input.city ? ` in ${input.city}` : "";
      return `No events found${note}. Check back soon!`;
    }

    return formatEventList(events, "Events");
  }
}

// ============================================================================
// Shared formatting
// ============================================================================

export function formatEventList(events: EventResult[], title: string): string {
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

    lines.push(`**${e.title}**`);
    lines.push(`${dateStr}`);

    if (e.isVirtual) {
      lines.push(`Online`);
    } else if (e.locationName) {
      lines.push(`${e.locationName}${e.locationCity ? `, ${e.locationCity}` : ""}`);
    }

    if (e.danceStyles?.length) {
      lines.push(`${e.danceStyles.slice(0, 3).join(", ")}`);
    }

    if (e.isFree) {
      lines.push(`FREE`);
    } else if (e.price) {
      lines.push(`$${e.price}`);
    }

    if (e.source !== "egator") {
      lines.push(`_via ${e.source}_`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
