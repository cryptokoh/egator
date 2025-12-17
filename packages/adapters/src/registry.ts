import type { BaseAdapter } from './base-adapter.js';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent } from './types.js';
import { EventbriteAdapter } from './eventbrite/index.js';
import { TicketmasterAdapter } from './ticketmaster/index.js';
import { MeetupAdapter } from './meetup/index.js';
import { YelpAdapter } from './yelp/index.js';
import { AllEventsAdapter } from './allevents/index.js';
import { BandsintownAdapter } from './bandsintown/index.js';
import { HumanitixAdapter } from './humanitix/index.js';
import { ClassPassAdapter } from './classpass/index.js';

export interface RegistryConfig {
  eventbrite?: AdapterConfig;
  ticketmaster?: AdapterConfig;
  meetup?: AdapterConfig;
  yelp?: AdapterConfig;
  allevents?: AdapterConfig;
  bandsintown?: AdapterConfig;
  humanitix?: AdapterConfig;
  classpass?: AdapterConfig;
}

/**
 * Registry for managing and coordinating multiple adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, BaseAdapter> = new Map();

  constructor(config: RegistryConfig) {
    // Initialize configured adapters
    if (config.eventbrite) {
      this.adapters.set('eventbrite', new EventbriteAdapter(config.eventbrite));
    }
    if (config.ticketmaster) {
      this.adapters.set('ticketmaster', new TicketmasterAdapter(config.ticketmaster));
    }
    if (config.meetup) {
      this.adapters.set('meetup', new MeetupAdapter(config.meetup));
    }
    if (config.yelp) {
      this.adapters.set('yelp', new YelpAdapter(config.yelp));
    }
    if (config.allevents) {
      this.adapters.set('allevents', new AllEventsAdapter(config.allevents));
    }
    if (config.bandsintown) {
      this.adapters.set('bandsintown', new BandsintownAdapter(config.bandsintown));
    }
    if (config.humanitix) {
      this.adapters.set('humanitix', new HumanitixAdapter(config.humanitix));
    }
    if (config.classpass) {
      this.adapters.set('classpass', new ClassPassAdapter(config.classpass));
    }
  }

  /**
   * Get an adapter by source name
   */
  getAdapter(source: string): BaseAdapter | undefined {
    return this.adapters.get(source);
  }

  /**
   * Get all configured adapters
   */
  getAllAdapters(): BaseAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all configured adapter names
   */
  getAdapterNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check which adapters are properly configured
   */
  getConfiguredAdapters(): string[] {
    return this.getAdapterNames().filter(name => {
      const adapter = this.adapters.get(name);
      return adapter?.isConfigured() ?? false;
    });
  }

  /**
   * Fetch from a specific adapter
   */
  async fetchFrom(source: string, options: FetchOptions): Promise<FetchResult> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`Adapter not found: ${source}`);
    }
    if (!adapter.isConfigured()) {
      throw new Error(`Adapter not configured: ${source}`);
    }
    return adapter.fetch(options);
  }

  /**
   * Fetch from all configured adapters in parallel
   */
  async fetchFromAll(options: FetchOptions): Promise<Map<string, FetchResult>> {
    const results = new Map<string, FetchResult>();
    const configuredAdapters = this.getConfiguredAdapters();

    const promises = configuredAdapters.map(async source => {
      try {
        const result = await this.fetchFrom(source, options);
        results.set(source, result);
      } catch (error) {
        console.error(`[AdapterRegistry] Error fetching from ${source}:`, error);
        // Continue with other adapters even if one fails
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Fetch and normalize from all adapters
   */
  async fetchAndNormalizeAll(options: FetchOptions): Promise<NormalizedEvent[]> {
    const fetchResults = await this.fetchFromAll(options);
    const normalizedEvents: NormalizedEvent[] = [];

    for (const [source, result] of fetchResults) {
      const adapter = this.adapters.get(source);
      if (!adapter) continue;

      for (const rawEvent of result.events) {
        try {
          const normalized = adapter.normalize(rawEvent);
          normalizedEvents.push(normalized);
        } catch (error) {
          console.error(`[AdapterRegistry] Error normalizing event from ${source}:`, error);
        }
      }
    }

    return normalizedEvents;
  }
}
