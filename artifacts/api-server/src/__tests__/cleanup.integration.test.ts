/**
 * Integration tests for cleanupStaleMediaUploads().
 *
 * Proves that:
 *   1. Pending media_assets older than STALE_THRESHOLD_HOURS are processed:
 *        • file exists in GCS  → status transitions to "ready"  (recovered)
 *        • file missing in GCS → status transitions to "failed" (expired)
 *   2. A corresponding audit event is recorded for every transition.
 *   3. Fresh pending assets (< STALE_THRESHOLD_HOURS old) are left untouched.
 *   4. Already-ready or already-failed assets are ignored regardless of age.
 *
 * The function is called directly (not via HTTP) so no Clerk session is needed.
 * The GCS sidecar is mocked via the global fetch stub.
 *
 * Run: cd lib/db && pnpm rebuild-test && cd ../../artifacts/api-server && pnpm test
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { and, eq } from "drizzle-orm";

// ── Clerk mock (needed because platform.ts imports @clerk/express) ─────────────
vi.mock("@clerk/express", () => ({
  getAuth: () => ({ userId: null }),
  clerkClient: {
    authenticateRequest: vi.fn(),
    users: {
      getUser: vi.fn(),
      getUserList: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

// ── Global fetch mock (intercepted by checkObjectExists) ──────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Function under test ───────────────────────────────────────────────────────
import {
  cleanupStaleMediaUploads,
  STALE_THRESHOLD_HOURS,
} from "../lib/cleanup.js";

// ── DB ────────────────────────────────────────────────────────────────────────
import {
  db,
  usersTable,
  publicationsTable,
  userPublicationAccessTable,
  mediaAssetsTable,
  auditEventsTable,
  rolesTable,
} from "@workspace/db";

// ── Fixture ───────────────────────────────────────────────────────────────────
const CLEANUP_CLERK_SUBJECT = "user_test_cleanup_integration";

let cleanupUserId    = "";
let lasPublicationId = "";

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const [las] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "life-around-senoia"));
  if (!las) throw new Error("life-around-senoia missing — run `pnpm rebuild-test`");
  lasPublicationId = las.id;

  const [adminRole] = await db
    .select({ key: rolesTable.key, permissions: rolesTable.permissions })
    .from(rolesTable)
    .where(eq(rolesTable.key, "publication-admin"));
  if (!adminRole) throw new Error("publication-admin role missing");

  const [user] = await db
    .insert(usersTable)
    .values({
      authProviderSubject: CLEANUP_CLERK_SUBJECT,
      email: "cleanup-test@example.com",
      displayName: "Cleanup Test User",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.authProviderSubject,
      set: { email: "cleanup-test@example.com" },
    })
    .returning();
  cleanupUserId = user!.id;

  await db
    .insert(userPublicationAccessTable)
    .values({
      userId: cleanupUserId,
      publicationId: lasPublicationId,
      role: adminRole.key,
      permissions: adminRole.permissions,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(usersTable)
    .where(eq(usersTable.authProviderSubject, CLEANUP_CLERK_SUBJECT));
});

// Remove all media_assets created by cleanupUserId between tests so each test
// starts from a clean slate and there are no stale leftovers from prior tests.
afterEach(async () => {
  mockFetch.mockReset();
  await db
    .delete(mediaAssetsTable)
    .where(eq(mediaAssetsTable.uploadedBy, cleanupUserId));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Insert a pending media_asset and backdate its created_at to make it stale. */
async function insertStalePendingAsset(suffix: string): Promise<string> {
  const [asset] = await db
    .insert(mediaAssetsTable)
    .values({
      publicationId: lasPublicationId,
      uploadedBy: cleanupUserId,
      objectPath: `/objects/uploads/cleanup-test-${suffix}`,
      originalName: `cleanup-test-${suffix}.jpg`,
      mimeType: "image/jpeg",
      byteSize: 1024,
      status: "pending",
    })
    .returning();

  // Backdate to 2× the threshold so it falls clearly within the stale window.
  const staleTimestamp = new Date(
    Date.now() - (STALE_THRESHOLD_HOURS * 2 + 1) * 60 * 60 * 1000,
  );
  await db
    .update(mediaAssetsTable)
    .set({ createdAt: staleTimestamp })
    .where(eq(mediaAssetsTable.id, asset!.id));

  return asset!.id;
}

