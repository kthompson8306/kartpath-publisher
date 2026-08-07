# Life Around Senoia — Design System & Content Handoff
### Companion to: KartPath Digital Publishing Platform — True Build Blueprint v2 & Structure & Design Overview
**Prepared by:** Atlas (Claude), for KartPath Media
**Purpose:** Feed this alongside the two Blueprint documents into the Replit Agent session. This covers the "UI direction" and "seed publication" inputs called for in Blueprint §12 — it is not a spec for the platform itself, only its visual target and starting content.

---

## 1. How To Use This Document

Per Blueprint §12 ("Initial project prompt should contain... UI direction and explicit instruction to avoid generic AI/SaaS styling... Seed publication: Life Around Senoia"), this document supplies exactly those two inputs:

- **Section 2** — the design system (colors, type, component patterns) as the literal UI direction
- **Section 3** — the real Life Around Senoia content already gathered, ready to seed the CMS once it exists
- **Section 4** — an honest gap list (what's still missing, what's a placeholder) so nothing gets treated as finished when it isn't

The actual files (CSS, HTML reference pages, images) are in the `las-site-v2-concept` folder and should be handed to Replit alongside this document — this write-up explains what's in that folder, it doesn't replace it.

---

## 2. Design System (UI Direction)

### 2.1 Intent
Explicitly built to avoid the "generic AI/SaaS template" look the Blueprint warns against. Reference points were a regional business magazine (Fargo INC!) and a premium coffee-table publication (Faces of Scottsdale) — not copied, but used to justify a denser, more editorial, more confident execution than a typical small-business template.

### 2.2 Color Tokens
```css
--ink:        #0B0E0A   /* primary text, dark sections */
--ink-soft:   #4A4F49   /* body copy on light backgrounds */
--ink-faint:  #8A8F86   /* meta text, timestamps, captions */
--pine:       #16301F   /* brand dark green */
--pine-2:     #1F4029   /* brand green, lighter step */
--brick:      #C1502A   /* primary accent — links, tags, CTAs */
--honey:      #E7A93E   /* secondary accent — highlights, "porch light" motif */
--paper:      #F7F5EE   /* primary background */
--paper-2:    #EFEBDD   /* secondary/alternating section background */
--line:       #DAD5C4   /* hairline borders, dividers */
```
Grounded in Senoia itself, not arbitrary: pine tree lines, Main Street brick, and porch-light gold at dusk.

### 2.3 Typography
| Role | Font | Usage |
|---|---|---|
| Display / Headlines | **Fraunces** (variable, opsz 9–144) | All headlines, pull quotes. Bold weights (600–900) for impact, italic for editorial voice. |
| Body copy | **Newsreader** | Article body text, deks, longer-form reading. |
| UI / Navigation | **Space Grotesk** | Nav links, buttons, labels — the "techy" counterweight to the editorial serif. |
| Meta / Data | **IBM Plex Mono** | Tags, timestamps, category labels, issue numbers, stat counters — signals "current/tech" without sacrificing warmth. |

All four are free Google Fonts, already wired via `<link>` tags in every reference page.

### 2.4 Signature Component Patterns
These recurring patterns are the actual reusable "component variants" Blueprint §7 calls for — worth preserving as real components in the built platform, not just CSS classes:

- **Hairline-bordered grid modules** (`.bento`, `.people-grid`, `.channel-grid`) — content blocks separated by 1px lines rather than cards with shadows/radius. This is the primary visual signature distinguishing it from a generic template.
- **Numbered index rail** (`.index-row`) — category/section listing as a numbered table-of-contents rather than icon tiles; inverts to solid dark on hover.
- **Mono-label tags everywhere** — every piece of metadata (category, issue number, read time) rendered in IBM Plex Mono, uppercase, letter-spaced. This is the single highest-leverage detail for the "premium/editorial" feel.
- **Full-bleed photo hero with bottom gradient** — real photo, dark gradient from ~40% down, text sits directly on the gradient. Requires photos with clean space in the lower third (see §4 for which photos still need this treatment).
- **Ad zone styling** (`.ad-zone`) — dashed border, small-caps "Advertisement" label, already positioned at the two placements the Blueprint's homepage module list calls "strategic ad zone" (post-hero, mid-feed).
- **Giant ghosted numeral / wordmark** — oversized outlined type (`.giant-num`, `.footer-giant`) used exactly once per page as a design anchor, not decoration everywhere.

### 2.5 Reference Files
- `style2.css` — the authoritative stylesheet. Every token and component above is defined here.
- `script2.js` — directory search/filter logic (vanilla JS; will be replaced by real CMS-driven filtering, but shows the intended interaction).
- `index-v3.html` (**this is the real homepage** — see §4.1 for a naming issue to fix before this goes further)
- `people.html`, `nonprofit.html`, `lifestyle.html`, `events.html`, `directory.html`, `editions.html`, `about.html`, `advertise.html`

---

## 3. Seed Content Inventory (Real, Not Placeholder)

All content below was pulled directly from the actual issue PDFs — not invented — per the "preserve source editorial text by default" principle in Blueprint §5. Treat this as the first Content Inbox batch once ingestion exists, or as manually-entered seed content before it does.

