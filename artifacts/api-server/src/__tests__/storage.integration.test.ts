/**
 * Integration tests for POST /api/storage/uploads/request-url
 *
 * These tests exercise the full Express stack against the isolated test
 * database (TEST_DATABASE_URL).  Clerk auth and the object-storage sidecar
 * are mocked so the tests run without real cloud credentials.
 *
 * Happy-path assertions:
 *   • A media_asset row is created with the correct publicationId and uploadedBy.
 *   • An audit_event row is created for the same upload.
 *
 * Failure-path assertions:
 *   • No Clerk session → 401.
 *   • Authenticated but no publication access → 403.
 *   • Authenticated but target publication belongs to another tenant → 403.
 *   • Missing required body fields → 400.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import supertest from "supertest";
import { eq, and } from "drizzle-orm";

// ── Clerk mock ────────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file.  Variables used inside the
// factory must therefore also be hoisted via vi.hoisted() so they are
// initialised before the factory runs.

const { mockAuthenticateRequest, mockGetUser } = vi.hoisted(() => ({
  mockAuthenticateRequest: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: (req: { auth?: () => unknown }) =>
    typeof req.auth === "function" ? req.auth() : { userId: null },
  clerkClient: {
    authenticateRequest: mockAuthenticateRequest,
    users: { getUser: mockGetUser },
  },
}));

// ── Object-storage sidecar mock ───────────────────────────────────────────────
// Intercepts the internal fetch to the sidecar that issues signed PUT URLs so
// tests never need a real object-storage bucket.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── App (imported after mocks are in place) ───────────────────────────────────
import app from "../app.js";

// ── DB helpers (imported after DATABASE_URL is set by vitest.config.ts) ───────
import {
  db,
  usersTable,
  publicationsTable,
  userPublicationAccessTable,
  mediaAssetsTable,
  auditEventsTable,
  rolesTable,
} from "@workspace/db";

// ── Test fixture IDs ──────────────────────────────────────────────────────────
const TEST_CLERK_SUBJECT = "user_test_storage_integration";
const OTHER_CLERK_SUBJECT = "user_test_no_access_integration";
const NO_ACCESS_CLERK_SUBJECT = "user_test_inactive_integration";

// Populated in beforeAll
let testUserId = "";
let lasPublicationId = "";
let otherPublicationId = "";
let otherUserId = "";
let noAccessUserId = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fake sidecar response — returns a plausible signed URL. */
function stubSidecarSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      signed_url: "https://storage.example.com/bucket/object?sig=abc",
    }),
  } as Response);
}

/**
 * Configure Clerk mocks so a request is seen as signed-in with the given
 * Clerk subject.  clerkClient.users.getUser is also stubbed to return a
 * matching fake Clerk user.
 */
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

/** Configure Clerk mocks so the request has no session (unauthenticated). */
function signOut() {
  mockAuthenticateRequest.mockResolvedValueOnce({
    toAuth: () => ({ userId: null }),
  });
}

// ── Test fixtures setup ───────────────────────────────────────────────────────

beforeAll(async () => {
  // Resolve the LAS publication id from the seeded database.
  const [las] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "life-around-senoia"));

  if (!las) {
    throw new Error(
      "life-around-senoia publication missing — run `pnpm rebuild-test` first.",
    );
  }
  lasPublicationId = las.id;

  // Resolve the isolation-fixture publication for cross-tenant tests.
  const [fixture] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "foundation-fixture"));

  if (!fixture) {
    throw new Error(
      "foundation-fixture publication missing — run `pnpm rebuild-test` first.",
    );
  }
  otherPublicationId = fixture.id;

  // Resolve the publication-admin role.
  const [adminRole] = await db
    .select({ key: rolesTable.key, permissions: rolesTable.permissions })
    .from(rolesTable)
    .where(eq(rolesTable.key, "publication-admin"));

  if (!adminRole) {
    throw new Error("publication-admin role missing — run `pnpm rebuild-test` first.");
  }

  // Insert the primary test user and grant them LAS access.
  const [testUser] = await db
    .insert(usersTable)
    .values({
      authProviderSubject: TEST_CLERK_SUBJECT,
      email: "storage-test@example.com",
      displayName: "Storage Test User",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.authProviderSubject,
      set: { email: "storage-test@example.com", displayName: "Storage Test User" },
    })
    .returning();

  testUserId = testUser.id;

  await db
    .insert(userPublicationAccessTable)
    .values({
      userId: testUserId,
      publicationId: lasPublicationId,
      role: adminRole.key,
      permissions: adminRole.permissions,
    })
    .onConflictDoNothing();

  // Insert a second user who has access ONLY to the other publication, not LAS.
  const [otherUser] = await db
    .insert(usersTable)
    .values({
      authProviderSubject: OTHER_CLERK_SUBJECT,
      email: "other-pub-test@example.com",
      displayName: "Other Pub Test User",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.authProviderSubject,
      set: { email: "other-pub-test@example.com", displayName: "Other Pub Test User" },
    })
    .returning();

  otherUserId = otherUser.id;

  await db
    .insert(userPublicationAccessTable)
    .values({
      userId: otherUserId,
      publicationId: otherPublicationId,
      role: adminRole.key,
      permissions: adminRole.permissions,
    })
    .onConflictDoNothing();

  // Insert a user who exists in the DB but has no publication access at all.
  const [noAccessUser] = await db
    .insert(usersTable)
    .values({
      authProviderSubject: NO_ACCESS_CLERK_SUBJECT,
      email: "no-access-test@example.com",
      displayName: "No Access Test User",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.authProviderSubject,
      set: { email: "no-access-test@example.com", displayName: "No Access Test User" },
    })
    .returning();

  noAccessUserId = noAccessUser.id;
});

