import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  userBranchId?: number | null;
}

// In-memory JWT secret — seeded from env at startup, then loaded from DB via setJwtSecret().
// Use getJwtSecret() everywhere instead of reading process.env directly.
let _jwtSecret: string = process.env.JWT_SECRET ?? "";

export function setJwtSecret(secret: string): void {
  _jwtSecret = secret;
  logger.info("JWT secret updated in memory");
}

export function getJwtSecret(): string {
  return _jwtSecret;
}

export function signToken(userId: number, role: string, branchId?: number | null): string {
  if (!_jwtSecret) throw new Error("JWT secret not configured — set it in Admin → Settings");
  return jwt.sign({ userId, role, branchId: branchId ?? null }, _jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  if (!_jwtSecret) {
    res.status(500).json({ error: "JWT secret not configured — contact administrator" });
    return;
  }
  try {
    const payload = jwt.verify(token, _jwtSecret) as { userId: number; role: string; branchId?: number | null };
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.userBranchId = payload.branchId ?? null;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export function requireBranchAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "branch_admin" && req.userRole !== "admin") {
      res.status(403).json({ error: "Branch admin access required" });
      return;
    }
    next();
  });
}

export function requireAgent(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "agent") {
      res.status(403).json({ error: "Agent access required" });
      return;
    }
    next();
  });
}

export function requireBranchOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "admin" && req.userRole !== "branch_admin" && req.userRole !== "agent") {
      res.status(403).json({ error: "Access required" });
      return;
    }
    next();
  });
}

export function requirePayout(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "payout" && req.userRole !== "admin") {
      res.status(403).json({ error: "Payout access required" });
      return;
    }
    next();
  });
}
