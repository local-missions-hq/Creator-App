import { z } from 'zod';

export const serverEnvironmentSchema = z.object({
  APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export function parseServerEnvironment(input: Record<string, string | undefined>) {
  return serverEnvironmentSchema.parse(input);
}
