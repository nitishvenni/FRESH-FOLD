import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

const sendUnauthorized = (res: Response, message: string) => {
  const requestId = res.locals.aiRequestId;
  return res.status(401).json({
    message,
    ...(typeof requestId === "string" ? { requestId } : {}),
  });
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader
    ?.replace(/^(\s*Bearer\s+)+/i, "")
    .trim();

  if (!token || token === "null" || token === "undefined") {
    return sendUnauthorized(res, "No token provided");
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    req.user = decoded;
    next();
  } catch (err) {
    return sendUnauthorized(res, "Invalid token");
  }
};
