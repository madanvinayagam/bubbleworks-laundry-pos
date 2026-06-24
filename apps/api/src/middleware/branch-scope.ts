import type { AuthenticatedUser } from "./auth.js";
import { HttpError } from "../utils/http-error.js";

export function resolveBranchScope(user: AuthenticatedUser, requestedBranchId?: string | null) {
  if (user.role === "ADMIN") {
    return requestedBranchId ?? undefined;
  }

  if (!user.branchId) {
    throw new HttpError(403, "Cashier is not assigned to a branch");
  }

  if (requestedBranchId && requestedBranchId !== user.branchId) {
    throw new HttpError(403, "Cashier can only access the assigned branch");
  }

  return user.branchId;
}
