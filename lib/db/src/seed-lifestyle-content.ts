/**
 * One-shot migration: insert the 5 hardcoded Lifestyle / Crook's Corner items
 * from public-pages.tsx as real CMS drafts.
 * Safe to re-run — uses onConflictDoNothing on the publication+slug unique index.
 */
import { db } from "./index";
import { contentItemsTable } from "./schema";

const PUBLICATION_ID = "5b418195-3aa3-4771-a89b-9fd4329b6c1d";
const KEVIN_ID = "895297ae-b66d-4381-8a49-c7c0f201defe";

const items = [
  // ── Lifestyle Column: Secret Sauce ─────────────────────────────────────────
  {
    publicationId: PUBLICATION_ID,
    contentType: "lifestyle-column",
    status: "draft",
    slug: "freedom-worth-celebrating",
    title: "Freedom Worth Celebrating",
    summary:
      "A reflection on spiritual freedom — the quiet, easy-to-overlook liberty that shapes who we become, not just how we live.",
    body: "Every July, we're reminded how blessed we are to call America home. Among the many freedoms we enjoy, one is especially easy to overlook: the freedom to worship. Across our community each week, church doors open without fear, Bibles are read openly, and families gather to pray.\n\nWhile political freedom shapes the way we live, spiritual freedom has the power to shape who we become — and perhaps that's the greatest freedom worth celebrating this season.",
    details: { issue: "06", subsection: "secret-sauce" },
    coverMediaId: null,
    createdBy: KEVIN_ID,
    updatedBy: KEVIN_ID,
  },
  {
    publicationId: PUBLICATION_ID,
    contentType: "lifestyle-column",
    status: "draft",
    slug: "senaoia-true-secret-sauce",
    title: "Community: Senoia's True Secret Sauce",
    summary:
      "Ask anyone what they love about Senoia and you'll almost always hear the same answer: the community.",
    body: "Ask anyone what they love about Senoia and you'll almost always hear the same answer: the community. Yes, there's the small-town charm, the Hollywood history, the local shops. But Senoia's heart runs deeper than surface-level treasures.\n\nWhat makes Senoia so special is the sense of belonging it cultivates. Neighbors care, strangers are welcomed, and differences are respected. It doesn't require uniformity, only unity.",
    details: { issue: "01", subsection: "secret-sauce" },
    coverMediaId: null,
    createdBy: KEVIN_ID,
    updatedBy: KEVIN_ID,
  },
  // ── Lifestyle Column: Around Town ──────────────────────────────────────────
  {
    publicationId: PUBLICATION_ID,
    contentType: "lifestyle-column",
    status: "draft",
    slug: "a-little-mouse-a-big-idea",
    title: "A Little Mouse, A Big Idea",
    summary:
      "Local artist Catrina Didier turned a simple question about downtown's red brick into the Downtown Senoia Mouse Hunt — a scavenger hunt with a purpose.",
    body: "Local artist Catrina Didier noticed the iconic red brick downtown and wondered: what if there was a mouse painted somewhere in town? The idea grew legs — or tiny painted paws — into the Downtown Senoia Mouse Hunt.\n\nPick up an activity booklet at the Welcome Center, track down each hand-painted mouse hidden in shop windows, and return your completed map for a prize. Proceeds support Catrina's mission work at home and abroad.",
    details: { issue: "03", subsection: "around-town", tag: "Downtown Scavenger Hunt" },
    coverMediaId: null,
    createdBy: KEVIN_ID,
    updatedBy: KEVIN_ID,
  },
  // ── Recipe ─────────────────────────────────────────────────────────────────
  {
    publicationId: PUBLICATION_ID,
    contentType: "recipe",
    status: "draft",
    slug: "senoia-sunrise",
    title: "Senoia Sunrise",
    summary:
      "Some cocktails are made for celebrations. Others are made for slow summer afternoons. The Senoia Sunrise is both.",
    body: "Some cocktails are made for celebrations. Others are made for slow summer afternoons. The Senoia Sunrise is both.",
    details: {
      issue: "06",
      servings: "Makes 1 cocktail",
      ingredients: JSON.stringify([
        "2 oz Doc Brown's Day Swigger Southern Ember Whiskey",
        "3 oz fresh orange juice",
        "Splash of fresh lime juice",
        "Sparkling water, to top",
        "Fresh peach slice, for garnish",
      ]),
      steps: JSON.stringify([
        "Fill a cocktail shaker with ice.",
        "Add the whiskey, orange juice, and lime juice. Shake well until chilled.",
        "Fill a rocks glass with fresh ice and strain the cocktail into the glass.",
        "Top with sparkling water.",
        "Garnish with a fresh peach slice.",
      ]),
    },
    coverMediaId: null,
    createdBy: KEVIN_ID,
    updatedBy: KEVIN_ID,
  },
  // ── Crook's Corner ─────────────────────────────────────────────────────────
  {
    publicationId: PUBLICATION_ID,
    contentType: "crooks-corner",
    status: "draft",
    slug: "senoia-area-historical-society",
    title: "The Senoia Area Historical Society",
    summary:
      "What began with $55.89 left over from a 1976 Bicentennial celebration became the seed money for something lasting.",
    body: "What began with $55.89 left over from a 1976 Bicentennial celebration became the seed money for something lasting — a Society dedicated to making sure Senoia's stories are never lost to time. Open weekends at senoiahistory.com.",
    details: {
      issue: "06",
      timeline: JSON.stringify([
        { year: "1976", event: "A Bicentennial celebration leaves $55.89 — the Society's seed money." },
        { year: "1980", event: "The Senoia Area Historical Society officially incorporates." },
        { year: "1989", event: "Senoia's Historic District is added to the National Register of Historic Places." },
        { year: "1990", event: "The Society purchases the historic 1870s Carmichael home at 6 Couch Street." },
        { year: "2010", event: "The Senoia Area History Museum opens its doors on July 18." },
      ]),
    },
    coverMediaId: null,
    createdBy: KEVIN_ID,
    updatedBy: KEVIN_ID,
  },
] as const;

async function main() {
  console.log(`Seeding ${items.length} lifestyle/crooks-corner content items as drafts…`);
  const results = await db
    .insert(contentItemsTable)
    .values(items.map((item) => ({ ...item, details: item.details as Record<string, string> })))
    .onConflictDoNothing()
    .returning({ id: contentItemsTable.id, slug: contentItemsTable.slug, contentType: contentItemsTable.contentType });

  console.log(JSON.stringify({ inserted: results.length, items: results }, null, 2));
  await db.$client.end();
}

main().catch(async (err) => {
  console.error(err);
  await db.$client.end();
  process.exit(1);
});
