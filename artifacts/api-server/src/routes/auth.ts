import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { requireStaff, type AuthenticatedRequest } from "../lib/auth";
import { getUserAccess, recordAuditEvent } from "../lib/platform";

const router: IRouter = Router();

router.get("/me", requireStaff, async (req, res): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const user = authenticatedReq.localUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const access = await getUserAccess(user.id);
  await recordAuditEvent({
    publicationId: authenticatedReq.publicationId,
    userId: user.id,
    action: "staff.identity.read",
    entityType: "user",
    entityId: user.id,
  });

  res.json(
    GetCurrentUserResponse.parse({
      ...user,
      access,
    }),
  );
});

export default router;