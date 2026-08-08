import { Router, type IRouter } from "express";
import { RequestStorageUploadUrlBody, RequestStorageUploadUrlResponse } from "@workspace/api-zod";
import { db, mediaAssetsTable } from "@workspace/db";
import { requirePermission, type AuthenticatedRequest } from "../lib/auth";
import { getObjectEntityUploadURL } from "../lib/objectStorage";
import { recordAuditEvent } from "../lib/platform";

const router: IRouter = Router();

router.post(
  "/storage/uploads/request-url",
  requirePermission("media:write"),
  async (req, res): Promise<void> => {
    const parsed = RequestStorageUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const authenticatedReq = req as AuthenticatedRequest;
    const user = authenticatedReq.localUser;
    const publicationId = authenticatedReq.publicationId;
    if (!user || !publicationId) {
      res.status(403).json({ error: "No publication access" });
      return;
    }

    try {
      const upload = await getObjectEntityUploadURL();
      const [media] = await db
        .insert(mediaAssetsTable)
        .values({
          publicationId,
          uploadedBy: user.id,
          objectPath: upload.objectPath,
          originalName: parsed.data.name,
          mimeType: parsed.data.contentType,
          byteSize: parsed.data.size,
          status: "pending",
        })
        .returning();

      await recordAuditEvent({
        publicationId,
        userId: user.id,
        action: "media.upload.requested",
        entityType: "media_asset",
        entityId: media.id,
        metadata: { objectPath: upload.objectPath },
      });

      res.json(RequestStorageUploadUrlResponse.parse(upload));
    } catch (error) {
      req.log.error({ err: error }, "Unable to prepare media upload");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

export default router;