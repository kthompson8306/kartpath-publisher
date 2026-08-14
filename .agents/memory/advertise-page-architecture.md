---
name: Advertise page architecture
description: How the /advertise page CMS singleton is structured and rendered
---

## Pattern
Same singleton pattern as `about-page`: one `content_item` row per publication, `slug='advertise'`, `content_type='advertise-page'`, `status='published'`. Never more than one.

## Data layout
- `title` → page hero headline
- `summary` → hero subhead
- `body` → intro paragraphs (split on `\n\n` at render time)
- `details` → record of string values; array fields stored as JSON.stringify

## Details keys
| Key | Type after parse |
|---|---|
| reachHeadline | string |
| reachBody | string (split on \n\n) |
| reachStats | `Array<{label,value}>` |
| reachClosing | string |
| capabilities | `Array<{title, items: string[]}>` |
| specsFileTypes / specsResolution / specsColor / specsBleed | string |
| specsSizes | `Array<{size, dims}>` |
| rateCard | `Array<{placement, rate}>` |
| schedule | `Array<{issue, materialsDue, deliveryDate}>` |
| ctaHeadline / ctaBody / ctaPhone / ctaEmail | string |

## Public render helper
`advParse<T>(s, fallback)` — safe JSON.parse with fallback, defined inside the `Advertise()` function body (not module-level).

## CSS classes
`.adv-stats-grid`, `.adv-stat`, `.adv-cap-grid`, `.adv-cap-card`, `.adv-two-col`, `.adv-table`, `.adv-table--wide`, `.adv-td-mono`, `.adv-td-rate`, `.adv-td-issue`, `.adv-specs-meta`, `.adv-cta-section`, `.adv-cta-contact`, `.adv-cta-link` — all in `las-public.css` with breakpoints at 1120px and 620px.

**Why:** Keeps the advertise page editable without a deploy, consistent with the about-page singleton approach.
