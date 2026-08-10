---
name: Homepage slideshow architecture
description: How the hero, strip, and pull-quote rotation components are built on the LAS homepage.
---

## Curation model
Staff pins ordered UUID lists per section (`heroOrder`, `stripNonprofit`, `stripAchiever`, `stripRecipe`, `stripSecretSauce`) stored in the publication's `homepageCuration` jsonb field. Old shape was `{ hero, strip[] }` — fully replaced.

`buildPool(pinnedIds, typeFilter, limit)` in PublicHome: pinned items appear first (in stated order), then remaining items of that type fill the rest up to `limit`.

## Secret Sauce lane
Pulls from `lifestyle-column` items where `details.subsection === 'secret-sauce'`. Crooks Corner is NOT in any strip lane.

## Sliding track technique
**Hero (new slides from RIGHT):** `display:flex` track, `width: N*100%`, each slide `width: 100/N%`, `transform: translateX(-idx * (100/N)%)`. As idx increases, track moves LEFT.

**Strip (new slides from LEFT):** Items laid out in REVERSED DOM order. `transform: translateX(-(N-1-idx) * (100/N)%)`. As idx increases, translateX becomes less negative → track moves RIGHT → current item exits right, next enters from left.

**Critical:** `.giant-num` must be INSIDE each `.mega-hero-bg` slide (position:absolute relative to it), NOT outside the track — otherwise slides render on top of it due to DOM/stacking order.

## Pull-quote carousel
Cross-fade via `opacity` transition. Filters `items.filter(i => i.pullQuote)`. Falls back to hardcoded static quote if no articles have a pull quote set.

`pullQuote` is a nullable text column on `content_items` (migration 0009). Staff sets it in the article editor. The `serializeItem` function in both editorial.ts and publications.ts uses `...item` spread, so pullQuote flows automatically with no route changes needed.

## PinList component
Defined OUTSIDE `HomepageTab` to avoid React re-mounting on every parent render. Passed `onDirty` callback instead of `setSaved` directly to keep the interface clean.

## CSS classes added
- `.mega-hero-slides-wrap` — `position:relative; overflow:hidden` (wraps track + dots)
- `.mega-hero-slides-track` — `display:flex; transition:transform 600ms ease-in-out`
- `.hero-slide-dots` — `position:absolute; bottom:1.5rem; left:2.5rem; z-index:10`
- `.dot` / `.dot--active` — 8px circles, semi-transparent → white when active
- `.strip-img--carousel:hover { transform:none }` — suppress scale on carousel boxes

**Why:** The hover scale (`.strip-img:hover { transform:scale(1.02) }`) was designed for static single-image boxes. Carousel boxes get `.strip-img--carousel` to opt out of it.
