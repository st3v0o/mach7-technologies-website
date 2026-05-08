import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const jwtSecret = process.env.SUPABASE_JWT_SECRET;

export interface AuthedRequest extends Request {
  userId?: string | null;
}

export function optionalSupabaseAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ") && jwtSecret) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as {
        sub?: string;
        role?: string;
      };
      req.userId = payload.sub ?? null;
    } catch {
      req.userId = null;
    }
  } else {
    req.userId = null;
  }
  next();
}

export function requireSupabaseAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
