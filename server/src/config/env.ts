import { z } from "zod";

// Bun loads ../.env via `--env-file` (see package.json scripts).
// Fail fast on boot instead of running with an insecure default.
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  COLLAB_PORT: z.coerce.number().default(1234),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().default(60 * 60 * 24 * 7),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
