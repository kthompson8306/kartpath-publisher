import { inArray } from "drizzle-orm";
import { db } from "./index";
import { contentItemsTable } from "./schema";

const slugs = [
  "freedom-worth-celebrating",
  "senaoia-true-secret-sauce",
  "a-little-mouse-a-big-idea",
  "senoia-sunrise",
  "senoia-area-historical-society",
];

async function main() {
  const result = await db
    .update(contentItemsTable)
    .set({ status: "published", publishedAt: new Date() })
    .where(inArray(contentItemsTable.slug, slugs))
    .returning({
      id: contentItemsTable.id,
      slug: contentItemsTable.slug,
      contentType: contentItemsTable.contentType,
      status: contentItemsTable.status,
    });
  console.log(JSON.stringify({ published: result.length, items: result }, null, 2));
  await db.$client.end();
}

main().catch(async (err) => {
  console.error(err);
  await db.$client.end();
  process.exit(1);
});
