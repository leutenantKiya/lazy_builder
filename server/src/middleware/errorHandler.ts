import type { Request, Response, NextFunction } from "express";

/**
 * Global error handler — catches any unhandled errors thrown
 * inside route handlers / middleware and returns a clean JSON response.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error." });
}
