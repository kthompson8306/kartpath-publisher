/**
 * Integration tests — public submission endpoints.
 *
 * Covers:
 *   POST /api/publications/:slug/submissions/business
 *   POST /api/publications/:slug/submissions/event
 *
 * Each valid submission creates a draft content item and returns { id, received }.
 * No auth is required; email notifications are stubbed out.
 *
 * Run: cd lib/db && pnpm rebuild-test && cd ../../artifacts/api-server && pnpm test
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { eq } from "drizzle-orm";

// ── Mocks — must be declared before any imports that use them ─────────────────

const { mockAuthenticateRequest } = vi.hoisted(() => ({
  mockAuthenticateRequest: vi.fn().mockResolvedValue({
    toAuth: () => ({ userId: null }),
  }),
}));

vi.mock("@clerk/express", () => ({
  getAuth: (req: { auth?: () => unknown }) =>
    typeof req.auth === "function" ? req.auth() : { userId: null },
  clerkClient: {
    authenticateRequest: mockAuthenticateRequest,
    users: { getUser: vi.fn(), getUserList: vi.fn().mockResolvedValue({ data: [] }) },
  },
}));

// Stub email helper so no real network calls happen during tests.
vi.mock("../lib/email.js", () => ({
  sendStaffNotification: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── App + DB (after mocks) ────────────────────────────────────────────────────

import app from "../app.js";
import { db, contentItemsTable, publicationsTable } from "@workspace/db";

// ── Fixture ───────────────────────────────────────────────────────────────────

let lasPublicationId = "";
const createdItemIds: string[] = [];

beforeAll(async () => {
  const [las] = await db
    .select({ id: publicationsTable.id })
    .from(publicationsTable)
    .where(eq(publicationsTable.slug, "life-around-senoia"));
  if (!las) throw new Error("life-around-senoia missing — run `pnpm rebuild-test`");
  lasPublicationId = las.id;
});

afterAll(async () => {
  // Remove content items created during tests.
  for (const id of createdItemIds) {
    await db.delete(contentItemsTable).where(eq(contentItemsTable.id, id));
  }
});

// ── Business submission ───────────────────────────────────────────────────────

describe("POST /api/publications/:slug/submissions/business", () => {
  // Unique IP per describe block — keeps each group's requests under the rate limit.
  const IP = "192.168.100.1";
  const validBusiness = {
    businessName: "Senoia Test Bakery",
    category: "Dining & Drinks",
    phone: "770-555-0001",
    website: "https://example.com",
    description: "A lovely test bakery in the heart of Senoia.",
    submitterName: "Test Submitter",
    submitterEmail: "submitter@example.com",
  };

  it("creates a draft business-listing and returns 201", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/business")
      .set("X-Forwarded-For", IP)
      .send(validBusiness);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ received: true });
    expect(typeof res.body.id).toBe("string");

    createdItemIds.push(res.body.id as string);

    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, res.body.id));

    expect(item).toBeDefined();
    expect(item!.contentType).toBe("business-listing");
    expect(item!.status).toBe("draft");
    expect(item!.title).toBe("Senoia Test Bakery");
    expect(item!.publicationId).toBe(lasPublicationId);
    expect(item!.details.category).toBe("Dining & Drinks");
    expect(item!.details.phone).toBe("770-555-0001");
    expect(item!.details.submitterEmail).toBe("submitter@example.com");
    // createdBy is null for public submissions — no authenticated user
    expect(item!.createdBy).toBeNull();
  });

  it("works without optional fields (phone, website, description)", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/business")
      .set("X-Forwarded-For", IP)
      .send({
        businessName: "Minimal Test Business",
        category: "Professional Services",
        submitterName: "Jane",
        submitterEmail: "jane@example.com",
      });

    expect(res.status).toBe(201);
    createdItemIds.push(res.body.id as string);

    const [item] = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, res.body.id));
    expect(item!.details.phone).toBeUndefined();
    expect(item!.details.website).toBeUndefined();
  });

  it("returns 400 when businessName is empty", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/business")
      .set("X-Forwarded-For", IP)
      .send({ ...validBusiness, businessName: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is missing", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/business")
      .set("X-Forwarded-For", IP)
      .send({ ...validBusiness, category: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 when submitterEmail is invalid", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/business")
      .set("X-Forwarded-For", IP)
      .send({ ...validBusiness, submitterEmail: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown publication slug", async () => {
    const res = await supertest(app)
      .post("/api/publications/does-not-exist/submissions/business")
      .set("X-Forwarded-For", IP)
      .send(validBusiness);
    expect(res.status).toBe(404);
  });
});

// ── Event submission ──────────────────────────────────────────────────────────

describe("POST /api/publications/:slug/submissions/event", () => {
  const IP = "192.168.100.2";
  const validEvent = {
    eventName: "Senoia Test Festival",
    eventDate: "2026-10-15",
    eventTime: "6:00 PM",
    location: "Senoia City Square",
    description: "An annual test festival in the center of Senoia.",
    ticketUrl: "https://eventbrite.com/test",
    contactName: "Jane Doe",
    contactEmail: "jane@example.com",
    contactPhone: "770-555-0002",
  };

  it("creates a draft event and returns 201", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/event")
      .set("X-Forwarded-For", IP)
      .send(validEvent);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ received: true });
    expect(typeof res.body.id).toBe("string");

    createdItemIds.push(res.body.id as string);

    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, res.body.id));

    expect(item).toBeDefined();
    expect(item!.contentType).toBe("event");
    expect(item!.status).toBe("draft");
    expect(item!.title).toBe("Senoia Test Festival");
    expect(item!.publicationId).toBe(lasPublicationId);
    expect(item!.details.eventDate).toBe("2026-10-15");
    expect(item!.details.location).toBe("Senoia City Square");
    expect(item!.details.contactEmail).toBe("jane@example.com");
    expect(item!.details.eventTime).toBe("6:00 PM");
    expect(item!.details.website).toBe("https://eventbrite.com/test");
    expect(item!.details.contactPhone).toBe("770-555-0002");
    expect(item!.createdBy).toBeNull();
  });

  it("works without optional fields (eventTime, ticketUrl, contactPhone)", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/event")
      .set("X-Forwarded-For", IP)
      .send({
        eventName: "Minimal Test Event",
        eventDate: "2026-11-01",
        location: "Senoia Library",
        contactName: "Bob",
        contactEmail: "bob@example.com",
      });

    expect(res.status).toBe(201);
    createdItemIds.push(res.body.id as string);

    const [item] = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, res.body.id));
    expect(item!.details.eventTime).toBeUndefined();
    expect(item!.details.website).toBeUndefined();
  });

  it("returns 400 when eventDate is empty", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/event")
      .set("X-Forwarded-For", IP)
      .send({ ...validEvent, eventDate: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when location is missing", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/event")
      .set("X-Forwarded-For", IP)
      .send({ ...validEvent, location: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when contactEmail is invalid", async () => {
    const res = await supertest(app)
      .post("/api/publications/life-around-senoia/submissions/event")
      .set("X-Forwarded-For", IP)
      .send({ ...validEvent, contactEmail: "bad-email" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown publication slug", async () => {
    const res = await supertest(app)
      .post("/api/publications/does-not-exist/submissions/event")
      .set("X-Forwarded-For", IP)
      .send(validEvent);
    expect(res.status).toBe(404);
  });
});
