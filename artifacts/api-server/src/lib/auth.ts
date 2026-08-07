import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import {
  ensureLocalUser,
  getFirstUserPublication,
} from "./platform";

export type AuthenticatedRequest = Request & {
  localUser?: Awaited<ReturnType<typeof ensureLocalUser>>;
  publicationId?: string;
};

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const authProviderSubject = auth.userId;
  if (!authProviderSubject) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const localUser = await ensureLocalUser(authProviderSubject);
    const publicationId = await getFirstUserPublication(localUser.id);
    if (!publicationId) {
      res.status(403).json({ error: "No publication access" });
      return;
    }
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.localUser = localUser;
    authenticatedReq.publicationId = publicationId;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to provision local staff user");
    res.status(500).json({ error: "Unable to load staff access" });
  }
}