/**
 * Tenant isolation regression tests — editorial content endpoints.
 *
 * Two seeded publications are used as adversarial tenants:
 *   • life-around-senoia  (LAS)         — testUser has publication-admin access
 *   • foundation-fixture                 — otherUser has publication-admin access
 *
 * Every test in this file asserts that a staff member of one publication
 * CANNOT read, update, delete, or cover-photo-attach content or media that
 * belongs to the other publication.
 *
 * A "correct access" section at the bottom verifies the enforcement is not
 * simply broken auth — each user can still access their own publication.
 *
 * Run: cd lib/db && pnpm rebuild-test && cd ../../artifacts/api-server && pnpm test
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import { and, eq } from "drizzle-orm";

// ── Clerk mock ────────────────────────────────────────────────────────────────

const { mockAuthenticateRequest, mockGetUser } = vi.hoisted(() => ({
  mockAuthenticateRequest: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: (req: { auth?: () => unknown }) =>
    typeof req.auth === "function" ? req.auth() : { userId: null },
  clerkClient: {
    authenticateRequest: mockAuthenticateRequest,
    users: { getUser: mockGetUser, getUserList: vi.fn().mockResolvedValue({ data: [] }) },
  },
}));

// ── Fetch mock (editorial routes make no sidecar calls, but stub globally) ────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── App (after mocks) ─────────────────────────────────────────────────────────
import app from "../app.js";

// ── DB ────────────────────────────────────────────────────────────────────────
import {
  db,
  usersTable,
  publicationsTable,
  userPublicationAccessTable,
  mediaAssetsTable,
  contentItemsTable,
  rolesTable,
} from "@workspace/db";

// ── Fixture subjects (unique to this file) ────────────────────────────────────
const TEST_CLERK_SUBJECT  = "user_test_editorial_integration";       // LAS admin
const OTHER_CLERK_SUBJECT = "user_test_other_editorial_integration";  // foundation-fixture admin
const NO_ACCESS_CLERK_SUBJECT = "user_test_no_access_editorial_integration";

let lasUserId          = "";
let lasPublicationId   = "";
let foundationUserId   = "";
let foundationPublicationId = "";
let noAccessUserId     = "";

// Content items and media assets created in beforeAll
let lasItemId         = ""; // LAS item — used for cross-pub cover PATCH tests
let foundationItemId  = ""; // foundation item — used for cross-tenant read/write tests
let foundationMediaId = ""; // ready media in foundation — used for cross-pub cover tests

// ── Helpers ───────────────────────────────────────────────────────────────────

function signInAs(clerkSubject: string, email: string, displayName: string) {
  mockAuthenticateRequest.mockResolvedValueOnce({
    toAuth: () => ({ userId: clerkSubject }),
  });
  mockGetUser.mockResolvedValueOnce({
    primaryEmailAddress: { emailAddress: email },
    emailAddresses: [{ emailAddress: email }],
    firstName: displayName.split(" ")[0] ?? "",
    lastName: displayName.split(" ").slice(1).join(" ") ?? "",
    username: null,
  });
}

// ── Test fixture setup ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Resolve publication IDs from the seeded database.
  const [las] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "life-around-senoia"));
  if (!las) throw new Error("life-around-senoia missing — run `pnpm rebuild-test`");
  lasPublicationId = las.id;

  const [foundation] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "foundation-fixture"));
  if (!foundation) throw new Error("foundation-fixture missing — run `pnpm rebuild-test`");
  foundationPublicationId = foundation.id;

  // Resolve the publication-admin role.
  const [adminRole] = await db
    .select({ key: rolesTable.key, permissions: rolesTable.permissions })
    .from(rolesTable)
    .where(eq(rolesTable.key, "publication-admin"));
  if (!adminRole) throw new Error("publication-admin role missing — run `pnpm rebuild-test`");

  // Create test users.
  const [lasUser] = await db
    .insert(usersTable)
    .values({ authProviderSubject: TEST_CLERK_SUBJECT, email: "editorial-test@example.com", displayName: "Editorial Test User", status: "active" })
    .onConflictDoUpdate({ target: usersTable.authProviderSubject, set: { email: "editorial-test@example.com" } })
    .returning();
  lasUserId = lasUser!.id;

  const [otherUser] = await db
    .insert(usersTable)
    .values({ authProviderSubject: OTHER_CLERK_SUBJECT, email: "other-editorial-test@example.com", displayName: "Other Editorial User", status: "active" })
    .onConflictDoUpdate({ target: usersTable.authProviderSubject, set: { email: "other-editorial-test@example.com" } })
    .returning();
  foundationUserId = otherUser!.id;

  const [noAccessUser] = await db
    .insert(usersTable)
    .values({ authProviderSubject: NO_ACCESS_CLERK_SUBJECT, email: "no-access-editorial@example.com", displayName: "No Access User", status: "active" })
    .onConflictDoUpdate({ target: usersTable.authProviderSubject, set: { email: "no-access-editorial@example.com" } })
    .returning();
  noAccessUserId = noAccessUser!.id;

  // Grant access — LAS user → LAS only, other user → foundation only.
  await db.insert(userPublicationAccessTable)
    .values({ userId: lasUserId, publicationId: lasPublicationId, role: adminRole.key, permissions: adminRole.permissions })
    .onConflictDoNothing();
  await db.insert(userPublicationAccessTable)
    .values({ userId: foundationUserId, publicationId: foundationPublicationId, role: adminRole.key, permissions: adminRole.permissions })
    .onConflictDoNothing();

  // Create a content item in foundation-fixture for cross-tenant read/write tests.
  const [foundationItem] = await db.insert(contentItemsTable).values({
    publicationId: foundationPublicationId,
    contentType: "event",
    status: "draft",
    slug: "isolation-test-foundation-item",
    title: "Foundation Fixture Test Item",
    summary: "Isolation test fixture",
    body: "Isolation test body",
    details: {},
    createdBy: foundationUserId,
  }).returning();
  foundationItemId = foundationItem!.id;

  // Create a content item in LAS for the cross-pub cover-photo PATCH test.
  const [lasItem] = await db.insert(contentItemsTable).values({
    publicationId: lasPublicationId,
    contentType: "event",
    status: "draft",
    slug: "isolation-test-las-item",
    title: "LAS Test Item",
    summary: "Isolation test fixture",
    body: "Isolation test body",
    details: {},
    createdBy: lasUserId,
  }).returning();
  lasItemId = lasItem!.id;

  // Create a "ready" media asset in foundation-fixture for cover-photo tests.
  const [foundationMedia] = await db.insert(mediaAssetsTable).values({
    publicationId: foundationPublicationId,
    uploadedBy: foundationUserId,
    objectPath: "/objects/uploads/isolation-test-foundation-media",
    originalName: "isolation-test.jpg",
    mimeType: "image/jpeg",
    byteSize: 2048,
    status: "ready",
  }).returning();
  foundationMediaId = foundationMedia!.id;
});

afterAll(async () => {
  // Delete content items explicitly — they are not cascade-deleted when users are removed.
  if (foundationItemId) await db.delete(contentItemsTable).where(eq(contentItemsTable.id, foundationItemId));
  if (lasItemId)        await db.delete(contentItemsTable).where(eq(contentItemsTable.id, lasItemId));
  if (foundationMediaId) await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id, foundationMediaId));
  // Deleting users cascades audit_events; publication_access rows are also FK'd.
  for (const subject of [TEST_CLERK_SUBJECT, OTHER_CLERK_SUBJECT, NO_ACCESS_CLERK_SUBJECT]) {
    await db.delete(usersTable).where(eq(usersTable.authProviderSubject, subject));
  }
});

beforeEach(() => {
  mockAuthenticateRequest.mockReset();
  mockGetUser.mockReset();
  mockFetch.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Cross-tenant read isolation", () => {
  it("GET list: rejects a LAS admin who requests another publication's content", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get("/api/editorial/content-items")
      .query({ publicationId: foundationPublicationId });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("GET single: rejects a LAS admin who requests a specific item from another publication", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get(`/api/editorial/content-items/${foundationItemId}`)
      .query({ publicationId: foundationPublicationId });

    expect(res.status).toBe(403);
  });

  it("GET single: does not leak the item even when the caller supplies the correct item ID", async () => {
    // Guards at the permission layer must fire before the DB lookup.
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get(`/api/editorial/content-items/${foundationItemId}`)
      .query({ publicationId: foundationPublicationId });

    expect(res.status).toBe(403);
    // No item data in the body
    expect(res.body.item ?? res.body.data ?? res.body.id).toBeUndefined();
  });
});

describe("Cross-tenant write isolation", () => {
  it("PATCH: rejects a LAS admin trying to update a content item from another publication", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    // All fields required by UpdateContentItemBody — body must be valid so the
    // schema check passes and the auth gate fires (not a 400 schema rejection).
    const res = await supertest(app)
      .patch(`/api/editorial/content-items/${foundationItemId}`)
      .send({
        publicationId: foundationPublicationId,
        contentType: "event",
        slug: "isolation-test-foundation-item",
        title: "Injected Title",
        summary: "Injected summary",
        body: "Injected body",
        details: {},
        coverMediaId: null, // nullable() in schema — key must be present
      });

    expect(res.status).toBe(403);

    // Prove the item in the DB was NOT modified.
    const [item] = await db
      .select({ title: contentItemsTable.title })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, foundationItemId));
    expect(item!.title).toBe("Foundation Fixture Test Item");
  });

  it("DELETE: rejects a LAS admin trying to delete a content item from another publication", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .delete(`/api/editorial/content-items/${foundationItemId}`)
      .query({ publicationId: foundationPublicationId });

    expect(res.status).toBe(403);

    // Prove the item still exists.
    const [item] = await db
      .select({ id: contentItemsTable.id })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, foundationItemId));
    expect(item).toBeDefined();
  });

  it("Publish: rejects a LAS admin trying to publish a content item from another publication", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    // PublishContentItemBody requires both publicationId and status.
    const res = await supertest(app)
      .post(`/api/editorial/content-items/${foundationItemId}/publish`)
      .send({ publicationId: foundationPublicationId, status: "published" });

    expect(res.status).toBe(403);

    // Prove the item remains a draft.
    const [item] = await db
      .select({ status: contentItemsTable.status })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, foundationItemId));
    expect(item!.status).toBe("draft");
  });
});

describe("Cross-tenant cover-photo isolation", () => {
  it("Create: rejects attaching another publication's media as a cover photo on a new item", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .post("/api/editorial/content-items")
      .send({
        publicationId: lasPublicationId,
        contentType: "event",
        slug: "cross-cover-create-test",
        title: "Cross Cover Create Test",
        summary: "Test item",
        body: "Body text",
        details: {},
        coverMediaId: foundationMediaId, // belongs to foundation-fixture, not LAS
      });

    expect(res.status).toBe(400);

    // Prove no item was created with this slug in LAS.
    const orphaned = await db
      .select()
      .from(contentItemsTable)
      .where(
        and(
          eq(contentItemsTable.publicationId, lasPublicationId),
          eq(contentItemsTable.slug, "cross-cover-create-test"),
        ),
      );
    expect(orphaned).toHaveLength(0);
  });

  it("PATCH: rejects updating a LAS item to use another publication's media as a cover photo", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    // Must include all required body fields so schema validation passes and
    // resolveCoverMedia() fires — that's where the cross-pub rejection happens.
    const res = await supertest(app)
      .patch(`/api/editorial/content-items/${lasItemId}`)
      .send({
        publicationId: lasPublicationId,
        contentType: "event",
        slug: "isolation-test-las-item",
        title: "LAS Test Item",
        summary: "Isolation test fixture",
        body: "Isolation test body",
        details: {},
        coverMediaId: foundationMediaId, // belongs to foundation-fixture, not LAS
      });

    expect(res.status).toBe(400);

    // Prove the item's coverMediaId was not changed.
    const [item] = await db
      .select({ coverMediaId: contentItemsTable.coverMediaId })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, lasItemId));
    expect(item!.coverMediaId).toBeNull();
  });
});

describe("No-publication-access isolation", () => {
  it("returns 403 for a user with no publication access at all (GET list)", async () => {
    signInAs(NO_ACCESS_CLERK_SUBJECT, "no-access-editorial@example.com", "No Access User");

    const res = await supertest(app)
      .get("/api/editorial/content-items")
      .query({ publicationId: lasPublicationId });

    expect(res.status).toBe(403);
  });

  it("returns 403 for a user with no access attempting a write (PATCH)", async () => {
    signInAs(NO_ACCESS_CLERK_SUBJECT, "no-access-editorial@example.com", "No Access User");

    const res = await supertest(app)
      .patch(`/api/editorial/content-items/${lasItemId}`)
      .send({ publicationId: lasPublicationId, title: "Injected" });

    expect(res.status).toBe(403);
  });
});

describe("Correct-access baseline — own publication works", () => {
  it("LAS admin can list their own publication's content items", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get("/api/editorial/content-items")
      .query({ publicationId: lasPublicationId });

    expect(res.status).toBe(200);
    // GET list returns a plain array of content items (not { items: [...] })
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("LAS admin can read their own specific content item", async () => {
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get(`/api/editorial/content-items/${lasItemId}`)
      .query({ publicationId: lasPublicationId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(lasItemId);
  });

  it("foundation-fixture admin can list their own publication's content items", async () => {
    signInAs(OTHER_CLERK_SUBJECT, "other-editorial-test@example.com", "Other Editorial User");

    const res = await supertest(app)
      .get("/api/editorial/content-items")
      .query({ publicationId: foundationPublicationId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("LAS admin cannot read the foundation item even using their own publicationId in the query", async () => {
    // Supplying the correct item ID but the wrong (own) publicationId — should 404 not 403
    // because requireEditorialAccess passes, but the item-level lookup fails.
    signInAs(TEST_CLERK_SUBJECT, "editorial-test@example.com", "Editorial Test User");

    const res = await supertest(app)
      .get(`/api/editorial/content-items/${foundationItemId}`)
      .query({ publicationId: lasPublicationId }); // own pub, but item belongs to foundation

    // Item is found in DB but its publicationId doesn't match — should be 404
    expect(res.status).toBe(404);
  });
});
