---
name: Object storage path bugs
description: Two bugs to avoid when building the GCS object serve route in this project.
---

## Bug 1 — path-to-regexp v8 wildcard returns array, not string

**Rule:** With `router@2.2.0` + `path-to-regexp@8.x`, a `/*name` wildcard captures each `/`-separated segment as an array element. Casting the param directly to `string` (or trusting TypeScript's `Record<string, string>`) silently calls `Array.toString()`, which joins with **commas** instead of slashes.

**Why:** The resulting GCS signed URL contains `uploads,<uuid>` in the object path, causing all redirected image fetches to return HTTP 404.

**How to apply:** Always reconstruct the path explicitly when using wildcards in Express routes with path-to-regexp v8:

```ts
router.get("/storage/objects/*objectPath", async (req, res) => {
  const raw = (req.params as Record<string, string | string[]>).objectPath;
  const segments = Array.isArray(raw) ? raw : String(raw).split(",");
  const objectPath = `/objects/${segments.join("/")}`;
  // ...
});
```

---

## Bug 2 — `/*` wildcard throws PathError in path-to-regexp v8

**Rule:** In path-to-regexp v8, anonymous wildcards (`/*`) are rejected with `Missing parameter name`. Always name wildcards: `/*objectPath`.

**Why:** The router throws at startup, preventing the server from starting.

**How to apply:** Any Express wildcard route must use named form: `/*name`, not `/*`.
