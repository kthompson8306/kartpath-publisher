import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  auditEventsTable,
  db,
  publicationsTable,
  publicationSettingsTable,
  rolesTable,
  staffInvitesTable,
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

/**
 * On every login, auto-grant access for any pending staff invites that match
 * this user's email. Safe to call repeatedly — uses onConflictDoNothing.
 */
export async function grantInviteBasedAccess(
  userId: string,
  email: string,
): Promise<void> {
  const pending = await db
    .select()
    .from(staffInvitesTable)
    .where(
      and(
        eq(staffInvitesTable.email, email.toLowerCase()),
        eq(staffInvitesTable.status, "pending"),
      ),
    );

  if (pending.length === 0) return;

  for (const invite of pending) {
    await db
      .insert(userPublicationAccessTable)
      .values({
        userId,
        publicationId: invite.publicationId,
        role: invite.role,
        permissions: invite.permissions,
      })
      .onConflictDoNothing();

    await db
      .update(staffInvitesTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(staffInvitesTable.id, invite.id));
  }

  await db
    .update(usersTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

/**
 * List all active staff members and pending invites for a publication.
 */
export async function listStaffRoster(publicationId: string) {
  const members = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      role: userPublicationAccessTable.role,
      permissions: userPublicationAccessTable.permissions,
      grantedAt: userPublicationAccessTable.createdAt,
    })
    .from(userPublicationAccessTable)
    .innerJoin(usersTable, eq(usersTable.id, userPublicationAccessTable.userId))
    .where(eq(userPublicationAccessTable.publicationId, publicationId));

  const invites = await db
    .select({
      id: staffInvitesTable.id,
      email: staffInvitesTable.email,
      role: staffInvitesTable.role,
      status: staffInvitesTable.status,
      invitedAt: staffInvitesTable.createdAt,
    })
    .from(staffInvitesTable)
    .where(
      and(
        eq(staffInvitesTable.publicationId, publicationId),
        eq(staffInvitesTable.status, "pending"),
      ),
    );

  return { members, invites };
}

/**
 * Invite a staff member by email. If the Clerk account already exists, access
 * is granted immediately and result is "granted". Otherwise a pending invite is
 * recorded and result is "invited" — access is auto-granted when they first
 * sign in via grantInviteBasedAccess.
 */
export async function createStaffInvite(input: {
  publicationId: string;
  email: string;
  role: string;
  invitedByUserId: string;
}): Promise<
  | { result: "granted"; member: { userId: string; email: string; displayName: string; role: string; permissions: string[]; grantedAt: string } }
  | { result: "invited"; invite: { id: string; email: string; role: string; status: string; invitedAt: string } }
> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const [roleRecord] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.key, input.role));
  if (!roleRecord) {
    throw new Error(`Role "${input.role}" not found`);
  }

  // Look up existing Clerk user by email
  const clerkResult = await clerkClient.users.getUserList({
    emailAddress: [normalizedEmail],
  });
  const clerkUsers = clerkResult.data ?? (Array.isArray(clerkResult) ? clerkResult : []);

  if (clerkUsers.length > 0) {
    // User already has a Clerk account — upsert local record and grant access now
    const clerkUser = clerkUsers[0];
    const localUser = await ensureLocalUser(clerkUser.id);

    const [grant] = await db
      .insert(userPublicationAccessTable)
      .values({
        userId: localUser.id,
        publicationId: input.publicationId,
        role: roleRecord.key,
        permissions: roleRecord.permissions,
      })
      .onConflictDoUpdate({
        target: [
          userPublicationAccessTable.userId,
          userPublicationAccessTable.publicationId,
        ],
        set: {
          role: roleRecord.key,
          permissions: roleRecord.permissions,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .update(usersTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(usersTable.id, localUser.id));

    // Consume any pre-existing invite for this email+publication
    await db
      .update(staffInvitesTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(
        and(
          eq(staffInvitesTable.publicationId, input.publicationId),
          eq(staffInvitesTable.email, normalizedEmail),
          eq(staffInvitesTable.status, "pending"),
        ),
      );

    return {
      result: "granted",
      member: {
        userId: localUser.id,
        email: localUser.email,
        displayName: localUser.displayName,
        role: grant.role,
        permissions: grant.permissions,
        grantedAt: grant.createdAt.toISOString(),
      },
    };
  }

  // No Clerk account yet — create a pending invite
  const [invite] = await db
    .insert(staffInvitesTable)
    .values({
      publicationId: input.publicationId,
      email: normalizedEmail,
      role: roleRecord.key,
      permissions: roleRecord.permissions,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [staffInvitesTable.publicationId, staffInvitesTable.email],
      set: {
        role: roleRecord.key,
        permissions: roleRecord.permissions,
        invitedByUserId: input.invitedByUserId,
        status: "pending",
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    result: "invited",
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invitedAt: invite.createdAt.toISOString(),
    },
  };
}

/**
 * Remove a staff member's access to a publication.
 * Returns false if the access record did not exist.
 */
export async function revokeStaffAccess(
  publicationId: string,
  targetUserId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(userPublicationAccessTable)
    .where(
      and(
        eq(userPublicationAccessTable.publicationId, publicationId),
        eq(userPublicationAccessTable.userId, targetUserId),
      ),
    )
    .returning();
  return deleted.length > 0;
}

/**
 * Cancel a pending staff invite.
 * Returns false if the invite was not found or already consumed.
 */
export async function cancelStaffInvite(
  inviteId: string,
  publicationId: string,
): Promise<boolean> {
  const updated = await db
    .update(staffInvitesTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(staffInvitesTable.id, inviteId),
        eq(staffInvitesTable.publicationId, publicationId),
        eq(staffInvitesTable.status, "pending"),
      ),
    )
    .returning();
  return updated.length > 0;
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
