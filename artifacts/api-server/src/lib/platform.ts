import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  auditEventsTable,
  db,
  publicationsTable,
  publicationSettingsTable,
  rolesTable,
  userPublicationAccessTable,
  usersTable,
} from "@workspace/db";

/**
 * Upsert a local user record from Clerk identity data.
 * Does NOT grant any publication access — access must be granted explicitly
 * via grantBootstrapStaffAccess or a future admin-invite flow.
 * New users start with status "pending" until access is granted.
 */
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

/**
 * Controlled bootstrap path: grants publication-admin access to the
 * Life Around Senoia publication if the user's email appears in the
 * STAFF_BOOTSTRAP_EMAILS environment variable (comma-separated list).
 *
 * Safe to call on every login — the insert uses onConflictDoNothing so
 * existing grants are never overwritten.
 */
export async function grantBootstrapStaffAccess(
  userId: string,
  email: string,
): Promise<void> {
  const raw = process.env.STAFF_BOOTSTRAP_EMAILS ?? "";
  const allowedEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(email.toLowerCase())) {
    return;
  }

  const [las] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "life-around-senoia"));

  if (!las) {
    throw new Error("Life Around Senoia has not been seeded");
  }

  const [role] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.key, "publication-admin"));

  if (!role) {
    throw new Error("publication-admin role has not been seeded");
  }

  await db
    .insert(userPublicationAccessTable)
    .values({
      userId,
      publicationId: las.id,
      role: role.key,
      permissions: role.permissions,
    })
    .onConflictDoNothing();
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

/**
 * Returns the access record for a specific user+publication pair, or null
 * if the user has no access to that publication. Use this to enforce
 * cross-publication isolation on routes that accept a publicationId parameter.
 */
export async function getUserPublicationAccess(
  userId: string,
  publicationId: string,
) {
  const [result] = await db
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
    .where(
      and(
        eq(userPublicationAccessTable.userId, userId),
        eq(userPublicationAccessTable.publicationId, publicationId),
      ),
    );
  return result ?? null;
}

export function hasEditorialWriteAccess(permissions: string[]) {
  return permissions.includes("content:write") || permissions.includes("publication:write");
}

export function hasEditorialReadAccess(permissions: string[]) {
  return (
    permissions.includes("publication:read") ||
    permissions.includes("content:write") ||
    permissions.includes("publication:write")
  );
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
