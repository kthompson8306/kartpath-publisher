import { Router, type IRouter } from "express";
import {
  CreateContentItemBody,
  CreateContentItemResponse,
  DeleteContentItemParams,
  DeleteContentItemQueryParams,
  GetContentItemParams,
  GetContentItemQueryParams,
  GetContentItemResponse,
  ListContentItemsQueryParams,
  ListContentItemsResponse,
  PublishContentItemBody,
  PublishContentItemParams,
  PublishContentItemResponse,
  UpdateContentItemBody,
  UpdateContentItemParams,
  UpdateContentItemResponse,
} from "@workspace/api-zod";
import { and, desc, eq } from "drizzle-orm";
import { contentItemsTable, db, mediaAssetsTable } from "@workspace/db";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";
import {
  getUserPublicationAccess,
  hasEditorialReadAccess,
  hasEditorialWriteAccess,
  recordAuditEvent,
} from "../lib/platform";

const router: IRouter = Router();

function coverUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
}

function serializeItem(
  item: typeof contentItemsTable.$inferSelect,
  mediaObjectPath?: string | null,
  mediaAltText?: string | null,
  mediaCoverPosition?: string | null,
) {
  return {
    ...item,
    coverUrl: coverUrl(mediaObjectPath),
    coverAltText: mediaAltText ?? null,
    coverPosition: mediaCoverPosition ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: item.publishedAt?.toISOString() ?? null,
  };
}

async function requireEditorialAccess(req: Parameters<typeof requireStaff>[0], res: Parameters<typeof requireStaff>[1], publicationId: string, write = false) {
  const user = (req as AuthenticatedRequest).localUser;
  if (!user) {
    res.status(403).json({ error: "No publication access" });
    return null;
  }
  const access = await getUserPublicationAccess(user.id, publicationId);
  if (
    !access ||
    (!write && !hasEditorialReadAccess(access.permissions)) ||
    (write && !hasEditorialWriteAccess(access.permissions))
  ) {
    res.status(403).json({ error: "No editorial access to requested publication" });
    return null;
  }
  return { user, access };
}

// Validate coverMediaId belongs to the publication and is ready
async function resolveCoverMedia(coverMediaId: string | null, publicationId: string): Promise<{ valid: boolean; objectPath: string | null; altText: string | null; coverPosition: string | null }> {
  if (!coverMediaId) return { valid: true, objectPath: null, altText: null, coverPosition: null };
  const [media] = await db
    .select({ id: mediaAssetsTable.id, objectPath: mediaAssetsTable.objectPath, altText: mediaAssetsTable.altText, coverPosition: mediaAssetsTable.coverPosition, status: mediaAssetsTable.status, publicationId: mediaAssetsTable.publicationId })
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.id, coverMediaId));
  if (!media || media.publicationId !== publicationId || media.status !== "ready") {
    return { valid: false, objectPath: null, altText: null, coverPosition: null };
  }
  return { valid: true, objectPath: media.objectPath, altText: media.altText ?? null, coverPosition: media.coverPosition ?? null };
}

router.get(
  "/editorial/content-items",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = ListContentItemsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const scope = await requireEditorialAccess(req, res, parsed.data.publicationId);
    if (!scope) return;

    const conditions = [eq(contentItemsTable.publicationId, parsed.data.publicationId)];
    if (parsed.data.status) conditions.push(eq(contentItemsTable.status, parsed.data.status));
    if (parsed.data.contentType) conditions.push(eq(contentItemsTable.contentType, parsed.data.contentType));

    const rows = await db
      .select({ item: contentItemsTable, mediaObjectPath: mediaAssetsTable.objectPath, mediaAltText: mediaAssetsTable.altText, mediaCoverPosition: mediaAssetsTable.coverPosition })
      .from(contentItemsTable)
      .leftJoin(
        mediaAssetsTable,
        and(eq(contentItemsTable.coverMediaId, mediaAssetsTable.id), eq(mediaAssetsTable.status, "ready")),
      )
      .where(and(...conditions))
      .orderBy(desc(contentItemsTable.updatedAt));

    res.json(ListContentItemsResponse.parse(rows.map(({ item, mediaObjectPath, mediaAltText, mediaCoverPosition }) => serializeItem(item, mediaObjectPath, mediaAltText, mediaCoverPosition))));
  },
);

router.post(
  "/editorial/content-items",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = CreateContentItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const scope = await requireEditorialAccess(req, res, parsed.data.publicationId, true);
    if (!scope) return;

    // Validate coverMediaId if provided
    const { valid, objectPath, altText, coverPosition: mediaCoverPosition } = await resolveCoverMedia(parsed.data.coverMediaId ?? null, parsed.data.publicationId);
    if (!valid) {
      res.status(400).json({ error: "Cover media not found, not ready, or belongs to a different publication" });
      return;
    }

    try {
      const { publicationId: _publicationId, ...itemInput } = parsed.data;
      const [item] = await db
        .insert(contentItemsTable)
        .values({
          ...itemInput,
          publicationId: parsed.data.publicationId,
          createdBy: scope.user.id,
          updatedBy: scope.user.id,
          status: "draft",
        })
        .returning();
      await recordAuditEvent({
        publicationId: item.publicationId,
        userId: scope.user.id,
        action: "content.item.created",
        entityType: "content_item",
        entityId: item.id,
        metadata: { contentType: item.contentType, slug: item.slug },
      });
      res.status(201).json(CreateContentItemResponse.parse(serializeItem(item, objectPath, altText, mediaCoverPosition)));
    } catch (error) {
      req.log.error({ err: error }, "Unable to create content item");
      res.status(409).json({ error: "A content item with that slug already exists" });
    }
  },
);