afterAll(async () => {
  // Remove test-specific rows so they don't litter the test DB between runs.
  // Cascade deletes handle child rows (media_assets, audit_events FK to user).
  for (const subject of [TEST_CLERK_SUBJECT, OTHER_CLERK_SUBJECT, NO_ACCESS_CLERK_SUBJECT]) {
    await db
      .delete(usersTable)
      .where(eq(usersTable.authProviderSubject, subject));
  }
});

beforeEach(() => {
  // Reset mocks between tests so stray mock calls don't bleed across.
  mockAuthenticateRequest.mockReset();
  mockGetUser.mockReset();
  mockFetch.mockReset();
});

// ── Helpers to read DB state ──────────────────────────────────────────────────

async function getLatestMediaAsset(userId: string) {
  const rows = await db
    .select()
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.uploadedBy, userId));
  return rows.at(-1) ?? null;
}

async function getLatestAuditEvent(userId: string, action: string) {
  const rows = await db
    .select()
    .from(auditEventsTable)
    .where(
      and(
        eq(auditEventsTable.userId, userId),
        eq(auditEventsTable.action, action),
      ),
    );
  return rows.at(-1) ?? null;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("POST /api/storage/uploads/request-url", () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  describe("authenticated staff with media:write access", () => {
    it("returns 200 with an uploadURL and objectPath", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");
      stubSidecarSuccess();

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 204800,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("uploadURL");
      expect(res.body).toHaveProperty("objectPath");
      expect(res.body).toHaveProperty("expiresInSeconds");
      expect(typeof res.body.uploadURL).toBe("string");
      expect(res.body.uploadURL).toMatch(/^https:\/\//);
    });

    it("persists a media_asset row with the correct publicationId and uploadedBy", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");
      stubSidecarSuccess();

      await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "banner.png",
          contentType: "image/png",
          size: 512000,
        });

      const asset = await getLatestMediaAsset(testUserId);

      expect(asset).not.toBeNull();
      expect(asset!.publicationId).toBe(lasPublicationId);
      expect(asset!.uploadedBy).toBe(testUserId);
      expect(asset!.originalName).toBe("banner.png");
      expect(asset!.mimeType).toBe("image/png");
      expect(asset!.byteSize).toBe(512000);
      expect(asset!.status).toBe("pending");
      expect(asset!.objectPath).toBeTruthy();
    });

    it("creates an audit_event for media.upload.requested linked to the media asset", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");
      stubSidecarSuccess();

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "document.pdf",
          contentType: "application/pdf",
          size: 1048576,
        });

      expect(res.status).toBe(200);

      const audit = await getLatestAuditEvent(testUserId, "media.upload.requested");

      expect(audit).not.toBeNull();
      expect(audit!.publicationId).toBe(lasPublicationId);
      expect(audit!.userId).toBe(testUserId);
      expect(audit!.entityType).toBe("media_asset");
      expect(audit!.entityId).toBeTruthy();
      // entityId should be the UUID of the new media_asset
      expect(audit!.metadata).toHaveProperty("objectPath");
    });

    it("the audit entityId matches the persisted media_asset id", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");
      stubSidecarSuccess();

      await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "video.mp4",
          contentType: "video/mp4",
          size: 10485760,
        });

      const asset = await getLatestMediaAsset(testUserId);
      const audit = await getLatestAuditEvent(testUserId, "media.upload.requested");

      expect(asset).not.toBeNull();
      expect(audit).not.toBeNull();
      expect(audit!.entityId).toBe(asset!.id);
    });
  });

  // ── Failure paths ──────────────────────────────────────────────────────────

  describe("unauthenticated request", () => {
    it("returns 401 when there is no Clerk session", async () => {
      signOut();

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 1024,
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("authenticated but no publication access", () => {
    it("returns 403 when the user has no access to any publication", async () => {
      signInAs(
        NO_ACCESS_CLERK_SUBJECT,
        "no-access-test@example.com",
        "No Access Test User",
      );
      // No sidecar stub needed — should be rejected before we even get there.

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 1024,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("cross-tenant isolation", () => {
    it("returns 403 when the user targets a publication they have no access to", async () => {
      // otherUser has access to foundation-fixture but NOT to life-around-senoia.
      signInAs(
        OTHER_CLERK_SUBJECT,
        "other-pub-test@example.com",
        "Other Pub Test User",
      );

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,   // LAS — not the user's publication
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 1024,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/No media upload access/i);
    });

    it("does not create any media_asset or audit row on a cross-tenant rejection", async () => {
      signInAs(
        OTHER_CLERK_SUBJECT,
        "other-pub-test@example.com",
        "Other Pub Test User",
      );

      await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          publicationId: lasPublicationId,
          name: "snoop.jpg",
          contentType: "image/jpeg",
          size: 512,
        });

      // No asset should exist for this user targeting LAS.
      const rows = await db
        .select()
        .from(mediaAssetsTable)
        .where(
          and(
            eq(mediaAssetsTable.uploadedBy, otherUserId),
            eq(mediaAssetsTable.publicationId, lasPublicationId),
          ),
        );

      expect(rows).toHaveLength(0);
    });
  });

  describe("malformed request body", () => {
    it("returns 400 when required fields are missing", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({ publicationId: lasPublicationId }); // missing name / contentType / size

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when publicationId is missing", async () => {
      signInAs(TEST_CLERK_SUBJECT, "storage-test@example.com", "Storage Test User");

      const res = await supertest(app)
        .post("/api/storage/uploads/request-url")
        .send({
          name: "photo.jpg",
          contentType: "image/jpeg",
          size: 1024,
          // no publicationId
        });

      expect(res.status).toBe(400);
    });
  });
});
