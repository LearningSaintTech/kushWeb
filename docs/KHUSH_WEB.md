# khushWeb — Project Documentation

This document describes the **structure**, **AI integration**, **workflow**, and **routing** of the khushWeb front-end application.

---

## 1. Project structure

### Root layout

| Path           | Purpose                          |
|----------------|----------------------------------|
| **`src/`**     | Application source code         |
| **`public/`**  | Static assets                    |
| **`index.html`** | HTML shell; loads `/src/main.jsx` |

### Config files

| File               | Purpose |
|--------------------|--------|
| **`package.json`** | Scripts: `dev` (Vite), `build`, `preview`. Deps: React 18, React Router 7, Redux Toolkit, Redux Persist, Axios, react-icons. Dev: Vite 6, Tailwind 4, `@vitejs/plugin-react`, `@tailwindcss/vite`. |
| **`vite.config.js`** | Vite config: React plugin, Tailwind plugin, dev server port **5174**. |
| **`.env`**         | Environment variables. Use `VITE_API_URL` for backend base URL; optional `VITE_DEBUG` for request/response logs. See `src/services/README.md`. |

### Under `src/`

| Directory     | Purpose |
|---------------|--------|
| **`app/`**    | App shell: routes, Redux store, context providers, app-level hooks |
| **`features/`** | Feature modules (pages + feature-specific components) |
| **`shared/`**   | Shared layout, components, UI, hooks |
| **`services/`** | API layer (axios client + `*.service.js` modules) |
| **`utils/`**    | Constants (e.g. `ROUTES`), helpers, validators, formatters |
| **`types/`**   | Shared types (e.g. `types/index.js`) |

### `app/`

| Path / file              | Purpose |
|--------------------------|--------|
| **`routes/index.jsx`**   | Route definitions and `RouterProvider` (React Router v7) |
| **`store/`**             | Redux store, persist config, slices (`location`, `search`) |
| **`context/AuthContext.jsx`** | Auth state: token, user, login/register/OTP, logout |
| **`context/CartWishlistContext.jsx`** | Cart and wishlist state and actions |
| **`hooks/`**             | e.g. `useLocationOnLoad.js`, `useNavbarMenu.js` |

### `features/`

| Feature folder       | Main contents |
|----------------------|----------------|
| **`home/`**          | HomePage, Banner, NewArrivals, Collection, OurCategory, OurProduct, BestSellar, Couples, WearYour |
| **`product/`**      | ProductPage, ReviewRating, ProductReviewImages |
| **`search/`**       | SearchPage |
| **`sectionExplore/`** | SectionExplorePage (“Explore More” sections) |
| **`cart/`**          | CartPage |
| **`wishlist/`**      | WishlistPage |
| **`checkout/`**      | CheckoutPage |
| **`auth/`**          | AuthPage, AuthModal (OTP login/register) |
| **`policy/`**        | PolicyPageLayout and policy pages: RefundCancel, Payment, ShippingDelivery, FAQs, AboutUs, ContactUs, TermsConditions, PrivacyPolicy |

### `shared/`

| Path / area           | Purpose |
|-----------------------|--------|
| **`layout/MainLayout.jsx`** | Header, main `<Outlet />`, Footer, AuthModal |
| **`components/`**     | Header, Footer, ScrollToTop, LocationPicker, ProfileModal, ProductCard |
| **`ui/`**             | Button, icons |
| **`hooks/index.js`**  | Re-exports for shared hooks |

---

## 2. AI integration

**There is no AI/LLM integration in khushWeb.**

- No usage of OpenAI, Claude, Anthropic, or other LLM/chat APIs in `src/`.
- No AI-related environment variables; only `VITE_API_URL` and `VITE_DEBUG` are used.
- No chat/completion UI or AI-specific hooks/context.
- All API usage goes through `src/services/` to your backend (items, auth, cart, wishlist, content, etc.), not to external AI services.

To add AI later, you would typically:
- Add a new service (e.g. `ai.service.js`) that calls your backend or an AI API.
- Use env vars (e.g. `VITE_AI_API_URL`) for configuration, without committing secrets.

---

## 3. Workflow

### Data flow

1. **API → components**  
   Services in `src/services/` (e.g. `items.service.js`, `auth.service.js`, `cart.service.js`) use a shared **axios** client from `axiosClient.js` (base URL from `config.js` → `VITE_API_URL`).  
   Pages and components call these services (e.g. `itemsService.search()`, `cartService.my()`) and keep results in local state or pass them to children.

