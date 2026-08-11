import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsletterSubscribersTable, nominationsTable, contentItemsTable } from "@workspace/db";
import { getPublicationBySlug, getUserPublicationAccess, hasEditorialReadAccess, hasEditorialWriteAccess } from "../lib/platform";
import { type AuthenticatedRequest, requireStaff } from "../lib/auth";
import { sendStaffNotification } from "../lib/email.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Simple in-memory rate limiter — 10 submissions per IP per hour.
// Resets automatically; no external dependency needed.
const submissionWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 10;

function submissionRateLimit(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown";
  const now = Date.now();
  const entry = submissionWindows.get(ip);
  if (!entry || entry.resetAt < now) {
    submissionWindows.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }
  if (entry.count >= MAX_SUBMISSIONS) {
    res.status(429).json({ error: "Too many submissions. Please try again later." });
    return;
  }
  entry.count += 1;
  next();
}

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

// ── Business listing submission (public, no auth required) ───────────────────

router.post("/publications/:slug/submissions/business", submissionRateLimit, async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { businessName, category, address, phone, website, facebookUrl, instagramUrl, description, submitterName, submitterEmail } =
    req.body as Record<string, unknown>;

  if (
    !businessName || typeof businessName !== "string" || businessName.trim().length === 0 ||
    !category || typeof category !== "string" || category.trim().length === 0 ||
    !submitterName || typeof submitterName !== "string" || submitterName.trim().length === 0 ||
    !submitterEmail || typeof submitterEmail !== "string" || !submitterEmail.includes("@") || submitterEmail.length < 3
  ) {
    res.status(400).json({ error: "businessName, category, submitterName, and submitterEmail are required" });
    return;
  }

  const pub = await getPublicationBySlug(slug);
  if (!pub?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const title = businessName.trim();
  const itemSlug = `${slugify(title) || "business"}-${Date.now().toString(36)}`;
  const desc = typeof description === "string" && description.trim() ? description.trim() : "";
  const summary = desc.slice(0, 300) || `${title} — submitted for directory listing`;
  const details: Record<string, string> = {
    category: category.trim(),
    submitterName: submitterName.trim(),
    submitterEmail: (submitterEmail as string).toLowerCase().trim(),
  };
  if (typeof address === "string" && address.trim()) details.address = address.trim();
  if (typeof phone === "string" && phone.trim()) details.phone = phone.trim();
  if (typeof website === "string" && website.trim()) details.website = website.trim();
  if (typeof facebookUrl === "string" && facebookUrl.trim()) details.facebook_url = facebookUrl.trim();
  if (typeof instagramUrl === "string" && instagramUrl.trim()) details.instagram_url = instagramUrl.trim();

  const [item] = await db
    .insert(contentItemsTable)
    .values({
      publicationId: pub.publication.id,
      contentType: "business-listing",
      status: "draft",
      slug: itemSlug,
      title,
      summary,
      body: desc,
      details,
    })
    .returning();

  // Fire-and-forget — never blocks the HTTP response.
  sendStaffNotification({
    subject: `New Business Submission: ${title}`,
    html: `<h2>New Business Listing Submitted</h2>
<p>A new business listing is waiting in the <strong>drafts queue</strong> for staff review before it goes live.</p>
<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td><strong>Business Name</strong></td><td>${title}</td></tr>
  <tr><td><strong>Category</strong></td><td>${category.trim()}</td></tr>
  ${details.address ? `<tr><td><strong>Address</strong></td><td>${details.address}</td></tr>` : ""}
  ${details.phone ? `<tr><td><strong>Phone</strong></td><td>${details.phone}</td></tr>` : ""}
  ${details.website ? `<tr><td><strong>Website</strong></td><td><a href="${details.website}">${details.website}</a></td></tr>` : ""}
  ${details.facebook_url ? `<tr><td><strong>Facebook</strong></td><td><a href="${details.facebook_url}">${details.facebook_url}</a></td></tr>` : ""}
  ${details.instagram_url ? `<tr><td><strong>Instagram</strong></td><td><a href="${details.instagram_url}">${details.instagram_url}</a></td></tr>` : ""}
  ${desc ? `<tr><td><strong>Description</strong></td><td>${desc}</td></tr>` : ""}
  <tr><td><strong>Submitted by</strong></td><td>${submitterName.trim()} &lt;${(submitterEmail as string).toLowerCase().trim()}&gt;</td></tr>
</table>
<p style="margin-top:16px"><a href="https://lifearoundsenoia.com/staff" style="background:#d7a23a;color:#fff;padding:10px 18px;text-decoration:none;font-weight:bold">Review in CMS</a></p>`,
  }).catch(() => { /* already logged inside helper */ });

  res.status(201).json({ id: item!.id, received: true });
});

