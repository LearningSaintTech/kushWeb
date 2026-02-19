# KhushWeb – Instructions for AI Tools

Use this document when working on the **KhushWeb** project with any AI assistant or code generator. It describes the stack, structure, and conventions so changes stay consistent.

---

## 1. Project overview

- **Name:** KhushWeb  
- **Type:** React e-commerce (JavaScript, not TypeScript)  
- **Build:** Vite 6  
- **Styling:** Tailwind CSS v4 (Vite plugin)  
- **Routing:** React Router DOM v7  
- **State:** Redux + persist planned; store structure exists under `src/app/store/` (slices and persist config are stubs)

---

## 2. Commands

```bash
npm install          # Install dependencies
npm run dev         # Start dev server (e.g. http://localhost:5173)
npm run build       # Production build
npm run preview     # Preview production build
```

---

## 3. Tech stack and rules

- **Language:** JavaScript only. Use `.js` and `.jsx`. Do not introduce TypeScript unless explicitly requested.  
- **Styling:** Tailwind CSS only. Use utility classes; avoid inline styles except for dynamic values. Global CSS lives in `src/index.css` and `src/assets/styles/variables.css`.  
- **Routing:** React Router DOM. Routes are defined in `src/app/routes/index.jsx` using `createBrowserRouter`. Use `NavLink` / `Link` and `ROUTES` from `src/utils/constants.js` for URLs.  
- **New dependencies:** Add with npm; update `package.json`. Prefer existing stack (React 18, Vite, Tailwind, React Router).

---

## 4. Folder structure and where to put things

```
src/
├── app/                    # App-level config only
│   ├── store/              # Redux: index.js, persist.js, slices/
│   └── routes/             # Router config: index.jsx
├── features/               # One folder per main page/flow
│   ├── home/               # HomePage.jsx, index.jsx, components/
│   ├── cart/
│   ├── product/
│   ├── auth/
│   ├── checkout/
│   ├── search/
│   └── account/
├── shared/                 # Reusable across the app
│   ├── components/         # Header, Footer, etc.
│   ├── layout/             # MainLayout, etc.
│   ├── ui/                 # Button, icons (icons.jsx)
│   └── hooks/              # Custom hooks
├── services/               # API and external calls (api.js, etc.)
├── utils/                  # constants.js, formatters.js, validators.js, helpers.js
├── assets/
│   ├── images/             # Images (e.g. navBar/logo.png)
│   └── styles/             # variables.css, etc.
├── types/                  # Optional JSDoc / shared types
├── App.jsx
├── main.jsx
└── index.css
```

- **New page/flow:** Add a folder under `src/features/<name>/` with `<Name>Page.jsx` and `index.jsx` that re-exports the page. Register the route in `src/app/routes/index.jsx` and add the path to `ROUTES` in `src/utils/constants.js`.  
- **New reusable component:** Put it in `src/shared/components/` (or `shared/ui/` for small primitives).  
- **New API/backend call:** Add or extend files in `src/services/`; use the base `request` helper from `src/services/api.js` when applicable.  
- **New constant or route path:** Add to `src/utils/constants.js`.  
- **New Redux slice:** Add under `src/app/store/slices/` and re-export from `slices/index.js`. Keep store and persist config in `app/store/`.

---

## 5. Key files and imports

- **Routes and constants:**  
  `import { ROUTES, getProductPath } from '../../utils/constants'`  
  Use `ROUTES.CART`, `ROUTES.HOME`, `getProductPath(id)`, etc., for links.

- **Shared icons (search, heart, cart, profile, location):**  
  `import { SearchIcon, HeartIcon, CartIcon, ProfileIcon, LocationIcon } from '../ui/icons'`  
  Icons accept a `className` prop and use `currentColor`.

- **Logo:**  
  `import logoImg from '../../assets/images/navBar/logo.png'`  
  Use as `<img src={logoImg} alt="KHUSH" />`.

