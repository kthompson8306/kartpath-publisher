import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  publicationsTable,
  rolesTable,
  userPublicationAccessTable,
  usersTable,
} from "./schema";

const [authProviderSubject, publicationSlug = "life-around-senoia", roleKey = "publication-admin"] =
  process.argv.slice(2).filter((argument) => argument !== "--");

if (!authProviderSubject) {
  throw new Error(
    "Usage: pnpm --filter @workspace/db run bootstrap-access -- <clerk-user-id> [publication-slug] [role-key]",
  );
}

const [user] = await db
  .select({ id: usersTable.id })
  .from(usersTable)
  .where(eq(usersTable.authProviderSubject, authProviderSubject));
if (!user) {
  throw new Error(
    `No local user exists for Clerk subject ${authProviderSubject}. Sign in once before granting access.`,
  );
}

const [publication] = await db
  .select({ id: publicationsTable.id })
  .from(publicationsTable)
  .where(eq(publicationsTable.slug, publicationSlug));
if (!publication) {
  throw new Error(`Publication ${publicationSlug} does not exist.`);
}

const [role] = await db
  .select({ key: rolesTable.key, permissions: rolesTable.permissions })
  .from(rolesTable)
  .where(eq(rolesTable.key, roleKey));
if (!role) {
  throw new Error(`Role ${roleKey} does not exist.`);
}

await db
  .insert(userPublicationAccessTable)
  .values({
    userId: user.id,
    publicationId: publication.id,
    role: role.key,
    permissions: role.permissions,
  })
  .onConflictDoUpdate({
    target: [
      userPublicationAccessTable.userId,
      userPublicationAccessTable.publicationId,
    ],
    set: { role: role.key, permissions: role.permissions, updatedAt: new Date() },
  });
await db
  .update(usersTable)
  .set({ status: "active", updatedAt: new Date() })
  .where(eq(usersTable.id, user.id));

console.log(
  JSON.stringify({
    granted: true,
    authProviderSubject,
    publicationSlug,
    role: role.key,
  }),
);
await db.$client.end();