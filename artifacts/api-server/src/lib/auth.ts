import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import {
  ensureLocalUser,
  grantBootstrapStaffAccess,
  getFirstUserPublicationAccess,
  getUserPublicationAccess,
} from "./platform";

export type AuthenticatedRequest = Request & {
  clerkUserId?: string | null;
  localUser?: Awaited<ReturnType<typeof ensureLocalUser>>;
  publicationId?: string;
  permissions?: string[];
  role?: string;
};

/**
 * Core staff enforcement. Validates Clerk session, applies the controlled
 * bootstrap grant, checks account status, verifies publication access, and
 * optionally enforces a specific permission.
 */
async function enforceStaff(
  req: Request,
  res: Response,
  next: NextFunction,
  requiredPermission?: string,
): Promise<void> {
  const auth = getAuth(req);
  const authProviderSubject = auth.userId;
  if (!authProviderSubject) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const localUser = await ensureLocalUser(authProviderSubject);

    // Controlled bootstrap: grant access only if the email is explicitly
    // listed in STAFF_BOOTSTRAP_EMAILS. No-ops for everyone else.
    await grantBootstrapStaffAccess(localUser.id, localUser.email);

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
    authenticatedReq.clerkUserId = authProviderSubject;
    authenticatedReq.localUser = localUser;
    authenticatedReq.publicationId = access.publicationId;
    authenticatedReq.permissions = access.permissions;
    authenticatedReq.role = access.role;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to load staff access");
    res.status(500).json({ error: "Unable to load staff access" });
  }
}

/**
 * Middleware that requires a valid Clerk session AND an explicit
 * publication-access grant in the database.
 *
 * Unauthenticated requests → 401
 * Inactive account → 403
 * Authenticated but no publication access → 403
 *
 * On success it attaches `localUser`, `publicationId`, `permissions`,
 * and `role` to the request.
 */
export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return enforceStaff(req, res, next);
}

/**
 * Middleware factory that requires `requireStaff` to have run first, then
 * additionally enforces the user holds a specific permission string.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) =>
    enforceStaff(req, res, next, permission);
}

/**
 * Middleware factory that enforces the authenticated user has access to a
 * specific publication. Must be placed after requireStaff.
 *
 * Usage:
 *   router.get('/pubs/:publicationId/...', requireStaff, requirePublicationAccess('publicationId'), handler)
 *
 * @param paramName - The req.params key that holds the target publicationId
 *                    (defaults to "publicationId").
 */
export function requirePublicationAccess(paramName = "publicationId") {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authenticatedReq = req as AuthenticatedRequest;
    const user = authenticatedReq.localUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawParam = req.params[paramName];
    const targetPublicationId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!targetPublicationId) {
      res.status(400).json({ error: `Missing ${paramName} parameter` });
      return;
    }

    try {
      const access = await getUserPublicationAccess(user.id, targetPublicationId);
      if (!access) {
        res.status(403).json({ error: "No access to this publication" });
        return;
      }
      // Narrow the publicationId on the request to the verified target.
      authenticatedReq.publicationId = access.publicationId;
      next();
    } catch (error) {
      req.log.error({ err: error }, "Unable to verify publication access");
      res.status(500).json({ error: "Unable to verify publication access" });
    }
  };
}
