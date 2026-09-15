import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required and must be configured in environment'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required and must be configured in environment'),
  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET is required and must be configured in environment'),
  LICENSE_ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ CRITICAL CONFIGURATION ERROR: Missing or invalid required environment variables:');
    console.error(JSON.stringify(formatted, null, 2));
    const missingFields = Object.keys(result.error.flatten().fieldErrors).join(', ');
    throw new Error(`CRITICAL: Server startup halted due to missing/invalid environment variables: [${missingFields}]. Check your .env file or environment configuration.`);
  }
  cachedEnv = result.data;
  return cachedEnv;
}

