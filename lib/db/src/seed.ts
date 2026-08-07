import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  publicationSettingsTable,
  publicationsTable,
  rolesTable,
} from "./schema";

const lasThemeTokens = {
  colors: {
    ink: "#1d2521",
    pine: "#25483e",
    brick: "#b8583f",
    honey: "#d7a23a",
    paper: "#f4f0e7",
    line: "#cfc8ba",
  },
  fonts: {
    display: "Fraunces",
    serif: "Newsreader",
    sans: "Space Grotesk",
    mono: "IBM Plex Mono",
  },
};

const enabledContentTypes = [
  "featured-family",
  "nonprofit-spotlight",
  "young-achiever",
  "pet-of-the-month",
  "business-listing",
  "event",
];

async function ensurePublication(input: {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  defaultSeoTitle: string;
  defaultMetaDescription: string;
}) {
  const [publication] = await db
    .insert(publicationsTable)
    .values(input)
    .onConflictDoUpdate({
      target: publicationsTable.slug,
      set: {
        name: input.name,
        shortName: input.shortName,
        description: input.description,
        updatedAt: new Date(),
      },
    })
    .returning();

  await db
    .insert(publicationSettingsTable)
    .values({
      publicationId: publication.id,
      themeTokens: lasThemeTokens,
      navigationItems: [
        { label: "Home", href: "/" },
        { label: "Stories", href: "/stories" },
        { label: "Events", href: "/events" },
        { label: "About", href: "/about" },
      ],
      enabledContentTypes,
      defaultSeoTitle: input.defaultSeoTitle,
      defaultMetaDescription: input.defaultMetaDescription,
      socialLinks: {},
      contactEmail: null,
    })
    .onConflictDoUpdate({
      target: publicationSettingsTable.publicationId,
      set: {
        themeTokens: lasThemeTokens,
        navigationItems: [
          { label: "Home", href: "/" },
          { label: "Stories", href: "/stories" },
          { label: "Events", href: "/events" },
          { label: "About", href: "/about" },
        ],
        enabledContentTypes,
        defaultSeoTitle: input.defaultSeoTitle,
        defaultMetaDescription: input.defaultMetaDescription,
        updatedAt: new Date(),
      },
    });

  return publication;
}

async function main() {
  const las = await ensurePublication({
    slug: "life-around-senoia",
    name: "Life Around Senoia",
    shortName: "LAS",
    description:
      "A thoughtful local publication celebrating the people, places, and everyday life of Senoia.",
    defaultSeoTitle: "Life Around Senoia",
    defaultMetaDescription:
      "Stories, people, events, and local life from Senoia, Georgia.",
  });

  const secondPublication = await ensurePublication({
    slug: "foundation-fixture",
    name: "Foundation Fixture",
    shortName: "FF",
    description: "A tenant-isolation fixture for foundation verification.",
    defaultSeoTitle: "Foundation Fixture",
    defaultMetaDescription: "Tenant isolation verification fixture.",
  });

  await db
    .insert(rolesTable)
    .values([
      {
        key: "publication-admin",
        name: "Publication Admin",
        permissions: ["publication:read", "publication:write", "media:write"],
      },
      {
        key: "editor",
        name: "Editor",
        permissions: ["publication:read", "content:write", "media:write"],
      },
    ])
    .onConflictDoNothing({ target: rolesTable.key });

  console.log(
    JSON.stringify({
      seeded: [
        { slug: las.slug, id: las.id },
        { slug: secondPublication.slug, id: secondPublication.id },
      ],
    }),
  );
  await db.$client.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.$client.end();
  process.exit(1);
});