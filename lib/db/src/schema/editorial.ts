import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { publicationsTable, usersTable } from "./platform";

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

export const insertContentItemSchema = createInsertSchema(
  contentItemsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContentItem = typeof contentItemsTable.$inferSelect;
export type InsertContentItem = typeof contentItemsTable.$inferInsert;