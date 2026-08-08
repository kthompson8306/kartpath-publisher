---
name: KartPath public-site asset delivery
description: Preview-safe handling for static editorial images in path-routed web artifacts.
---

Bundling editorial images through the frontend build is more reliable than referencing files directly from a public directory when the Replit preview proxy uses an SPA fallback for unmatched paths. Keep the original public copies when they are useful as source assets, but use Vite-managed URLs in rendered components.

**Why:** The path-routed preview can return the HTML shell with a 200 status for a missing image URL, which creates broken images despite apparently successful curl checks.

**How to apply:** For future public-site media in this artifact, import or bundle the assets through Vite and verify the rendered preview, not only HTTP status codes.
