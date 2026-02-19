# React E‑commerce – Folder Structure & Doc

Proposed folder structure for the React e‑commerce app. Use this as the single source of truth before creating any folders or files.

---

## Root

```
khushWeb/
├── public/
├── src/
│   ├── app/                    # App-level: store, routes
│   ├── features/               # Feature-based pages/modules
│   ├── shared/                 # Reusable components, layout, UI
│   ├── services/               # API & external services
│   ├── utils/                  # Helpers, constants, formatters
│   ├── assets/                 # Static assets
│   └── types/                  # Shared TypeScript types
├── FOLDER_STRUCTURE.md
└── (config files: package.json, vite.config, etc.)
```

---

## 1. `src/app/` – App-level (centralized config)

| Path | Purpose |
|------|--------|
| `app/store/` | **Redux store** – single place for global state |
| `app/store/slices/` | Redux slices (cart, auth, products, ui, etc.) |
| `app/store/index.js` | Store creation, `configureStore` |
| `app/store/persist.js` | Redux-persist config (whitelist, storage) |
| `app/routes/` | Route definitions, lazy-loaded pages, guards |

**Redux with persist:**  
- Store lives under `app/store/`.  
- Persist config in `app/store/persist.js` (or `persist.ts`).  
- All slices live in `app/store/slices/` so state is centralized.

---

## 2. `src/features/` – Feature folders (by page/flow)

One folder per main screen or flow. Each can have its own components, hooks, and slice usage.

| Folder | Purpose |
|--------|--------|
| `features/home/` | Home page: hero, featured products, banners |
| `features/cart/` | Cart page: list, quantity, remove, totals |
| `features/product/` | Product detail: gallery, description, add to cart |
| `features/auth/` | Login, signup, forgot password |
| `features/checkout/` | Checkout flow: address, payment, confirmation |
| `features/search/` | Search results, filters, sort |
| `features/account/` | Profile, orders, addresses, settings |

**Suggested per-feature layout (when you add files):**

```
features/
├── home/
│   ├── components/
│   ├── HomePage.jsx
│   └── (hooks if needed)
├── cart/
│   ├── components/
│   ├── CartPage.jsx
│   └── ...
├── product/
│   ├── components/
│   ├── ProductPage.jsx
│   └── ...
└── ... (same idea for auth, checkout, search, account)
```

---

## 3. `src/shared/` – Shared UI and layout

| Path | Purpose |
|------|--------|
| `shared/components/` | Reusable components (Header, Footer, Card, Modal) |
| `shared/hooks/` | Custom hooks (useAuth, useCart, useDebounce) |
| `shared/layout/` | Layouts (MainLayout, AuthLayout, CheckoutLayout) |
| `shared/ui/` | Base UI primitives (Button, Input, Badge, Spinner) |

---

## 4. `src/services/` – API & external services

| Path | Purpose |
|------|--------|
| `services/api.js` | Base axios/fetch client, interceptors |
| `services/productService.js` | Product list, by id, search |
| `services/cartService.js` | Cart API (if backend cart) |
| `services/authService.js` | Login, register, refresh token |
| (others) | Payment, orders, user profile, etc. |

---

## 5. `src/utils/` – Helpers and constants

| Path | Purpose |
|------|--------|
| `utils/constants.js` | App constants (routes, API base URL) |
| `utils/formatters.js` | Price, date, string helpers |
| `utils/validators.js` | Form validation helpers |
| `utils/helpers.js` | Generic helpers (localStorage, etc.) |

---

## 6. `src/assets/` – Static assets

| Path | Purpose |
|------|--------|
| `assets/images/` | Images, icons, logos |
| `assets/styles/` | Global CSS, variables, themes |

---

## 7. `src/types/` – TypeScript (optional)

| Path | Purpose |
|------|--------|
| `types/` | Shared `.ts`/`.d.ts` (Product, User, CartItem, ApiResponse) |

Use only if the project is TypeScript; otherwise you can skip this folder.

---

## Visual tree (folders only)

```
src/
├── app/
│   ├── store/
│   │   └── slices/
│   └── routes/
├── features/
│   ├── home/
│   ├── cart/
│   ├── product/
│   ├── auth/
│   ├── checkout/
│   ├── search/
│   └── account/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── layout/
│   └── ui/
├── services/
├── utils/
├── assets/
│   ├── images/
│   └── styles/
└── types/
```

---

## Summary

- **app/** – Redux (with persist) and routes in one place.  
- **features/** – One folder per main page/flow (home, cart, product, auth, checkout, search, account).  
- **shared/** – Components, hooks, layout, UI used across features.  
- **services/** – All API and external calls.  
- **utils/** – Constants and helper functions.  
- **assets/** – Images and global styles.  
- **types/** – Shared types (if using TypeScript).

Use this doc as the reference; create the actual folders and files when you’re ready.
