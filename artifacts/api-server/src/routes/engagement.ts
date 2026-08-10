import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsletterSubscribersTable, nominationsTable } from "@workspace/db";
import { getPublicationBySlug, getUserPublicationAccess, hasEditorialReadAccess, hasEditorialWriteAccess } from "../lib/platform";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";

const router: IRouter = Router();

// POST /publications/:slug/subscribe — public, no auth required
router.post("/publications/:slug/subscribe", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { email, firstName, lastName, phone, city } = req.body as Record<string, unknown>;

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
      firstName: typeof firstName === "string" && firstName.trim() ? firstName.trim() : null,
      lastName: typeof lastName === "string" && lastName.trim() ? lastName.trim() : null,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      city: typeof city === "string" && city.trim() ? city.trim() : null,
      status: "active",
    })
    .onConflictDoNothing();

  res.json({ subscribed: true });
});

// POST /publications/:slug/nominations — public, no auth required
router.post("/publications/:slug/nominations", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { firstName, lastName, nominatorEmail, phone, city, category, story } = req.body as Record<string, unknown>;

  if (
    !firstName || typeof firstName !== "string" || firstName.trim().length === 0 ||
    !lastName || typeof lastName !== "string" || lastName.trim().length === 0 ||
    !nominatorEmail || typeof nominatorEmail !== "string" || !nominatorEmail.includes("@") ||
    !category || typeof category !== "string" || category.trim().length === 0 ||
    !story || typeof story !== "string" || story.trim().length === 0
  ) {
    res.status(400).json({ error: "firstName, lastName, nominatorEmail, category, and story are all required" });
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
      nominatorName: `${firstName.trim()} ${lastName.trim()}`,
      nominatorEmail: nominatorEmail.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      city: typeof city === "string" && city.trim() ? city.trim() : null,
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

// GET /subscribers — staff-gated, requires read access
router.get("/subscribers", requireStaff, async (req, res): Promise<void> => {
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
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.publicationId, publicationId))
    .orderBy(desc(newsletterSubscribersTable.subscribedAt));

  res.json({
    subscribers: rows.map((s) => ({
      ...s,
      subscribedAt: s.subscribedAt.toISOString(),
    })),
  });
});

// PATCH /nominations/:id — staff-gated, requires write access
router.patch("/nominations/:id", requireStaff, async (req, res): Promise<void> => {
  const rawId = req.params["id"];
  const id = typeof rawId === "string" ? rawId : null;
  if (!id) {
    res.status(400).json({ error: "Invalid nomination id" });
    return;
  }
  const { status } = req.body as Record<string, unknown>;

  const validStatuses = ["new", "reviewed", "accepted", "declined"];
  if (!status || typeof status !== "string" || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const user = (req as AuthenticatedRequest).localUser;
  if (!user) {
    res.status(403).json({ error: "No access" });
    return;
  }

  const [nomination] = await db
    .select()
    .from(nominationsTable)
    .where(eq(nominationsTable.id, id))
    .limit(1);

  if (!nomination) {
    res.status(404).json({ error: "Nomination not found" });
    return;
  }

  const access = await getUserPublicationAccess(user.id, nomination.publicationId);
  if (!access || !hasEditorialWriteAccess(access.permissions)) {
    res.status(403).json({ error: "No staff write access to this publication" });
    return;
  }

  const [updated] = await db
    .update(nominationsTable)
    .set({ status })
    .where(eq(nominationsTable.id, id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;

