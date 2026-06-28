import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";

/**
 * Express middleware that reads the JWT from the `token` cookie,
 * verifies it, and attaches the decoded payload to `req.user`.
 * Responds 401 if the token is missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // use "cookie?" so that when the token isn't set -> 
  // it will throws undefined as a result and stop the chain
  const token = req.cookies?.token;

  // if token is undefined throw 401 unauthorized res
  if (!token) {
    res.status(401).json(
      { error: "Authentication required." 
      }
    );
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    // if payload still valid, call the next function
    // calling "/"
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