- **Layout:**  
  `MainLayout` from `src/shared/layout/MainLayout.jsx` wraps main app content; it includes `Header`, `Footer`, and `<Outlet />` for route children.

- **Base API:**  
  `import { request, API_BASE_URL } from '../services/api'`

---

## 6. Routing

- **Definition:** `src/app/routes/index.jsx`.  
- **Main layout:** Path `/` uses `MainLayout`; children are index (home), `cart`, `product/:id`, `checkout`, `search`, `account`.  
- **Auth layout:** Path `auth` renders `AuthPage` without `MainLayout`.  
- **Product URL:** Use `getProductPath(productId)` from `utils/constants.js` for links to product detail.  
- **New route:** Add entry in the `createBrowserRouter` array and add the corresponding key to `ROUTES` in `utils/constants.js`.

---

## 7. Header and navigation

- **File:** `src/shared/components/Header.jsx`.  
- **Behavior:** Promo bar at top; main row with logo, location pill, nav links (MEN with mega menu), search bar, wishlist/cart/profile icons; mobile uses hamburger and a separate search row.  
- **MEN dropdown:** Hover opens a mega menu (subcategories); chevron rotates with open state.  
- **Icons:** Use shared icons from `src/shared/ui/icons.jsx` (SearchIcon, HeartIcon, CartIcon, ProfileIcon, LocationIcon).  
- **Logo:** Use `src/assets/images/navBar/logo.png` as above.

---

## 8. Redux and state

- **Location:** All Redux logic under `src/app/store/`: `index.js` (store), `persist.js` (persist config), `slices/` (slices).  
- **Current state:** Store and persist are stubs (commented). When adding Redux: implement in `app/store/index.js` and `app/store/persist.js`, add slices in `app/store/slices/`, and keep a single root reducer.  
- **Persistence:** Use redux-persist; persist config (whitelist, storage) in `app/store/persist.js`.

---

## 9. Conventions and style

- **Components:** Functional components only. Use default export for the main component and named exports for subcomponents or hooks when needed.  
- **Naming:** PascalCase for components and pages; camelCase for utilities, hooks, and functions. Page components: `<Feature>Page.jsx` (e.g. `HomePage.jsx`, `CartPage.jsx`).  
- **Imports:** Prefer relative paths from the file (e.g. `../../utils/constants`). Be consistent with `../` depth.  
- **Tailwind:** Prefer Tailwind classes; avoid arbitrary values unless necessary. Use existing spacing/color scale.  
- **Links:** Use React Router’s `Link` or `NavLink` for in-app navigation; use `ROUTES` and `getProductPath` for paths.

---

## 10. Assets

- **Images:** Store under `src/assets/images/` (e.g. `navBar/logo.png`). Import in JS/JSX when used in components.  
- **Global styles:** `src/index.css` (Tailwind import + variables); `src/assets/styles/variables.css` for CSS variables.  
- **Icons:** Shared SVG icons live in `src/shared/ui/icons.jsx`. Add new shared icons there and export as named components that accept `className`.

---

## 11. Adding a new feature (checklist)

1. Create `src/features/<feature>/` with `<Feature>Page.jsx` and `index.jsx`.  
2. Add route in `src/app/routes/index.jsx` and path in `src/utils/constants.js` (`ROUTES`).  
3. If the feature has API calls, add or use `src/services/` and optionally `src/utils/`.  
4. If the feature needs global state, add or use a slice under `src/app/store/slices/`.  
5. Use shared components (`shared/components/`, `shared/ui/`) and shared icons where appropriate.  
6. Use `MainLayout` for main app pages unless the flow is standalone (e.g. auth).

---

## 12. Reference docs

- **Folder structure (detailed):** `FOLDER_STRUCTURE.md` in the project root.  
- **This file:** `AI_INSTRUCTIONS.md` – share it with any AI tool or new contributor working on KhushWeb.

---

*Last updated to match the current KhushWeb codebase (Vite, React 18, Tailwind v4, React Router v7, JavaScript).*
