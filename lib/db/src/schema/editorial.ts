import { createInsertSchema } from "drizzle-zod";
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { mediaAssetsTable, publicationsTable, usersTable } from "./platform";

export const editorialContentTypes = [
  "featured-family",
  "nonprofit-spotlight",
  "young-achiever",
  "pet-of-the-month",
  "business-listing",
  "event",
] as const;

export const editorialStatuses = ["draft", "published"] as const;

export const contentItemsTable = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publicationsTable.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    status: text("status").notNull().default("draft"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    details: jsonb("details").$type<Record<string, string>>().notNull(),
    coverMediaId: uuid("cover_media_id"),
    coverFocalX: doublePrecision("cover_focal_x").notNull().default(0.5),
    coverFocalY: doublePrecision("cover_focal_y").notNull().default(0.5),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("content_items_publication_slug_idx").on(
      table.publicationId,
      table.slug,
    ),
    index("content_items_publication_status_idx").on(
      table.publicationId,
      table.status,
    ),
    index("content_items_publication_type_idx").on(
      table.publicationId,
      table.contentType,
    ),
  ],
);

export const contentItemGalleryTable = pgTable(
  "content_item_gallery",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItemsTable.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssetsTable.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_item_gallery_item_media_idx").on(
      table.contentItemId,
      table.mediaAssetId,
    ),
    index("content_item_gallery_item_order_idx").on(
      table.contentItemId,
      table.sortOrder,
    ),
  ],
);

export const insertContentItemSchema = createInsertSchema(
  contentItemsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContentItem = typeof contentItemsTable.$inferSelect;
export type InsertContentItem = typeof contentItemsTable.$inferInsert;