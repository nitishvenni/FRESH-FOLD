import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";

export type TrustedAdminClaims = {
  adminId: string;
  role: "admin";
};

type AdminCredentialRecord = {
  _id: unknown;
  password: string;
  role: unknown;
};

type AdminLoginDependencies = {
  findAdminByEmail: (email: string) => Promise<AdminCredentialRecord | null>;
  comparePassword: (password: string, hash: string) => Promise<boolean>;
  jwtSecret: string;
};

export type AdminRequest = Request & { admin?: TrustedAdminClaims };

export const isTrustedAdminClaims = (value: unknown): value is TrustedAdminClaims => {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return (
    typeof claims.adminId === "string" &&
    claims.adminId.length > 0 &&
    claims.role === "admin" &&
    !claims.userId
  );
};

export const issueAdminToken = (admin: Pick<AdminCredentialRecord, "_id" | "role">, jwtSecret: string) => {
  if (admin.role !== "admin") {
    throw new Error("Admin account is not authorized");
  }

  return jwt.sign(
    { adminId: String(admin._id), role: "admin" },
    jwtSecret,
    { expiresIn: "7d" }
  );
};

export const createAdminMiddleware = (jwtSecret: string): RequestHandler =>
  (req: AdminRequest, res: Response, next: NextFunction) => {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.replace(/^(\s*Bearer\s+)+/i, "").trim();

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (!isTrustedAdminClaims(decoded)) {
        return res.status(403).json({ message: "Access denied" });
      }

      req.admin = decoded;
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

export const createAdminLoginHandler = (dependencies: AdminLoginDependencies): RequestHandler =>
  async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      if (!email || !password) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const admin = await dependencies.findAdminByEmail(email);
      if (!admin || admin.role !== "admin") {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await dependencies.comparePassword(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = issueAdminToken(admin, dependencies.jwtSecret);
      return res.json({ success: true, token });
    } catch {
      return res.status(500).json({ message: "Admin login failed" });
    }
  };
