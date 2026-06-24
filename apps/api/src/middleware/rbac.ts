import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@bubbleworks/shared";
import { HttpError } from "../utils/http-error.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have access to this resource"));
      return;
    }

    next();
  };
}
