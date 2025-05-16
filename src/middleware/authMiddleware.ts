import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ✅ Fix: Ensure `AuthRequest` uses the correct User type
interface AuthRequest extends Request {
  user?: { _id: string; email: string };
}

// ✅ Define JWT Payload Type
interface DecodedToken {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

// ✅ Fix TypeScript Issue: Middleware should return `void`
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    if (!decoded?.id) {
      res.status(403).json({ error: "Invalid token." });
      return;
    }

    req.user = { _id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    console.error("Token verification failed:", error);

    if (error instanceof TokenExpiredError) {
      res.status(401).json({ error: "Token expired. Please log in again." });
    } else {
      res.status(403).json({ error: "Invalid token." });
    }
  }
};
