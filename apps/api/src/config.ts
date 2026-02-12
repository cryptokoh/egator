import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  apiBaseUrl: z.string().default('http://localhost:3000'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  rateLimitMax: z.coerce.number().default(100),
  rateLimitWindow: z.coerce.number().default(60000),
  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    apiBaseUrl: process.env.API_BASE_URL,
    logLevel: process.env.LOG_LEVEL,
    rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
  });

  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();