### 3.1 Issue → Featured Family Map (confirmed, corrects earlier filename-based errors)
| Issue | Family | Cover Photo | Notes |
|---|---|---|---|
| 01 | Bergstrom | ✅ `family-bergstrom.jpg` | Sept 2025 |
| 02 | McGee | ✅ `family-mcgee.jpg` | Nov–Dec 2025. **Source file is named `LAS_6_1.pdf` — misleading, it is Issue 2.** |
| 03 | Crook | ✅ `family-crook.jpg` | Winter 2026. Ellis Crook passed June 22, 2026 — history column renamed "Crook's Corner" in his honor. Handle with care. |
| 04 | Jenkins | ✅ `family-jenkins.jpg` | Spring 2026 |
| 05 | Bartels | ✅ `family-bartels.jpg` | May–Jun 2026 |
| 06 | Brewington | ✅ `family-brewington.jpg` | Jul–Aug 2026. **Source file `LAS_6_V10.pdf` is the correct, real Issue 6** — real print-resolution PDF, not a flipbook export. |

### 3.2 Nonprofit Spotlights (all 6, real photos captured)
i58 Mission (Issue 1) · Backpack Buddies of Georgia (Issue 2) · Our Father's House (Issue 3) · ELEVATE Coweta Students (Issue 4) · A Better Way Ministries (Issue 5) · Senoia Optimist Club (Issue 6)

### 3.3 Young Achievers (names/stories real; 5 of 6 still need photos)
Noah "Trxy" Rieffel (1) · Jack Henry Smith (2) · Madi Collins (3) · Mia, cotton candy entrepreneur (4) · Rayah McAfee (5) · Milo Stupski (6, ✅ photo captured)

### 3.4 Pet of the Month (5 of 6 issues ran one; no photos captured yet)
Bailey (1) · Roxy & Remi (2) · Donut (3) · Beam & Finn (4) · Ziggy Novak (5) · *(Issue 6 did not run one — good nomination-CTA opportunity)*

### 3.5 Real, Current Events (as of Aug 2026)
Locals Night — Aug 21, 2026 · Senoia PorchFest — Sept 6, 2026 · Fish Derby — Sept 19, 2026 · Alive After Five — Sept 18 / Oct 16 / Nov 20, 2026 · Senoia Farmers' Market — every Saturday, April–December

### 3.6 Real Business Directory (20 businesses, real contact info)
Full list with phone/website is in `directory.html`. Categories already applied: Food & Drink, Health & Wellness, Faith, Home & Garden, Professional Services, Auto & Retail — these map directly to a `business_category` taxonomy in the real schema.

### 3.7 Recipe & Lifestyle
Senoia Sunrise cocktail (Issue 6, full ingredients/instructions, real photo) · Downtown Mouse Hunt scavenger hunt (Issue 3, real photos of the painted mice) · Secret Sauce columns (Issues 1 & 6, full text) · Crook's Corner / Historical Society full history (Issue 3, real photo of the Senoia town sign)

---

## 4. Known Gaps — Do Not Treat These As Finished

### 4.1 Structural bug to fix immediately
Two homepages exist in the current folder: `index.html` (an earlier, discarded design direction) and `index-v3.html` (the real, final, content-complete homepage). Every other page's navigation and styling matches `index-v3.html`. **Before this goes further, `index-v3.html` should become the actual `index.html`** — otherwise whatever serves "the homepage" by default will look inconsistent with every other page.

### 4.2 Missing photos (real names/stories exist, photos do not)
- 5 of 6 Young Achievers (Rayah McAfee, Mia, Madi Collins, Jack Henry Smith, Noah Rieffel)
- 5 of 6 Pet of the Month features (Bailey, Roxy & Remi, Donut, Beam & Finn, Ziggy)
- These are marked "Photo pending from Tori" in the HTML — an honest placeholder, not a fake image.

### 4.3 One deliberately imperfect image
The homepage's "Secret Sauce" photo (downtown golf cart scene) is softer than the rest. Its high-resolution source has the article's title text baked across nearly the entire photo — every crop attempt either caught stray text or cut out the actual subject. Kept the cleaner composition over a sharp-but-empty crop. Worth requesting a clean version of this specific photo from whoever shot it, or substituting a different Main Street image.

### 4.4 This is a visual/content mockup, not application code
No database, no CMS, no auth, no multi-tenancy, no ingestion pipeline exists in these files. Every page is static HTML with content written directly into the markup. That's by design — this was the "UI direction" input, not a head start on the actual build. See the cover note above.

---

## 5. Suggested Mapping to the Blueprint's Own Structure

For whoever's driving the Replit Agent session, these already correspond closely — worth pointing out explicitly so the mapping isn't reinvented:

| This mockup's page | Blueprint / Overview equivalent |
|---|---|
| People (Featured Families / Young Achievers / Pet of the Month) | "People / Faces module" (Overview §6); `content_type` variants under Core Content Model (Blueprint §3) |
| Nonprofit | Could be its own `content_type` or a tag/category on Content Items — worth deciding explicitly in Blueprint §14's "initial content types enabled for v1" |
| Events | Events CMS section (Overview §3) — direct match, including recurrence (weekly Farmers' Market) vs. single-date events |
| Directory | Businesses & Places (Overview §3) — the category taxonomy already in use (Food & Drink, Health & Wellness, etc.) is a reasonable starting `business_category` enum |
| Editions | Issues CMS section (Overview §3) — cover image, digital edition link, associated web articles per issue |
| Homepage sections (hero, wire ticker, bento grid, index rail, ad zones) | Maps almost line-for-line onto "LAS homepage v1" in Blueprint §7 |

---

*End of handoff document. Questions on any content or design decision — ask Atlas directly.*
