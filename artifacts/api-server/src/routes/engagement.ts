import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsletterSubscribersTable, nominationsTable } from "@workspace/db";
import { getPublicationBySlug, getUserPublicationAccess, hasEditorialReadAccess } from "../lib/platform";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";

const router: IRouter = Router();

// POST /publications/:slug/subscribe — public, no auth required
router.post("/publications/:slug/subscribe", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { email } = req.body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !email.includes("@") || email.length > 320) {
    res.status(400).json({ error: "Valid email address is required" });
    return;
  }

  const pub = await getPublicationBySlug(slug);
  if (!pub?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  await db
    .insert(newsletterSubscribersTable)
    .values({
      publicationId: pub.publication.id,
      email: email.toLowerCase().trim(),
      status: "active",
    })
    .onConflictDoNothing();

  res.json({ subscribed: true });
});

// POST /publications/:slug/nominations — public, no auth required
router.post("/publications/:slug/nominations", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { nominatorName, nominatorEmail, category, story } = req.body as Record<string, unknown>;

  if (
    !nominatorName || typeof nominatorName !== "string" || nominatorName.trim().length === 0 ||
    !nominatorEmail || typeof nominatorEmail !== "string" || !nominatorEmail.includes("@") ||
    !category || typeof category !== "string" || category.trim().length === 0 ||
    !story || typeof story !== "string" || story.trim().length === 0
  ) {
    res.status(400).json({ error: "nominatorName, nominatorEmail, category, and story are all required" });
    return;
  }

  const pub = await getPublicationBySlug(slug);
  if (!pub?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const [nomination] = await db
    .insert(nominationsTable)
    .values({
      publicationId: pub.publication.id,
      nominatorName: nominatorName.trim(),
      nominatorEmail: nominatorEmail.toLowerCase().trim(),
      category: category.trim(),
      story: story.trim(),
      status: "new",
    })
    .returning();

  res.json({ id: nomination.id, received: true });
});

// GET /nominations — staff-gated, requires read access to the publication
router.get("/nominations", requireStaff, async (req, res): Promise<void> => {
  const { publicationId } = req.query as Record<string, unknown>;

  if (!publicationId || typeof publicationId !== "string" || publicationId.trim().length === 0) {
    res.status(400).json({ error: "publicationId is required" });
    return;
  }

  const user = (req as AuthenticatedRequest).localUser;
  if (!user) {
    res.status(403).json({ error: "No access" });
    return;
  }

  const access = await getUserPublicationAccess(user.id, publicationId);
  if (!access || !hasEditorialReadAccess(access.permissions)) {
    res.status(403).json({ error: "No staff access to this publication" });
    return;
  }

  const rows = await db
    .select()
    .from(nominationsTable)
    .where(eq(nominationsTable.publicationId, publicationId))
    .orderBy(desc(nominationsTable.createdAt));

  res.json({
    nominations: rows.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

export default router;
