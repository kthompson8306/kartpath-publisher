---
name: React hooks must precede all early returns
description: useState/useMemo/useEffect must be declared before any conditional returns in a React component; HMR can mask this and make old cached renders appear to conflict.
---

## Rule

All hook calls (`useState`, `useMemo`, `useEffect`, etc.) must appear before any conditional early returns in a component. When adding new hooks to a component that already has early-return guards (loading/error states), place the hooks above the first `if (...)` block.

**Why:** React enforces a stable hook call order across renders. If hooks appear after a conditional return, some renders skip those hooks, breaking the count — React throws "Rendered more hooks than during the previous render." Hot Module Replacement (HMR) can also cache a pre-fix render and compare it against the new version, causing the same error even after a partial fix if duplicate hook blocks remain.

**How to apply:**
- Move `useState` / `useMemo` / `useEffect` to the very top of the component body, right after other hook calls.
- For derived state that needs `query.data`, use an optional-chain fallback: `const items = useMemo(() => (query.data?.gallery ?? []).filter(...), [query.data])`.
- After editing, grep the component for any surviving duplicate hook blocks (easy to leave behind if the old block wasn't deleted when the new one was added at the top).
