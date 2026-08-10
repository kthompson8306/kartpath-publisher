import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  AddGalleryItemBody,
  AddGalleryItemParams,
  AddGalleryItemResponse,
  ListGalleryItemsParams,
  ListGalleryItemsQueryParams,
  ListGalleryItemsResponse,
  RemoveGalleryItemParams,
  RemoveGalleryItemQueryParams,
  ReorderGalleryBody,
  ReorderGalleryParams,
  ReorderGalleryResponse,
  UpdateGalleryItemBody,
  UpdateGalleryItemParams,
  UpdateGalleryItemResponse,
} from "@workspace/api-zod";
import {
  contentItemGalleryTable,
  contentItemsTable,
  db,
  mediaAssetsTable,
} from "@workspace/db";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";
import {
  getUserPublicationAccess,
  hasEditorialReadAccess,
  hasEditorialWriteAccess,
} from "../lib/platform";

const router: IRouter = Router();

function galleryItemUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
}

function serializeGalleryItem(
  item: typeof contentItemGalleryTable.$inferSelect,
  objectPath?: string | null,
  altText?: string | null,
) {
  return {
    id: item.id,
    mediaAssetId: item.mediaAssetId,
    mediaUrl: galleryItemUrl(objectPath),
    altText: altText ?? null,
    sortOrder: item.sortOrder,
    caption: item.caption ?? null,
  };
}

async function requireGalleryAccess(
  req: Parameters<typeof requireStaff>[0],
  res: Parameters<typeof requireStaff>[1],
  publicationId: string,
  contentItemId: string,
  write = false,
) {
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
  // Verify the content item belongs to this publication
  const [ci] = await db
    .select({ id: contentItemsTable.id })
    .from(contentItemsTable)
    .where(
      and(
        eq(contentItemsTable.id, contentItemId),
        eq(contentItemsTable.publicationId, publicationId),
      ),
    );
  if (!ci) {
    res.status(404).json({ error: "Content item not found" });
    return null;
  }
  return { user, access };
}

// GET /editorial/content-items/:id/gallery
router.get(
  "/editorial/content-items/:id/gallery",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = ListGalleryItemsParams.safeParse(req.params);
    const query = ListGalleryItemsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid gallery list request" });
      return;
    }
    const scope = await requireGalleryAccess(
      req,
      res,
      query.data.publicationId,
      params.data.id,
    );
    if (!scope) return;

    const rows = await db
      .select({
        item: contentItemGalleryTable,
        objectPath: mediaAssetsTable.objectPath,
        altText: mediaAssetsTable.altText,
      })
      .from(contentItemGalleryTable)
      .innerJoin(
        mediaAssetsTable,
        eq(contentItemGalleryTable.mediaAssetId, mediaAssetsTable.id),
      )
      .where(eq(contentItemGalleryTable.contentItemId, params.data.id))
      .orderBy(
        asc(contentItemGalleryTable.sortOrder),
        asc(contentItemGalleryTable.createdAt),
      );

    res.json(
      ListGalleryItemsResponse.parse(
        rows.map(({ item, objectPath, altText }) =>
          serializeGalleryItem(item, objectPath, altText),
        ),
      ),
    );
  },
);

// POST /editorial/content-items/:id/gallery
router.post(
  "/editorial/content-items/:id/gallery",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = AddGalleryItemParams.safeParse(req.params);
    const parsed = AddGalleryItemBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid gallery add request" });
      return;
    }
    const scope = await requireGalleryAccess(
      req,
      res,
      parsed.data.publicationId,
      params.data.id,
      true,
    );
    if (!scope) return;

    // Validate the media asset belongs to this publication and is ready
    const [media] = await db
      .select({
        objectPath: mediaAssetsTable.objectPath,
        altText: mediaAssetsTable.altText,
        status: mediaAssetsTable.status,
        publicationId: mediaAssetsTable.publicationId,
      })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, parsed.data.mediaId));

    if (
      !media ||
      media.publicationId !== parsed.data.publicationId ||
      media.status !== "ready"
    ) {
      res.status(400).json({
        error:
          "Media asset not found, not ready, or belongs to a different publication",
      });
      return;
    }

    // Determine next sort_order
    const existing = await db
      .select({ sortOrder: contentItemGalleryTable.sortOrder })
      .from(contentItemGalleryTable)
      .where(eq(contentItemGalleryTable.contentItemId, params.data.id))
      .orderBy(asc(contentItemGalleryTable.sortOrder));
    const nextOrder =
      existing.length > 0
        ? (existing[existing.length - 1].sortOrder + 1)
        : 0;

    try {
      const [galleryItem] = await db
        .insert(contentItemGalleryTable)
        .values({
          contentItemId: params.data.id,
          mediaAssetId: parsed.data.mediaId,
          sortOrder: nextOrder,
          caption: parsed.data.caption ?? null,
        })
        .returning();

      res
        .status(201)
        .json(
          AddGalleryItemResponse.parse(
            serializeGalleryItem(galleryItem, media.objectPath, media.altText),
          ),
        );
    } catch {
      res
        .status(409)
        .json({ error: "This media asset is already in the gallery" });
    }
  },
);