2. **Auth token**  
   `AuthContext` holds the token and syncs it to `localStorage` and to the axios client via `setAccessTokenGetter()` in `axiosClient.js`.  
   `setOnUnauthorized()` is used for 401 handling (e.g. refresh or redirect) from `AuthContext`.

### State management

| Layer        | What it holds |
|-------------|----------------|
| **Redux (RTK)** | **`location`**: pincode, addressLabel, recentPincodes, suggestedPincodes, loading/error. **`search`**: recentKeywords. Persisted with **redux-persist** (with a transform so `isLoading`/`error` are not persisted). |
| **React Context** | **AuthContext**: token, user, auth modal state, login/register/verifyOtp/resendOtp, refresh, logout. **CartWishlistContext**: cart, wishlist, wishlistIds, counts, addToCart, removeFromCart, toggleWishlist, etc. Uses Redux `location.pincode` and `useAuth().isAuthenticated`. |
| **Local state** | Page-level data (e.g. product details, search results) is typically `useState`, sometimes combined with context/Redux. |

### Page composition and layout

1. **Root**  
   `main.jsx` renders: Redux `Provider` → `PersistGate` → `App`.

2. **App**  
   `App.jsx` wraps with `AuthProvider` → `CartWishlistProvider`, runs `useLocationOnLoad()`, then renders the router’s `Routes`.

3. **Layout**  
   - **MainLayout** (`shared/layout/MainLayout.jsx`): Header, `<Outlet />` (page content), Footer, AuthModal.  
   - All routes except `/auth` use MainLayout as parent.  
   - `/auth` is full-page `AuthPage` with no MainLayout.

---

## 4. Routes

### Router setup

- **Library:** `react-router-dom` v7.
- **Definition:** `createBrowserRouter` in **`src/app/routes/index.jsx`**; `RouterProvider` is rendered inside `App`.

### Route list

| Path                      | Component               | Layout     |
|---------------------------|-------------------------|------------|
| `/`                       | HomePage                | MainLayout |
| `/cart`                   | CartPage                | MainLayout |
| `/wishlist`               | WishlistPage            | MainLayout |
| `/product/:id`            | ProductPage             | MainLayout |
| `/checkout`               | CheckoutPage            | MainLayout |
| `/search`                 | SearchPage              | MainLayout |
| `/section/:sectionId`     | SectionExplorePage      | MainLayout |
| `/refund-cancel-policy`   | RefundCancelPolicyPage  | MainLayout |
| `/payment-policy`         | PaymentPolicyPage       | MainLayout |
| `/shipping-delivery-policy` | ShippingDeliveryPolicyPage | MainLayout |
| `/faqs`                   | FAQsPage                | MainLayout |
| `/about-us`               | AboutUsPage             | MainLayout |
| `/contact-us`             | ContactUsPage           | MainLayout |
| `/terms-conditions`       | TermsConditionsPage     | MainLayout |
| `/privacy-policy`         | PrivacyPolicyPage       | MainLayout |
| `/auth`                   | AuthPage                | None (standalone) |

### Route constants and helpers

Defined in **`src/utils/constants.js`**:

- **`ROUTES`** — Object with keys like `HOME`, `CART`, `WISHLIST`, `PRODUCT`, `AUTH`, `CHECKOUT`, `SEARCH`, `SECTION_EXPLORE`, and all policy paths (e.g. `REFUND_CANCEL_POLICY`, `PRIVACY_POLICY`).

- **Helpers**
  - `getProductPath(id)` → e.g. `'/product/123'`
  - `getSectionExplorePath(sectionId)` → e.g. `'/section/sectionId'` (falls back to `'/search'` if no `sectionId`)

Use these constants and helpers for navigation (e.g. `<Link to={getProductPath(item.id)}>`) so paths stay in sync with the router.

---

## Quick reference

- **Structure:** Feature-based under `src/features/`, shared code under `src/shared/`, app shell under `src/app/`, API under `src/services/`.
- **AI:** Not integrated; all calls go to your backend via `src/services/`.
- **Workflow:** Redux (location, search) + AuthContext + CartWishlistContext; pages use services and local state; MainLayout wraps all routes except `/auth`.
- **Routes:** Defined in `src/app/routes/index.jsx`; path constants and helpers in `src/utils/constants.js`.
