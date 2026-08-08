import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  auditEventsTable,
  db,
  publicationsTable,
  publicationSettingsTable,
  userPublicationAccessTable,
  usersTable,
} from "@workspace/db";

export async function ensureLocalUser(authProviderSubject: string) {
  const clerkUser = await clerkClient.users.getUser(authProviderSubject);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    `${authProviderSubject}@clerk.local`;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email;

  const [user] = await db
    .insert(usersTable)
    .values({
      authProviderSubject,
      email,
      displayName,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: usersTable.authProviderSubject,
      set: { email, displayName, updatedAt: new Date() },
    })
    .returning();

  return user;
}

export async function getPublicationBySlug(slug: string) {
  const [result] = await db
    .select({ publication: publicationsTable, settings: publicationSettingsTable })
    .from(publicationsTable)
    .leftJoin(
      publicationSettingsTable,
      eq(publicationSettingsTable.publicationId, publicationsTable.id),
    )
    .where(eq(publicationsTable.slug, slug));
  return result;
}

export async function getUserAccess(userId: string) {
  return db
    .select({
      publicationId: userPublicationAccessTable.publicationId,
      publicationSlug: publicationsTable.slug,
      role: userPublicationAccessTable.role,
      permissions: userPublicationAccessTable.permissions,
    })
    .from(userPublicationAccessTable)
    .innerJoin(
      publicationsTable,
      eq(publicationsTable.id, userPublicationAccessTable.publicationId),
    )
    .where(eq(userPublicationAccessTable.userId, userId));
}

export async function getFirstUserPublication(userId: string) {
  const [result] = await db
    .select({ publicationId: userPublicationAccessTable.publicationId })
    .from(userPublicationAccessTable)
    .where(eq(userPublicationAccessTable.userId, userId))
    .limit(1);
  return result?.publicationId;
}

export async function getFirstUserPublicationAccess(userId: string) {
  const [result] = await db
    .select({
      publicationId: userPublicationAccessTable.publicationId,
      role: userPublicationAccessTable.role,
      permissions: userPublicationAccessTable.permissions,
    })
    .from(userPublicationAccessTable)
    .where(eq(userPublicationAccessTable.userId, userId))
    .limit(1);
  return result;
}

export async function recordAuditEvent(input: {
  publicationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEventsTable).values({
    publicationId: input.publicationId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}