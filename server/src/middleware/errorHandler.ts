import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

// Global error handler: known HTTP errors pass through, anything else is a clean 500.
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error("[unhandled]", err);
  return c.json({ error: "Internal server error." }, 500);
};
