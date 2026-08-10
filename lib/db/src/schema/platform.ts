import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const publicationsTable = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    description: text("description").notNull(),
    domain: text("domain"),
    timezone: text("timezone").notNull().default("America/New_York"),
    locale: text("locale").notNull().default("en-US"),
    logoMediaId: uuid("logo_media_id"),
    faviconMediaId: uuid("favicon_media_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("publications_slug_idx").on(table.slug)],
);

export const publicationSettingsTable = pgTable("publication_settings", {
  publicationId: uuid("publication_id")
    .primaryKey()
    .references(() => publicationsTable.id, { onDelete: "cascade" }),
  themeTokens: jsonb("theme_tokens").$type<Record<string, unknown>>().notNull(),
  navigationItems: jsonb("navigation_items")
    .$type<Array<Record<string, unknown>>>()
    .notNull(),
  enabledContentTypes: text("enabled_content_types").array().notNull(),
  defaultSeoTitle: text("default_seo_title").notNull(),
  defaultMetaDescription: text("default_meta_description").notNull(),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull(),
  contactEmail: text("contact_email"),
  ...timestamps,
});

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProviderSubject: text("auth_provider_subject").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_auth_provider_subject_idx").on(table.authProviderSubject),
  ],
);

export const rolesTable = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    permissions: text("permissions").array().notNull(),
    isSystem: boolean("is_system").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("roles_key_idx").on(table.key)],
);

export const userPublicationAccessTable = pgTable(
  "user_publication_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publicationsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permissions: text("permissions").array().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_publication_access_user_publication_idx").on(
      table.userId,
      table.publicationId,
    ),
  ],
);

export const mediaAssetsTable = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicationId: uuid("publication_id")
    .notNull()
    .references(() => publicationsTable.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  objectPath: text("object_path").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  status: text("status").notNull().default("pending"),
  altText: text("alt_text"),
  coverPosition: text("cover_position"),
  ...timestamps,
});

export const auditEventsTable = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicationId: uuid("publication_id").references(() => publicationsTable.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

export const insertPublicationSchema = createInsertSchema(publicationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPublicationSettingsSchema = createInsertSchema(
  publicationSettingsTable,
).omit({ createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRoleSchema = createInsertSchema(rolesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserPublicationAccessSchema = createInsertSchema(
  userPublicationAccessTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMediaAssetSchema = createInsertSchema(mediaAssetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const staffInvitesTable = pgTable(
  "staff_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publicationsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    permissions: text("permissions").array().notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("staff_invites_publication_email_idx").on(
      table.publicationId,
      table.email,
    ),
  ],
);

export const insertStaffInviteSchema = createInsertSchema(staffInvitesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StaffInvite = typeof staffInvitesTable.$inferSelect;

export type Publication = typeof publicationsTable.$inferSelect;
export type PublicationSettings = typeof publicationSettingsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type Role = typeof rolesTable.$inferSelect;
export type UserPublicationAccess =
  typeof userPublicationAccessTable.$inferSelect;
export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;