// ── Event submission (public, no auth required) ───────────────────────────────

router.post("/publications/:slug/submissions/event", submissionRateLimit, async (req, res): Promise<void> => {
  const { slug } = req.params;
  const { eventName, eventDate, eventTime, location, description, ticketUrl, contactName, contactEmail, contactPhone } =
    req.body as Record<string, unknown>;

  if (
    !eventName || typeof eventName !== "string" || eventName.trim().length === 0 ||
    !eventDate || typeof eventDate !== "string" || eventDate.trim().length === 0 ||
    !location || typeof location !== "string" || location.trim().length === 0 ||
    !contactName || typeof contactName !== "string" || contactName.trim().length === 0 ||
    !contactEmail || typeof contactEmail !== "string" || !contactEmail.includes("@") || contactEmail.length < 3
  ) {
    res.status(400).json({ error: "eventName, eventDate, location, contactName, and contactEmail are required" });
    return;
  }

  const pub = await getPublicationBySlug(slug);
  if (!pub?.publication) {
    res.status(404).json({ error: "Publication not found" });
    return;
  }

  const title = eventName.trim();
  const itemSlug = `${slugify(title) || "event"}-${Date.now().toString(36)}`;
  const desc = typeof description === "string" && description.trim() ? description.trim() : "";
  const summary = desc.slice(0, 300) || `${title} on ${(eventDate as string).trim()} at ${(location as string).trim()}`;
  const details: Record<string, string> = {
    eventDate: (eventDate as string).trim(),
    location: (location as string).trim(),
    contactName: contactName.trim(),
    contactEmail: (contactEmail as string).toLowerCase().trim(),
  };
  if (typeof eventTime === "string" && eventTime.trim()) details.eventTime = eventTime.trim();
  if (typeof ticketUrl === "string" && ticketUrl.trim()) details.website = ticketUrl.trim();
  if (typeof contactPhone === "string" && contactPhone.trim()) details.contactPhone = contactPhone.trim();

  const [item] = await db
    .insert(contentItemsTable)
    .values({
      publicationId: pub.publication.id,
      contentType: "event",
      status: "draft",
      slug: itemSlug,
      title,
      summary,
      body: desc,
      details,
    })
    .returning();

  sendStaffNotification({
    subject: `New Event Submission: ${title}`,
    html: `<h2>New Event Submitted</h2>
<p>A new event is waiting in the <strong>drafts queue</strong> for staff review before it goes live.</p>
<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td><strong>Event Name</strong></td><td>${title}</td></tr>
  <tr><td><strong>Date</strong></td><td>${(eventDate as string).trim()}</td></tr>
  ${details.eventTime ? `<tr><td><strong>Time</strong></td><td>${details.eventTime}</td></tr>` : ""}
  <tr><td><strong>Location</strong></td><td>${(location as string).trim()}</td></tr>
  ${details.website ? `<tr><td><strong>Ticket / Link</strong></td><td><a href="${details.website}">${details.website}</a></td></tr>` : ""}
  ${desc ? `<tr><td><strong>Description</strong></td><td>${desc}</td></tr>` : ""}
  <tr><td><strong>Contact</strong></td><td>${contactName.trim()} &lt;${(contactEmail as string).toLowerCase().trim()}&gt;${details.contactPhone ? ` · ${details.contactPhone}` : ""}</td></tr>
</table>
<p style="margin-top:16px"><a href="https://lifearoundsenoia.com/staff" style="background:#d7a23a;color:#fff;padding:10px 18px;text-decoration:none;font-weight:bold">Review in CMS</a></p>`,
  }).catch(() => { /* already logged inside helper */ });

  res.status(201).json({ id: item!.id, received: true });
});

export default router;

