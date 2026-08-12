/**
 * Life Around Senoia — Production SSR server
 *
 * Runs in production only (development uses the Vite dev server for HMR).
 *
 *  1. Intercepts the 6 content URL patterns and returns fully-populated HTML
 *     (title, meta, JSON-LD, article body) so crawlers see real content.
 *  2. Serves a dynamic /sitemap.xml listing every published article URL,
 *     fresh from the database on every request.
 *  3. Serves the Vite-built static files from dist/public for all other paths.
 *  4. Falls back to index.html for SPA client-side routing.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { db, contentItemsTable, mediaAssetsTable } from '@workspace/db';
import { and, eq, desc, ne } from 'drizzle-orm';

// __dirname is injected by the esbuild banner in build-server.mjs
declare const __dirname: string;

const DIST_PUBLIC   = path.join(__dirname, 'public');
const PORT          = Number(process.env.PORT) || 23775;
const PUBLICATION_ID = '5b418195-3aa3-4771-a89b-9fd4329b6c1d';
const SITE_NAME     = 'Life Around Senoia';

// ─── Section ↔ content-type maps ─────────────────────────────────────────────

/** URL section prefix → content types that live under it */
const SECTION_TYPES: Record<string, string[]> = {
  people:          ['featured-family', 'young-achiever', 'people-around-town'],
  lifestyle:       ['lifestyle-column', 'recipe', 'pet-of-the-month'],
  nonprofit:       ['nonprofit-spotlight'],
  'crooks-corner': ['crooks-corner'],
  events:          ['event'],
  directory:       ['business-listing'],
};
const SSR_SECTIONS = new Set(Object.keys(SECTION_TYPES));

/** Content type → URL section prefix (reverse map) */
const TYPE_TO_SECTION: Record<string, string> = {};
for (const [section, types] of Object.entries(SECTION_TYPES))
  for (const t of types) TYPE_TO_SECTION[t] = section;

const SECTION_LABELS: Record<string, string> = {
  people:          'People',
  lifestyle:       'Lifestyle',
  nonprofit:       'Nonprofit',
  'crooks-corner': "Crook's Corner",
  events:          'Events',
  directory:       'Business Directory',
};

// ─── Vite asset tag extraction ────────────────────────────────────────────────

/** <link> and <script src=…> tags from the Vite build's index.html */
let viteHeadAssets = '';

