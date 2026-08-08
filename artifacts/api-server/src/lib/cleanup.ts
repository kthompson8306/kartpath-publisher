/**
 * Stale media upload cleanup.
 *
 * Any media_asset that has been sitting in "pending" status for longer than
 * STALE_THRESHOLD_HOURS was never completed — the browser most likely closed
 * between the GCS PUT and the /complete call.
 *
 * For each such asset we perform a server-side HEAD check (same logic as the
 * /complete endpoint) and transition the row to either:
 *   "ready"  — the file actually made it to the bucket (recovered upload)
 *   "failed" — the file is not in the bucket (abandoned upload)
 *
 * Called by the scheduler in scheduler.ts; also directly importable for tests.
 */

import { and, eq, lt } from "drizzle-orm";
import { db, mediaAssetsTable } from "@workspace/db";
import { checkObjectExists } from "./objectStorage";
import { recordAuditEvent } from "./platform";
import { logger } from "./logger";

/** Pending uploads older than this many hours are considered stale. */
export const STALE_THRESHOLD_HOURS = 1;

export interface CleanupResult {
  /** Assets found to exist in GCS and promoted to "ready". */
  recovered: number;
  /** Assets not found in GCS and marked "failed". */
  failed: number;
  /** Total stale pending assets examined. */
  total: number;
}

/**
 * Find all media_assets with status="pending" that are older than
 * STALE_THRESHOLD_HOURS, verify each one against GCS, and transition them to
 * "ready" or "failed".  Returns a summary of what was processed.
 */
export async function cleanupStaleMediaUploads(): Promise<CleanupResult> {
  const threshold = new Date(
    Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
  );

  const staleAssets = await db
    .select()
    .from(mediaAssetsTable)
    .where(
      and(
        eq(mediaAssetsTable.status, "pending"),
        lt(mediaAssetsTable.createdAt, threshold),
      ),
    );

  let recovered = 0;
  let failed = 0;

  for (const asset of staleAssets) {
    let exists = false;
    try {
      exists = await checkObjectExists(asset.objectPath);
    } catch {
      // checkObjectExists already swallows errors and returns false, but
      // guard here as an extra safety net so one bad asset can't abort the loop.
      exists = false;
    }

    const newStatus = exists ? "ready" : "failed";

    await db
      .update(mediaAssetsTable)
      .set({ status: newStatus })
      .where(eq(mediaAssetsTable.id, asset.id));

    await recordAuditEvent({
      publicationId: asset.publicationId,
      userId: asset.uploadedBy ?? null,
      action: exists ? "media.upload.recovered" : "media.upload.expired",
      entityType: "media_asset",
      entityId: asset.id,
      metadata: {
        staleTtlHours: STALE_THRESHOLD_HOURS,
        objectPath: asset.objectPath,
        previousStatus: "pending",
      },
    });

    logger.info(
      { assetId: asset.id, publicationId: asset.publicationId, newStatus },
      "Stale media asset processed by cleanup",
    );

    if (exists) recovered++;
    else failed++;
  }

  return { recovered, failed, total: staleAssets.length };
}
