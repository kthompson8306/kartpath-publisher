import type { NextFunction, Request, Response } from "express";
import {
  ensureLocalUser,
  getFirstUserPublicationAccess,
} from "./platform";

export type AuthenticatedRequest = Request & {
  clerkUserId?: string | null;
  localUser?: Awaited<ReturnType<typeof ensureLocalUser>>;
  publicationId?: string;
  permissions?: string[];
  role?: string;
};

async function enforceStaff(
  req: Request,
  res: Response,
  next: NextFunction,
  requiredPermission?: string,
): Promise<void> {
  const authProviderSubject = (req as AuthenticatedRequest).clerkUserId;
  if (!authProviderSubject) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const localUser = await ensureLocalUser(authProviderSubject);
    if (localUser.status !== "active") {
      res.status(403).json({ error: "Staff account is inactive" });
      return;
    }
    const access = await getFirstUserPublicationAccess(localUser.id);
    if (!access) {
      res.status(403).json({ error: "No publication access" });
      return;
    }
    if (
      requiredPermission &&
      !access.permissions.includes(requiredPermission)
    ) {
      res.status(403).json({ error: "Insufficient publication permissions" });
      return;
    }
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.localUser = localUser;
    authenticatedReq.publicationId = access.publicationId;
    authenticatedReq.permissions = access.permissions;
    authenticatedReq.role = access.role;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to provision local staff user");
    res.status(500).json({ error: "Unable to load staff access" });
  }
}

export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return enforceStaff(req, res, next);
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) =>
    enforceStaff(req, res, next, permission);
}