function loadViteAssets() {
  try {
    const html    = readFileSync(path.join(DIST_PUBLIC, 'index.html'), 'utf-8');
    const links   = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\b[^>]*>[\s\S]*?<\/script>/gi)].map(m => m[0]);
    viteHeadAssets = [...links, ...scripts].join('\n  ');
    console.log('[ssr] Loaded Vite asset tags from dist/public/index.html');
  } catch (err) {
    console.warn('[ssr] Could not load Vite index.html — SPA hydration may be limited:', (err as Error).message);
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

type ContentRow = {
  item:            typeof contentItemsTable.$inferSelect;
  mediaObjectPath: string | null;
  mediaAltText:    string | null;
};

async function getPublishedItem(slug: string): Promise<ContentRow | null> {
  const [row] = await db
    .select({
      item:            contentItemsTable,
      mediaObjectPath: mediaAssetsTable.objectPath,
      mediaAltText:    mediaAssetsTable.altText,
    })
    .from(contentItemsTable)
    .leftJoin(
      mediaAssetsTable,
      and(
        eq(contentItemsTable.coverMediaId, mediaAssetsTable.id),
        eq(mediaAssetsTable.status, 'ready'),
      ),
    )
    .where(
      and(
        eq(contentItemsTable.publicationId, PUBLICATION_ID),
        eq(contentItemsTable.slug, slug),
        eq(contentItemsTable.status, 'published'),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function getAllPublishedItems() {
  return db
    .select({
      slug:        contentItemsTable.slug,
      contentType: contentItemsTable.contentType,
      updatedAt:   contentItemsTable.updatedAt,
    })
    .from(contentItemsTable)
    .where(
      and(
        eq(contentItemsTable.publicationId, PUBLICATION_ID),
        eq(contentItemsTable.status, 'published'),
        ne(contentItemsTable.contentType, 'digital_edition'),
      ),
    )
    .orderBy(desc(contentItemsTable.updatedAt));
}

function coverUrlFor(objectPath: string | null): string | null {
  if (!objectPath) return null;
  return `/api/storage/objects${objectPath.replace(/^\/objects/, '')}`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Return the canonical site origin used in all HTML/XML output.
 *
 * We deliberately do NOT read X-Forwarded-Host / X-Forwarded-Proto from the
 * request: those headers are attacker-controlled on the public internet and
 * must never be interpolated into HTML attributes or URLs without strict
 * allow-listing. Instead we trust a single configured value set at deploy
 * time (SITE_ORIGIN env var), falling back to the known production domain.
 * The SSR server only runs in production where the canonical URL is fixed.
 */
function getSiteOrigin(): string {
  return (process.env.SITE_ORIGIN ?? 'https://lifearoundsenoia.com').replace(/\/$/, '');
}

function bodyToParagraphs(body: string): string {
  return body
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${esc(p)}</p>`)
    .join('\n        ');
}

// ─── Meta description fallback ───────────────────────────────────────────────

/**
 * Return the best available meta description for a content item.
 *
 * Priority:
 *   1. metaDescription field (staff-written, already ≤160 chars via UI)
 *   2. Auto-generated from summary — truncated cleanly to ≤160 chars, never
 *      mid-sentence and never mid-word.
 *
 * The algorithm guarantees the result is always ≤160 characters, ends on a
 * complete sentence wherever possible, and never ends mid-word otherwise.
 */
function generateMetaDescription(
  metaDescription: string | null | undefined,
  summary: string,
): string {
  // 1. Prefer the deliberate field when present
  const deliberate = metaDescription?.trim();
  if (deliberate) return deliberate;

  // 2. Summary fits as-is
  const text = summary.trim();
  if (text.length <= 160) return text;

  // 3. Find the last sentence boundary ≤ 155 chars
  const candidate = text.slice(0, 156);
  const lastSentence = Math.max(
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('! '),
    candidate.lastIndexOf('? '),
    candidate.lastIndexOf('.\n'),
  );
  if (lastSentence >= 50) {
    // include the punctuation character itself (index + 1)
    return text.slice(0, lastSentence + 1).trim();
  }

  // 4. No sentence boundary — find last word boundary ≤ 152 chars
  const lastSpace = text.slice(0, 153).lastIndexOf(' ');
  if (lastSpace >= 50) {
    return text.slice(0, lastSpace).trim() + '…';
  }

  // 5. Hard cap (extremely unlikely — requires a 153-char word)
  return text.slice(0, 157).trim() + '…';
}

// ─── JSON-LD safe serialisation ──────────────────────────────────────────────

/**
 * Serialise an object as JSON safe for inline <script> embedding.
 * JSON.stringify does not escape < > & U+2028 U+2029, so a content field
 * containing "</script><script>" would terminate the block and execute JS.
 * Replacing those characters with their Unicode escape equivalents is the
 * standard defence (used by Next.js, Closure Library, etc.).
 */
function safeJsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2)
    .replace(/</g,     '\\u003c')
    .replace(/>/g,     '\\u003e')
    .replace(/&/g,     '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

function buildJsonLd(
  item:         typeof contentItemsTable.$inferSelect,
  coverUrl:     string | null,
  canonicalUrl: string,
  siteOrigin:   string,
): string {
  const org = { '@type': 'Organization', name: SITE_NAME, url: siteOrigin };
  const ct  = item.contentType;
  let schema: Record<string, unknown>;

  if (ct === 'recipe') {
    const d = (item.details ?? {}) as Record<string, string>;
    let ingredients: string[] = [];
    let steps:       string[] = [];
    try { ingredients = JSON.parse(d.ingredients ?? '[]'); } catch { /* ignore */ }
    try { steps       = JSON.parse(d.steps       ?? '[]'); } catch { /* ignore */ }
    schema = {
      '@context': 'https://schema.org',
      '@type':    'Recipe',
      name:        item.title,
      description: generateMetaDescription(item.metaDescription, item.summary),
      datePublished: item.publishedAt?.toISOString() ?? item.createdAt.toISOString(),
      dateModified:  item.updatedAt.toISOString(),
      author:    org,
      publisher: org,
      url:       canonicalUrl,
      ...(coverUrl   ? { image:       `${siteOrigin}${coverUrl}` } : {}),
      ...(d.servings ? { recipeYield: d.servings } : {}),
      recipeIngredient:   ingredients,
      recipeInstructions: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    };
  } else if (ct === 'business-listing') {
    const d = (item.details ?? {}) as Record<string, string>;
    schema = {
      '@context': 'https://schema.org',
      '@type':    'LocalBusiness',
      name:        item.title,
      description: generateMetaDescription(item.metaDescription, item.summary),
      url:         canonicalUrl,
      ...(d.address ? { address: { '@type': 'PostalAddress', streetAddress: d.address } } : {}),
      ...(d.phone   ? { telephone: d.phone   } : {}),
      ...(d.website ? { sameAs:    d.website } : {}),
      ...(coverUrl  ? { image: `${siteOrigin}${coverUrl}` } : {}),
    };
  } else {
    // Article — featured-family, young-achiever, people-around-town,
    // lifestyle-column, pet-of-the-month, nonprofit-spotlight, crooks-corner, event
    schema = {
      '@context': 'https://schema.org',
      '@type':    'Article',
      headline:    item.title,
      description: generateMetaDescription(item.metaDescription, item.summary),
      datePublished: item.publishedAt?.toISOString() ?? item.createdAt.toISOString(),
      dateModified:  item.updatedAt.toISOString(),
      author:    org,
      publisher: { ...org, logo: { '@type': 'ImageObject', url: `${siteOrigin}/logo.svg` } },
      url:       canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      ...(coverUrl
        ? { image: { '@type': 'ImageObject', url: `${siteOrigin}${coverUrl}` } }
        : {}),
    };
  }

  return safeJsonLd(schema);
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(
  item:       typeof contentItemsTable.$inferSelect,
  coverUrl:   string | null,
  section:    string,
  siteOrigin: string,
): string {
  const canonicalUrl = `${siteOrigin}/${section}/${item.slug}`;
  const jsonLd       = buildJsonLd(item, coverUrl, canonicalUrl, siteOrigin);
  const pageTitle    = `${esc(item.title)} — ${SITE_NAME}`;
  const descMeta     = esc(generateMetaDescription(item.metaDescription, item.summary));
  const ogImage      = coverUrl ? `${siteOrigin}${coverUrl}` : '';
  const sectionLabel = SECTION_LABELS[section] ?? 'Stories';

  let bodyHtml = bodyToParagraphs(item.body);
  if (item.contentType === 'recipe') {
    const d = (item.details ?? {}) as Record<string, string>;
    let ingredients: string[] = [];
    let steps:       string[] = [];
    try { ingredients = JSON.parse(d.ingredients ?? '[]'); } catch { /* ignore */ }
    try { steps       = JSON.parse(d.steps       ?? '[]'); } catch { /* ignore */ }
    if (ingredients.length)
      bodyHtml += `\n        <h2>Ingredients</h2>\n        <ul>${ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    if (steps.length)
      bodyHtml += `\n        <h2>Instructions</h2>\n        <ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
  <title>${pageTitle}</title>
  <meta name="description" content="${descMeta}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${descMeta}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${descMeta}" />
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
  <script type="application/ld+json">
${jsonLd}
  </script>
  ${viteHeadAssets}
</head>
<body>
  <div id="root">
    <article itemscope itemtype="https://schema.org/Article"
             style="max-width:800px;margin:0 auto;padding:2rem 1rem;font-family:Georgia,serif;color:#222">
      <nav style="margin-bottom:1.5rem">
        <a href="/${section}"
           style="font-family:sans-serif;font-size:.85rem;color:#555;text-decoration:none">← ${esc(sectionLabel)}</a>
      </nav>
      <h1 itemprop="headline"
          style="font-size:2rem;line-height:1.15;margin:0 0 .75rem;font-weight:700">${esc(item.title)}</h1>
      <p  itemprop="description"
          style="font-size:1.1rem;color:#555;line-height:1.5;margin:0 0 1.5rem;font-family:sans-serif">${esc(item.summary)}</p>
      ${coverUrl
        ? `<img src="${siteOrigin}${coverUrl}" alt="${esc(item.title)}" itemprop="image"
               style="width:100%;max-height:480px;object-fit:cover;display:block;margin:0 0 1.5rem" />`
        : ''}
      <div itemprop="articleBody" style="line-height:1.75;font-size:1.05rem">
        ${bodyHtml}
      </div>
    </article>
  </div>
</body>
</html>`;
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();

// 1. Dynamic sitemap — registered first to win over any static file
app.get('/sitemap.xml', async (req: Request, res: Response): Promise<void> => {
  try {
    const origin = getSiteOrigin();
    const items  = await getAllPublishedItems();

    const staticPages = [
      { url: '/',              priority: '1.0', changefreq: 'daily'   },
      { url: '/people',        priority: '0.7', changefreq: 'weekly'  },
      { url: '/lifestyle',     priority: '0.7', changefreq: 'weekly'  },
      { url: '/nonprofit',     priority: '0.7', changefreq: 'weekly'  },
      { url: '/crooks-corner', priority: '0.7', changefreq: 'weekly'  },
      { url: '/events',        priority: '0.7', changefreq: 'weekly'  },
      { url: '/directory',     priority: '0.7', changefreq: 'weekly'  },
      { url: '/editions',      priority: '0.5', changefreq: 'monthly' },
      { url: '/about',         priority: '0.5', changefreq: 'monthly' },
      { url: '/advertise',     priority: '0.4', changefreq: 'monthly' },
    ];

    const urlTag = (
      loc:        string,
      lastmod:    string | null,
      changefreq: string,
      priority:   string,
    ) =>
      `  <url>\n    <loc>${loc}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

    const staticXml  = staticPages.map(p => urlTag(`${origin}${p.url}`, null, p.changefreq, p.priority));
    const articleXml = items
      .filter(i => TYPE_TO_SECTION[i.contentType])
      .map(i => urlTag(
        `${origin}/${TYPE_TO_SECTION[i.contentType]}/${i.slug}`,
        i.updatedAt.toISOString().split('T')[0],
        'weekly',
        '0.9',
      ));

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      [...staticXml, ...articleXml].join('\n') +
      `\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.send(xml);
  } catch (err) {
    console.error('[ssr] Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// 2. SSR middleware — intercepts /<section>/<slug> for the 6 content patterns
async function ssrHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== 'GET') return next();
  const parts = req.path.split('/').filter(Boolean);
  if (parts.length !== 2) return next();
  const [section, slug] = parts;
  if (!SSR_SECTIONS.has(section)) return next();

  try {
    const row = await getPublishedItem(slug);
    if (!row) return next(); // not published → fall through to static / 404

    // Guard: ensure content type belongs to the requested section URL
    if (TYPE_TO_SECTION[row.item.contentType] !== section) return next();

    const coverUrl = coverUrlFor(row.mediaObjectPath ?? null);
    const html     = buildHtml(row.item, coverUrl, section, getSiteOrigin());

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
    res.send(html);
  } catch (err) {
    console.error('[ssr] Render error for', req.path, err);
    next(); // on DB/render error fall through to SPA shell
  }
}
app.use(ssrHandler);

// 3. Static files from the Vite build (assets, images, favicon, robots.txt…)
app.use(express.static(DIST_PUBLIC, {
  index:  false, // let the catch-all below handle index.html
  maxAge: '1d',
  etag:   true,
}));

// 4. SPA fallback — all other routes return index.html for client-side routing
app.get('/{*path}', (_req: Request, res: Response): void => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST_PUBLIC, 'index.html'));
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

loadViteAssets();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ssr] Life Around Senoia SSR server on port ${PORT}`);
  console.log(`[ssr] Static files: ${DIST_PUBLIC}`);
});
