import { defineConfig } from "drizzle-kit";

// `db:generate` only diffs the schema, so it needs no database.
// `db:migrate` / `db:studio` read DATABASE_URL from ../.env.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
