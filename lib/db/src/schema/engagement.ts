import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { publicationsTable } from "./platform";

export const newsletterSubscribersTable = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publicationsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    city: text("city"),
    status: text("status").notNull().default("active"),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("newsletter_subscribers_pub_email_idx").on(table.publicationId, table.email)],
);

export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribersTable.$inferInsert;

export const nominationsTable = pgTable("nominations", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicationId: uuid("publication_id")
    .notNull()
    .references(() => publicationsTable.id, { onDelete: "cascade" }),
  nominatorName: text("nominator_name").notNull(),
  nominatorEmail: text("nominator_email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  city: text("city"),
  category: text("category").notNull(),
  story: text("story").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Nomination = typeof nominationsTable.$inferSelect;
export type InsertNomination = typeof nominationsTable.$inferInsert;
