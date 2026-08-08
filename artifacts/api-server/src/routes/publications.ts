import { Router, type IRouter } from "express";
import {
  GetPublicationBySlugParams,
  GetPublicationBySlugResponse,
  ListPublishedContentItemsParams,
  ListPublishedContentItemsQueryParams,
  ListPublishedContentItemsResponse,
} from "@workspace/api-zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { contentItemsTable, db, mediaAssetsTable } from "@workspace/db";
import { getPublicationBySlug } from "../lib/platform";

const router: IRouter = Router();

function serializeItem(
  item: typeof contentItemsTable.$inferSelect,
  mediaObjectPath: string | null,
) {
  const coverUrl = mediaObjectPath
    ? `/api/storage/objects${mediaObjectPath.replace(/^\/objects/, "")}`
    : null;
  return {
    ...item,
    coverUrl,
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
      rows.map(({ item, mediaObjectPath }) => serializeItem(item, mediaObjectPath ?? null)),
    ),
  );
});

export default router;
