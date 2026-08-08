/**
 * Background job scheduler.
 *
 * Registers long-running periodic tasks that must run inside the API server
 * process.  Call startScheduler() once from index.ts after the server is
 * listening.
 *
 * Current jobs:
 *   • Media cleanup — runs CLEANUP_INTERVAL_MS after startup, then every
 *     CLEANUP_INTERVAL_MS.  Finds pending uploads older than 1 hour and
 *     transitions them to "ready" or "failed" via a GCS HEAD check.
 */

import { cleanupStaleMediaUploads } from "./cleanup";
import { logger } from "./logger";

/** How long after server startup before the first cleanup run. */
const STARTUP_DELAY_MS = 30_000; // 30 seconds

/** How often to re-run the cleanup after the first pass. */
const CLEANUP_INTERVAL_MS = 15 * 60_000; // 15 minutes

async function runMediaCleanup(): Promise<void> {
  try {
    const result = await cleanupStaleMediaUploads();
    if (result.total > 0) {
      logger.info(result, "Scheduled media cleanup completed");
    }
  } catch (err) {
    logger.error({ err }, "Scheduled media cleanup failed");
  }
}

/**
 * Register all background jobs.  Must be called once after the HTTP server
 * is listening so that the process is stable before the first DB access.
 */
export function startScheduler(): void {
  logger.info(
    {
      startupDelaySeconds: STARTUP_DELAY_MS / 1000,
      intervalMinutes: CLEANUP_INTERVAL_MS / 60_000,
    },
    "Background scheduler registered (media cleanup)",
  );

  setTimeout(() => {
    void runMediaCleanup();
    setInterval(() => void runMediaCleanup(), CLEANUP_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}
