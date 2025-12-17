/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

/**
 * Generic API response wrapper
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
