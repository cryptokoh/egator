// Database client
export { db, pool } from './client.js';

// Schema
export * from './schema/events.js';
export * from './schema/sources.js';
export * from './schema/duplicates.js';

// Types
export type { Database } from './types.js';
