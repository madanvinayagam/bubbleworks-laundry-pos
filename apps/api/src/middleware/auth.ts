import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { UserRole } from "@bubbleworks/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  branchId: string | null;
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

type JwtPayload = {
  sub: string;
  role: UserRole;
  branchId?: string | null;
  username: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        status: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(401, "User is inactive or no longer exists");
    }

    req.user = {
      id: user.id,
      role: user.role,
      branchId: user.branchId,
      username: user.username,
    };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid or expired token"));
  }
}

export function signSessionToken(user: AuthenticatedUser) {
  const options: SignOptions = {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      role: user.role,
      branchId: user.branchId,
      username: user.username,
    },
    env.JWT_SECRET,
    options,
  );
}