/** Stub two sequential fetch calls: sidecar → signed URL, then HEAD. */
function stubGcsExists(exists: boolean) {
  // Call 1: sidecar returns a signed GET URL
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      signed_url: `https://storage.example.com/bucket/cleanup-test?sig=x`,
    }),
  } as Response);
  // Call 2: HEAD against that URL — 200 if object exists, 404 if not
  mockFetch.mockResolvedValueOnce({
    ok: exists,
    status: exists ? 200 : 404,
  } as Response);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe(`cleanupStaleMediaUploads() — stale pending assets (> ${STALE_THRESHOLD_HOURS}h old)`, () => {
  it("marks a stale pending asset as 'failed' when the file is absent from GCS", async () => {
    const assetId = await insertStalePendingAsset("absent");
    stubGcsExists(false); // HEAD → 404

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, assetId));

    expect(asset!.status).toBe("failed");
  });

  it("marks a stale pending asset as 'ready' when the file is present in GCS", async () => {
    const assetId = await insertStalePendingAsset("present");
    stubGcsExists(true); // HEAD → 200

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.recovered).toBeGreaterThanOrEqual(1);

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, assetId));

    expect(asset!.status).toBe("ready");
  });

  it("records a media.upload.expired audit event when the file is absent", async () => {
    const assetId = await insertStalePendingAsset("audit-expired");
    stubGcsExists(false);

    await cleanupStaleMediaUploads();

    const auditRows = await db
      .select()
      .from(auditEventsTable)
      .where(
        and(
          eq(auditEventsTable.entityId, assetId),
          eq(auditEventsTable.action, "media.upload.expired"),
        ),
      );

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.entityType).toBe("media_asset");
    expect(auditRows[0]!.publicationId).toBe(lasPublicationId);
  });

  it("records a media.upload.recovered audit event when the file is present", async () => {
    const assetId = await insertStalePendingAsset("audit-recovered");
    stubGcsExists(true);

    await cleanupStaleMediaUploads();

    const auditRows = await db
      .select()
      .from(auditEventsTable)
      .where(
        and(
          eq(auditEventsTable.entityId, assetId),
          eq(auditEventsTable.action, "media.upload.recovered"),
        ),
      );

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.entityType).toBe("media_asset");
  });

  it("returns accurate summary counts when processing multiple stale assets", async () => {
    const missingId = await insertStalePendingAsset("multi-missing");
    const presentId = await insertStalePendingAsset("multi-present");

    // Two assets → two pairs of fetch calls (order matches asset insertion order)
    stubGcsExists(false); // missingId → failed
    stubGcsExists(true);  // presentId → ready

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.recovered).toBeGreaterThanOrEqual(1);
    expect(result.failed + result.recovered).toBe(result.total);

    const [missing] = await db.select({ status: mediaAssetsTable.status }).from(mediaAssetsTable).where(eq(mediaAssetsTable.id, missingId));
    const [present] = await db.select({ status: mediaAssetsTable.status }).from(mediaAssetsTable).where(eq(mediaAssetsTable.id, presentId));
    expect(missing!.status).toBe("failed");
    expect(present!.status).toBe("ready");
  });

  it("handles a sidecar error gracefully and marks the asset as 'failed'", async () => {
    const assetId = await insertStalePendingAsset("sidecar-error");

    // Sidecar returns an error — checkObjectExists returns false
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    await cleanupStaleMediaUploads();

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, assetId));

    expect(asset!.status).toBe("failed");
  });
});

describe("cleanupStaleMediaUploads() — fresh pending assets (< threshold old)", () => {
  it("does not touch a recently-uploaded pending asset", async () => {
    // Insert a fresh (non-backdated) pending asset
    const [freshAsset] = await db
      .insert(mediaAssetsTable)
      .values({
        publicationId: lasPublicationId,
        uploadedBy: cleanupUserId,
        objectPath: "/objects/uploads/cleanup-test-fresh",
        originalName: "fresh.jpg",
        mimeType: "image/jpeg",
        byteSize: 512,
        status: "pending",
        // created_at defaults to NOW() — within the threshold
      })
      .returning();

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBe(0); // no stale assets
    expect(mockFetch).not.toHaveBeenCalled();

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, freshAsset!.id));

    expect(asset!.status).toBe("pending"); // untouched
  });
});

describe("cleanupStaleMediaUploads() — non-pending assets are ignored", () => {
  it("does not re-process an already-'ready' asset even if it is very old", async () => {
    const [readyAsset] = await db
      .insert(mediaAssetsTable)
      .values({
        publicationId: lasPublicationId,
        uploadedBy: cleanupUserId,
        objectPath: "/objects/uploads/cleanup-test-old-ready",
        originalName: "old-ready.jpg",
        mimeType: "image/jpeg",
        byteSize: 1024,
        status: "ready", // already complete
      })
      .returning();

    // Backdate to simulate an old asset
    await db
      .update(mediaAssetsTable)
      .set({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) })
      .where(eq(mediaAssetsTable.id, readyAsset!.id));

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, readyAsset!.id));

    expect(asset!.status).toBe("ready"); // unchanged
  });

  it("does not re-process an already-'failed' asset even if it is very old", async () => {
    const [failedAsset] = await db
      .insert(mediaAssetsTable)
      .values({
        publicationId: lasPublicationId,
        uploadedBy: cleanupUserId,
        objectPath: "/objects/uploads/cleanup-test-old-failed",
        originalName: "old-failed.jpg",
        mimeType: "image/jpeg",
        byteSize: 1024,
        status: "failed", // already processed
      })
      .returning();

    await db
      .update(mediaAssetsTable)
      .set({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) })
      .where(eq(mediaAssetsTable.id, failedAsset!.id));

    const result = await cleanupStaleMediaUploads();

    expect(result.total).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();

    const [asset] = await db
      .select({ status: mediaAssetsTable.status })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.id, failedAsset!.id));

    expect(asset!.status).toBe("failed"); // unchanged
  });
});
