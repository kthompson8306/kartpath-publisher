import { Router, type IRouter } from "express";
import {
  GetPublicationBySlugParams,
  GetPublicationBySlugResponse,
  GetPublishedArticleParams,
  GetPublishedArticleResponse,
  ListPublishedContentItemsParams,
  ListPublishedContentItemsQueryParams,
  ListPublishedContentItemsResponse,
} from "@workspace/api-zod";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  contentItemGalleryTable,
  contentItemsTable,
  db,
  mediaAssetsTable,
} from "@workspace/db";
import { getPublicationBySlug } from "../lib/platform";

const router: IRouter = Router();

function serializeItem(
  item: typeof contentItemsTable.$inferSelect,
  mediaObjectPath: string | null,
  mediaAltText: string | null = null,
) {
  const coverUrl = mediaObjectPath
    ? `/api/storage/objects${mediaObjectPath.replace(/^\/objects/, "")}`
    : null;
  return {
    ...item,
    coverUrl,
    coverAltText: mediaAltText,
    coverFocalX: item.coverFocalX ?? 0.5,
    coverFocalY: item.coverFocalY ?? 0.5,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: item.publishedAt?.toISOString() ?? null,
  };
}

router.get("/publications/:slug", async (req, res): Promise<void> => {
  const params = GetPublicationBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getPublicationBySlug(params.data.slug);
  if (!result?.settings) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  res.json(
    GetPublicationBySlugResponse.parse({
      ...result.publication,
      settings: result.settings,
    }),
  );
});

router.get("/publications/:slug/content-items", async (req, res): Promise<void> => {
  const params = ListPublishedContentItemsParams.safeParse(req.params);
  const query = ListPublishedContentItemsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid public content request" });
    return;
  }

  const result = await getPublicationBySlug(params.data.slug);
  if (!result?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const conditions = [
    eq(contentItemsTable.publicationId, result.publication.id),
    eq(contentItemsTable.status, "published"),
  ];
  if (query.data.contentType) {
    conditions.push(eq(contentItemsTable.contentType, query.data.contentType));
  }
  if (query.data.issue) {
    conditions.push(
      sql`${contentItemsTable.details}->>'issue' = ${query.data.issue}`,
    );
  }

  const rows = await db
    .select({
      item: contentItemsTable,
      mediaObjectPath: mediaAssetsTable.objectPath,
      mediaAltText: mediaAssetsTable.altText,
    })
    .from(contentItemsTable)
    .leftJoin(
      mediaAssetsTable,
      and(
        eq(contentItemsTable.coverMediaId, mediaAssetsTable.id),
        eq(mediaAssetsTable.status, "ready"),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(contentItemsTable.publishedAt), asc(contentItemsTable.updatedAt));

  res.json(
    ListPublishedContentItemsResponse.parse(
      rows.map(({ item, mediaObjectPath, mediaAltText }) =>
        serializeItem(item, mediaObjectPath ?? null, mediaAltText ?? null),
      ),
    ),
  );
});

router.get("/publications/:slug/content-items/:articleSlug", async (req, res): Promise<void> => {
  const params = GetPublishedArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid article request" });
    return;
  }

  const result = await getPublicationBySlug(params.data.slug);
  if (!result?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const [row] = await db
    .select({
      item: contentItemsTable,
      mediaObjectPath: mediaAssetsTable.objectPath,
      mediaAltText: mediaAssetsTable.altText,
    })
    .from(contentItemsTable)
    .leftJoin(
      mediaAssetsTable,
      and(
        eq(contentItemsTable.coverMediaId, mediaAssetsTable.id),
        eq(mediaAssetsTable.status, "ready"),
      ),
    )
    .where(
      and(
        eq(contentItemsTable.slug, params.data.articleSlug),
        eq(contentItemsTable.publicationId, result.publication.id),
        eq(contentItemsTable.status, "published"),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // Fetch gallery items in sort order
  const galleryRows = await db
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
    .where(eq(contentItemGalleryTable.contentItemId, row.item.id))
    .orderBy(
      asc(contentItemGalleryTable.sortOrder),
      asc(contentItemGalleryTable.createdAt),
    );

  const gallery = galleryRows.map(({ item, objectPath, altText }) => ({
    id: item.id,
    mediaAssetId: item.mediaAssetId,
    mediaUrl: objectPath
      ? `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`
      : null,
    altText: altText ?? null,
    sortOrder: item.sortOrder,
    caption: item.caption ?? null,
  }));

  res.json(
    GetPublishedArticleResponse.parse({
      ...serializeItem(row.item, row.mediaObjectPath ?? null, row.mediaAltText ?? null),
      gallery,
    }),
  );
});

// GET /publications/:slug/editions — returns { [issueNum]: { embedUrl, description } }
// Used by the public EditionReader and Editions archive to fetch per-issue data.
router.get("/publications/:slug/editions", async (req, res): Promise<void> => {
  const params = GetPublicationBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const result = await getPublicationBySlug(params.data.slug);
  if (!result?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const rows = await db
    .select({ slug: contentItemsTable.slug, details: contentItemsTable.details, summary: contentItemsTable.summary })
    .from(contentItemsTable)
    .where(
      and(
        eq(contentItemsTable.publicationId, result.publication.id),
        eq(contentItemsTable.contentType, "digital_edition"),
      ),
    );

  // Return { "01": { embedUrl: "https://...", description: "..." }, "02": { embedUrl: null, description: null }, ... }
  const editionMap: Record<string, { embedUrl: string | null; description: string | null }> = {};
  for (const row of rows) {
    // slug format: "edition-01" → key "01"
    const num = row.slug.replace(/^edition-/, "");
    const details = row.details as Record<string, string>;
    editionMap[num] = {
      embedUrl: details.issuu_embed_url ?? null,
      description: details.description || row.summary || null,
    };
  }

  res.json(editionMap);
});

export default router;