// PUT /editorial/content-items/:id/gallery/reorder
router.put(
  "/editorial/content-items/:id/gallery/reorder",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = ReorderGalleryParams.safeParse(req.params);
    const parsed = ReorderGalleryBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid gallery reorder request" });
      return;
    }
    const scope = await requireGalleryAccess(
      req,
      res,
      parsed.data.publicationId,
      params.data.id,
      true,
    );
    if (!scope) return;

    // Update sort_order for each mediaId in its new position
    await Promise.all(
      parsed.data.items.map((mediaId, index) =>
        db
          .update(contentItemGalleryTable)
          .set({ sortOrder: index })
          .where(
            and(
              eq(contentItemGalleryTable.contentItemId, params.data.id),
              eq(contentItemGalleryTable.mediaAssetId, mediaId),
            ),
          ),
      ),
    );

    // Return updated ordered list
    const rows = await db
      .select({
        item: contentItemGalleryTable,
        objectPath: mediaAssetsTable.objectPath,
        altText: mediaAssetsTable.altText,
      })
      .from(contentItemGalleryTable)
      .innerJoin(
        mediaAssetsTable,
        eq(contentItemGalleryTable.mediaAssetId, mediaAssetsTable.id),
      )
      .where(eq(contentItemGalleryTable.contentItemId, params.data.id))
      .orderBy(
        asc(contentItemGalleryTable.sortOrder),
        asc(contentItemGalleryTable.createdAt),
      );

    res.json(
      ReorderGalleryResponse.parse(
        rows.map(({ item, objectPath, altText }) =>
          serializeGalleryItem(item, objectPath, altText),
        ),
      ),
    );
  },
);

// PATCH /editorial/content-items/:id/gallery/:mediaId  (update caption)
router.patch(
  "/editorial/content-items/:id/gallery/:mediaId",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = UpdateGalleryItemParams.safeParse(req.params);
    const parsed = UpdateGalleryItemBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid gallery update request" });
      return;
    }
    const scope = await requireGalleryAccess(
      req,
      res,
      parsed.data.publicationId,
      params.data.id,
      true,
    );
    if (!scope) return;

    const [galleryItem] = await db
      .update(contentItemGalleryTable)
      .set({ caption: parsed.data.caption })
      .where(
        and(
          eq(contentItemGalleryTable.contentItemId, params.data.id),
          eq(contentItemGalleryTable.mediaAssetId, params.data.mediaId),
        ),
      )
      .returning();

    if (!galleryItem) {
      res.status(404).json({ error: "Gallery item not found" });
      return;
    }

    const [media] = await db
      .select({
        objectPath: mediaAssetsTable.objectPath,
        altText: mediaAssetsTable.altText,
      })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, galleryItem.mediaAssetId));

    res.json(
      UpdateGalleryItemResponse.parse(
        serializeGalleryItem(
          galleryItem,
          media?.objectPath,
          media?.altText,
        ),
      ),
    );
  },
);

// DELETE /editorial/content-items/:id/gallery/:mediaId
router.delete(
  "/editorial/content-items/:id/gallery/:mediaId",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = RemoveGalleryItemParams.safeParse(req.params);
    const query = RemoveGalleryItemQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid gallery remove request" });
      return;
    }
    const scope = await requireGalleryAccess(
      req,
      res,
      query.data.publicationId,
      params.data.id,
      true,
    );
    if (!scope) return;

    const [deleted] = await db
      .delete(contentItemGalleryTable)
      .where(
        and(
          eq(contentItemGalleryTable.contentItemId, params.data.id),
          eq(contentItemGalleryTable.mediaAssetId, params.data.mediaId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Gallery item not found" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