router.get(
  "/editorial/content-items/:id",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = GetContentItemParams.safeParse(req.params);
    const query = GetContentItemQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid content item request" });
      return;
    }
    const scope = await requireEditorialAccess(req, res, query.data.publicationId);
    if (!scope) return;

    const [row] = await db
      .select({ item: contentItemsTable, mediaObjectPath: mediaAssetsTable.objectPath, mediaAltText: mediaAssetsTable.altText, mediaCoverPosition: mediaAssetsTable.coverPosition })
      .from(contentItemsTable)
      .leftJoin(
        mediaAssetsTable,
        and(eq(contentItemsTable.coverMediaId, mediaAssetsTable.id), eq(mediaAssetsTable.status, "ready")),
      )
      .where(and(
        eq(contentItemsTable.id, params.data.id),
        eq(contentItemsTable.publicationId, query.data.publicationId),
      ));

    if (!row) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }
    res.json(GetContentItemResponse.parse(serializeItem(row.item, row.mediaObjectPath, row.mediaAltText, row.mediaCoverPosition)));
  },
);

router.patch(
  "/editorial/content-items/:id",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = UpdateContentItemParams.safeParse(req.params);
    const parsed = UpdateContentItemBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid content item update" });
      return;
    }
    const scope = await requireEditorialAccess(req, res, parsed.data.publicationId, true);
    if (!scope) return;

    // Validate coverMediaId if provided
    const { valid, objectPath, altText, coverPosition: mediaCoverPosition } = await resolveCoverMedia(parsed.data.coverMediaId ?? null, parsed.data.publicationId);
    if (!valid) {
      res.status(400).json({ error: "Cover media not found, not ready, or belongs to a different publication" });
      return;
    }

    const { publicationId: _publicationId, ...itemUpdate } = parsed.data;
    const [item] = await db
      .update(contentItemsTable)
      .set({ ...itemUpdate, updatedBy: scope.user.id, updatedAt: new Date() })
      .where(and(
        eq(contentItemsTable.id, params.data.id),
        eq(contentItemsTable.publicationId, parsed.data.publicationId),
      ))
      .returning();
    if (!item) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }
    await recordAuditEvent({
      publicationId: item.publicationId,
      userId: scope.user.id,
      action: "content.item.updated",
      entityType: "content_item",
      entityId: item.id,
      metadata: { contentType: item.contentType, slug: item.slug },
    });
    res.json(UpdateContentItemResponse.parse(serializeItem(item, objectPath, altText, mediaCoverPosition)));
  },
);

router.post(
  "/editorial/content-items/:id/publish",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = PublishContentItemParams.safeParse(req.params);
    const parsed = PublishContentItemBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid content item publication request" });
      return;
    }
    const scope = await requireEditorialAccess(req, res, parsed.data.publicationId, true);
    if (!scope) return;
    const nextStatus = parsed.data.status;
    const [item] = await db
      .update(contentItemsTable)
      .set({
        status: nextStatus,
        publishedAt: nextStatus === "published" ? new Date() : null,
        updatedBy: scope.user.id,
        updatedAt: new Date(),
      })
      .where(and(
        eq(contentItemsTable.id, params.data.id),
        eq(contentItemsTable.publicationId, parsed.data.publicationId),
      ))
      .returning();
    if (!item) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }
    await recordAuditEvent({
      publicationId: item.publicationId,
      userId: scope.user.id,
      action: nextStatus === "published" ? "content.item.published" : "content.item.unpublished",
      entityType: "content_item",
      entityId: item.id,
      metadata: { contentType: item.contentType, slug: item.slug },
    });

    // Resolve coverUrl, coverAltText, and coverPosition for the published item
    let mediaObjectPath: string | null = null;
    let mediaAltText: string | null = null;
    let mediaCoverPosition: string | null = null;
    if (item.coverMediaId) {
      const [media] = await db
        .select({ objectPath: mediaAssetsTable.objectPath, altText: mediaAssetsTable.altText, coverPosition: mediaAssetsTable.coverPosition })
        .from(mediaAssetsTable)
        .where(and(eq(mediaAssetsTable.id, item.coverMediaId), eq(mediaAssetsTable.status, "ready")));
      mediaObjectPath = media?.objectPath ?? null;
      mediaAltText = media?.altText ?? null;
      mediaCoverPosition = media?.coverPosition ?? null;
    }
    res.json(PublishContentItemResponse.parse(serializeItem(item, mediaObjectPath, mediaAltText, mediaCoverPosition)));
  },
);

router.delete(
  "/editorial/content-items/:id",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = DeleteContentItemParams.safeParse(req.params);
    const query = DeleteContentItemQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid content item deletion request" });
      return;
    }
    const scope = await requireEditorialAccess(req, res, query.data.publicationId, true);
    if (!scope) return;
    const [item] = await db
      .delete(contentItemsTable)
      .where(and(
        eq(contentItemsTable.id, params.data.id),
        eq(contentItemsTable.publicationId, query.data.publicationId),
      ))
      .returning();
    if (!item) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }
    await recordAuditEvent({
      publicationId: item.publicationId,
      userId: scope.user.id,
      action: "content.item.deleted",
      entityType: "content_item",
      entityId: item.id,
      metadata: { contentType: item.contentType, slug: item.slug },
    });
    res.status(204).send();
  },
);

export default router;
