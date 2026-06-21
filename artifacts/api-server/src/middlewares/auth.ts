import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  userBranchId?: number | null;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export function signToken(userId: number, role: string, branchId?: number | null): string {
  return jwt.sign({ userId, role, branchId: branchId ?? null }, JWT_SECRET!, { expiresIn: "7d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { userId: number; role: string; branchId?: number | null };
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
