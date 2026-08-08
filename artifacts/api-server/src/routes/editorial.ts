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
import { contentItemsTable, db } from "@workspace/db";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";
import {
  getUserPublicationAccess,
  hasEditorialReadAccess,
  hasEditorialWriteAccess,
  recordAuditEvent,
} from "../lib/platform";

const router: IRouter = Router();

function serializeItem(item: typeof contentItemsTable.$inferSelect) {
  return {
    ...item,
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
    const items = await db
      .select()
      .from(contentItemsTable)
      .where(and(...conditions))
      .orderBy(desc(contentItemsTable.updatedAt));

    res.json(ListContentItemsResponse.parse(items.map(serializeItem)));
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
      res.status(201).json(CreateContentItemResponse.parse(serializeItem(item)));
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
    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(and(
        eq(contentItemsTable.id, params.data.id),
        eq(contentItemsTable.publicationId, query.data.publicationId),
      ));
    if (!item) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }
    res.json(GetContentItemResponse.parse(serializeItem(item)));
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
    res.json(UpdateContentItemResponse.parse(serializeItem(item)));
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
    res.json(PublishContentItemResponse.parse(serializeItem(item)));
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