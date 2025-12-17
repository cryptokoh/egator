import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import type { AdapterConfig, FetchOptions, FetchResult, NormalizedEvent, RawEvent } from './types.js';

/**
 * Base adapter class that all platform adapters extend
 * Handles rate limiting, retries, and common HTTP operations
 */
export abstract class BaseAdapter {
  protected readonly sourceName: string;
  protected readonly config: AdapterConfig;
  protected readonly http: AxiosInstance;
  protected readonly queue: PQueue;

  constructor(sourceName: string, config: AdapterConfig) {
    this.sourceName = sourceName;
    this.config = config;

    // Create HTTP client
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 30000,
      headers: this.getDefaultHeaders(),
    });

    // Create rate-limited queue
    const rps = config.rateLimit?.maxRequestsPerSecond ?? 5;
    this.queue = new PQueue({
      intervalCap: rps,
      interval: 1000,
      carryoverConcurrencyCount: true,
    });

    // Add response interceptor for rate limit tracking
    this.http.interceptors.response.use(
      response => this.handleRateLimitHeaders(response),
      error => this.handleError(error)
    );
  }

  /**
   * Get the source identifier
   */
  get source(): string {
    return this.sourceName;
  }

  /**
   * Fetch events from the source
   * Must be implemented by each adapter
   */
  abstract fetch(options: FetchOptions): Promise<FetchResult>;

  /**
   * Normalize a raw event to the common schema
   * Must be implemented by each adapter
   */
  abstract normalize(raw: RawEvent): NormalizedEvent;

  /**
   * Check if the adapter is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Make a rate-limited, retried HTTP request
   */
  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.queue.add(() =>
      pRetry(
        async () => {
          const response = await this.http.request<T>(config);
          return response.data;
        },
        {
          retries: this.config.retries ?? 3,
          onFailedAttempt: error => {
            console.warn(
              `[${this.sourceName}] Request failed (attempt ${error.attemptNumber}): ${error.message}`
            );
          },
        }
      )
    ) as Promise<T>;
  }

  /**
   * Get default headers for requests
   * Can be overridden by adapters
   */
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'User-Agent': 'AIeGator/0.1.0',
    };
  }

  /**
   * Handle rate limit headers from response
   */
  protected handleRateLimitHeaders(response: any) {
    // Override in adapters to parse rate limit headers
    return response;
  }

  /**
   * Handle HTTP errors
   */
  protected handleError(error: any) {
    if (error.response?.status === 429) {
      // Rate limited - could implement backoff here
      console.warn(`[${this.sourceName}] Rate limited`);
    }
    throw error;
  }

  /**
   * Parse a date string into a Date object
   */
  protected parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Clean HTML from a string
   */
  protected stripHtml(html: string | null | undefined): string | null {
    if (!html) return null;
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Truncate text to a maximum length
   */
  protected truncate(text: string | null | undefined, maxLength: number): string | null {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
