import { Router, type IRouter } from "express";
import { RequestStorageUploadUrlBody, RequestStorageUploadUrlResponse, CompleteMediaUploadParams, CompleteMediaUploadResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db, mediaAssetsTable } from "@workspace/db";
import { requireStaff, type AuthenticatedRequest } from "../lib/auth";
import { checkObjectExists, getObjectEntityGetURL, getObjectEntityUploadURL } from "../lib/objectStorage";
import { getUserPublicationAccess, recordAuditEvent } from "../lib/platform";

const router: IRouter = Router();

router.post(
  "/storage/uploads/request-url",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = RequestStorageUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const authenticatedReq = req as AuthenticatedRequest;
    const user = authenticatedReq.localUser;
    if (!user) {
      res.status(403).json({ error: "No publication access" });
      return;
    }

    const requestedAccess = await getUserPublicationAccess(
      user.id,
      parsed.data.publicationId,
    );
    if (
      !requestedAccess ||
      !requestedAccess.permissions.includes("media:write")
    ) {
      res.status(403).json({
        error: "No media upload access to requested publication",
      });
      return;
    }

    try {
      const upload = await getObjectEntityUploadURL();
      const [media] = await db
        .insert(mediaAssetsTable)
        .values({
          publicationId: requestedAccess.publicationId,
          uploadedBy: user.id,
          objectPath: upload.objectPath,
          originalName: parsed.data.name,
          mimeType: parsed.data.contentType,
          byteSize: parsed.data.size,
          status: "pending",
        })
        .returning();

      await recordAuditEvent({
        publicationId: requestedAccess.publicationId,
        userId: user.id,
        action: "media.upload.requested",
        entityType: "media_asset",
        entityId: media.id,
        metadata: { objectPath: upload.objectPath },
      });

      res.json(RequestStorageUploadUrlResponse.parse({ ...upload, mediaId: media.id }));
    } catch (error) {
      req.log.error({ err: error }, "Unable to prepare media upload");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.post(
  "/storage/uploads/:mediaId/complete",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = CompleteMediaUploadParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid media ID" });
      return;
    }

    const user = (req as AuthenticatedRequest).localUser;
    if (!user) {
      res.status(403).json({ error: "No publication access" });
      return;
    }

    const [media] = await db
      .select()
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, params.data.mediaId));

    if (!media) {
      res.status(404).json({ error: "Media asset not found" });
      return;
    }

    const access = await getUserPublicationAccess(user.id, media.publicationId);
    if (!access || !access.permissions.includes("media:write")) {
      res.status(403).json({ error: "No media access to this publication" });
      return;
    }

    // Idempotent — already ready
    if (media.status === "ready") {
      const coverUrl = `/api/storage/objects${media.objectPath.replace(/^\/objects/, "")}`;
      res.json(CompleteMediaUploadResponse.parse({
        id: media.id,
        status: media.status,
        objectPath: media.objectPath,
        originalName: media.originalName,
        mimeType: media.mimeType,
        coverUrl,
      }));
      return;
    }

    // Verify the file actually landed in GCS before marking it ready.
    // A HEAD against the signed GET URL confirms object existence without
    // downloading the bytes. This prevents a failed PUT from being silently
    // accepted and later serving a 404 when someone tries to view the image.
    const exists = await checkObjectExists(media.objectPath);
    if (!exists) {
      res.status(422).json({
        error:
          "Upload not found in storage — the file transfer may have failed. " +
          "Please retry the upload.",
      });
      return;
    }

    const [updated] = await db
      .update(mediaAssetsTable)
      .set({ status: "ready" })
      .where(eq(mediaAssetsTable.id, params.data.mediaId))
      .returning();

    await recordAuditEvent({
      publicationId: media.publicationId,
      userId: user.id,
      action: "media.upload.completed",
      entityType: "media_asset",
      entityId: media.id,
      metadata: { objectPath: media.objectPath },
    });

    const coverUrl = `/api/storage/objects${updated.objectPath.replace(/^\/objects/, "")}`;
    res.json(CompleteMediaUploadResponse.parse({
      id: updated.id,
      status: updated.status,
      objectPath: updated.objectPath,
      originalName: updated.originalName,
      mimeType: updated.mimeType,
      coverUrl,
    }));
  },
);

// Serve a stored object — generates a signed GET URL and redirects.
// Intentionally public (no auth): objects are referenced only by random UUIDs
// and editorial cover photos on published stories are publicly viewable by design.
router.get("/storage/objects/*objectPath", async (req, res): Promise<void> => {
  // path-to-regexp v8 may return the wildcard capture as an array of segments.
  // Explicitly join with "/" to avoid the default Array.toString() comma separator.
  const raw = (req.params as Record<string, string | string[]>).objectPath;
  const segments = Array.isArray(raw) ? raw : String(raw).split(",");
  const objectPath = `/objects/${segments.join("/")}`;
  try {
    const signedUrl = await getObjectEntityGetURL(objectPath);
    res.redirect(302, signedUrl);
  } catch (err) {
    req.log.error({ err }, "Failed to generate object serve URL");
    res.status(404).json({ error: "Object not found or unavailable" });
  }
});

export default router;
