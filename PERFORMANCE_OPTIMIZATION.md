# khushWeb – Performance optimization guide (clean JS / Redux / hooks)

Focused on **clean JavaScript**, **Redux**, and **React hooks** only (no build/config changes).

---

## 1. Redux – Selectors and re-renders

### Use narrow selectors

- **Prefer selecting primitives or small values** so only components that care about a specific field re-render when that field changes.
- **Avoid** `useSelector((s) => s.someSlice)` when the slice is a big object; any change in the slice will re-render.

**Example (already applied in `LocationPicker.jsx`):**

```js
// Before: whole slice → re-renders on any location change
const locationState = useSelector((s) => s.location)

// After: one selector per field (or only the fields you need)
const pincode = useSelector((s) => s.location?.pincode)
const addressLabel = useSelector((s) => s.location?.addressLabel)
const recentPincodes = useSelector((s) => s.location?.recentPincodes ?? [])
// ...
```

### Use `shallowEqual` for array/object selectors

When the selector returns an **array or object**, the reference can change even when contents are the same. Use `shallowEqual` as the second argument so the component re-renders only when the array/object content actually changes.

**Example (already applied in `Header.jsx`):**

```js
import { useSelector, shallowEqual } from 'react-redux'

const recentFromRedux = useSelector(
  (s) => s?.search?.recentKeywords ?? [],
  shallowEqual
)
```

### Optional: shared selectors

For reuse and consistency, you can move selectors to a file and reuse them:

```js
// e.g. store/selectors/locationSelectors.js
export const selectPincode = (s) => s.location?.pincode
export const selectRecentKeywords = (s) => s?.search?.recentKeywords ?? []
```

Then in components:

```js
const pincode = useSelector(selectPincode)
const recentFromRedux = useSelector(selectRecentKeywords, shallowEqual)
```

---

## 2. Context – Stable provider value

If the context **value** is a new object every render, every consumer re-renders even when the data inside did not change.

### Memoize the context value (already applied)

**AuthContext** and **CartWishlistContext** now wrap their `value` in `useMemo` with the correct dependency array so the value reference is stable when its contents are unchanged.

**Pattern:**

```js
const value = useMemo(
  () => ({
    token,
    user,
    login,
    logout,
    // ...
  }),
  [token, user, login, logout /* all values/functions used */]
)
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
```

Ensure every value and function in the object is either stable (e.g. from `useCallback`) or listed in the dependency array.

---

## 3. Hooks – useCallback / useMemo

- **Event handlers passed to list children** (e.g. ProductCard): wrap in `useCallback` so the child’s prop reference is stable and `React.memo` can skip re-renders.
- **Expensive derived data** (filtered/sorted lists, computed props): wrap in `useMemo` so you don’t recompute every render.
- **Context callbacks** (e.g. `login`, `logout`, `addToCart`): already wrapped in `useCallback` in your contexts; keep that pattern so the context value stays stable when memoized.

---

## 4. List items – React.memo

**ProductCard** is used in lists (home, search, section explore). It’s now wrapped in `React.memo` so it only re-renders when its props change.

**Pattern:**

```js
const ProductCard = React.memo(function ProductCard({ id, title, ... }) {
  // ...
})
export default ProductCard
```

For maximum benefit, ensure **parent components pass stable props** (e.g. avoid creating new object/function props inside the map). Prefer passing primitives and stable callbacks.

---

## 5. Avoid unnecessary effect dependencies

- Keep **effect dependency arrays** minimal and correct; avoid putting whole objects/arrays if you only need a primitive (e.g. `pincode` instead of `locationState`).
- **Cleanup**: use a `cancelled` flag or AbortController in async effects so you don’t set state after unmount (you already do this in several places).

---

## 6. Optional next steps (still “clean JS” only)

- **Lazy routes**: wrap heavy route components in `React.lazy()` and wrap the route tree in `<Suspense>` to reduce initial bundle and improve TTI.
- **Split CartWishlistContext**: if some components only need cart and others only wishlist, splitting into `CartProvider` and `WishlistProvider` (or two contexts) can reduce re-renders when only one of them changes.
- **Custom “selector” hooks for context**: e.g. `useIsInWishlist(id)` that only subscribes to the minimal state needed for that check, so ProductCard doesn’t re-render on every cart change (requires splitting or selective subscription pattern).

---

## Summary of changes already applied

| Area | Change |
|------|--------|
| **AuthContext** | Provider `value` memoized with `useMemo`. |
| **CartWishlistContext** | Provider `value` memoized with `useMemo`. |
| **LocationPicker** | Replaced single `useSelector(s => s.location)` with one selector per field. Removed debug `console.log` effect. |
| **Header** | `recentKeywords` selector uses `shallowEqual`. |
| **useLocationOnLoad** | Removed all `console.log` calls. |
| **ProductCard** | Wrapped in `React.memo`. |

These keep the codebase clean (no extra libraries) and improve performance by reducing unnecessary re-renders and keeping Redux/context usage predictable.
