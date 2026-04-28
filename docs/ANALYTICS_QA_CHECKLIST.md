# Website Analytics QA Checklist

Use this checklist to validate website analytics events are firing to:
1) Third-party layer (`window.dataLayer`)  
2) Own backend ingest (`POST /api/analytics/events`)

---

## Pre-check Setup

- Run frontend and backend locally.
- Ensure backend analytics ingest is reachable at:
  - `${VITE_API_URL}/api/analytics/events`
- If backend requires API key, set:
  - `VITE_ANALYTICS_INGEST_KEY`
- Open browser dev tools:
  - **Network** tab: filter by `analytics/events`
  - **Console** tab: inspect `window.dataLayer`

---

## 1) Session + Page View

### Action
- Open website home page in a fresh tab/session.

### Expected
- Backend request with:
  - `eventType: "session_start"`
  - `channel: "website"`
  - `sessionId`, `anonymousId`, `timestamp`
- Backend request with:
  - `eventType: "page_view"`
  - `path` matching current route

### Verify
- At least one `session_start` per new browser session.
- `page_view` should fire on every route navigation.

---

## 2) Search

### Action
- Search for a term that returns products.
- Search for a term that returns no products.

### Expected
- For results:
  - `eventType: "search"`
  - `searchQuery`
  - `searchResultCount > 0`
- For no results:
  - `eventType: "search_no_results"`
  - `searchQuery`
  - `searchResultCount: 0`

---

## 3) Product View

### Action
- Open any product detail page.

### Expected
- Backend request with:
  - `eventType: "product_view"`
  - `itemId`
  - `price` (if available)
  - `currency: "INR"`

---

## 4) Add to Cart

### Action
- Click **Add To Cart** from product page.

### Expected
- `dataLayer` push:
  - `event: "add_to_cart"` with ecommerce payload
- Backend request:
  - `eventType: "add_to_cart"`
  - `itemId`, `sku`, `quantity`, `price`, `currency`

---

## 5) Wishlist

### Action
- Toggle wishlist heart on product page:
  - once to add
  - once to remove

### Expected
- Add:
  - `eventType: "wishlist_add"`
- Remove:
  - `eventType: "wishlist_remove"`
- Both should include `itemId`; price/currency when available.

---

## 6) Coupon Flow (Cart)

### Action
- Apply valid coupon.
- Apply invalid coupon.
- Remove applied coupon.

### Expected
- Apply attempts:
  - `eventType: "coupon_apply_attempt"`
  - `couponCode`
- Valid apply:
  - `eventType: "coupon_applied"`
  - `couponCode`
  - `discountValue > 0`
- Remove:
  - `eventType: "coupon_removed"`
  - `couponCode`

---

## 7) Checkout Start (Cart -> Checkout)

### Action
- Click checkout from cart page.

### Expected
- `dataLayer` push:
  - `event: "begin_checkout"`
- Backend request:
  - `eventType: "checkout_started"`
  - `cartValue`
  - `currency: "INR"`

---

## 8) Payment + Order (Checkout)

### COD path
- Action:
  - Select COD and place order.
- Expected:
  - `eventType: "order_placed"`
  - `paymentMode: "COD"`
  - `orderId`

### Razorpay success path
- Action:
  - Select online payment, complete successful payment.
- Expected:
  - `eventType: "payment_initiated"`
  - `eventType: "payment_success"`
  - `eventType: "order_placed"`
  - with `paymentMode: "RAZORPAY"`

### Razorpay failure path
- Action:
  - Fail/cancel payment or trigger verify failure.
- Expected:
  - `eventType: "payment_failed"`
  - `paymentMode: "RAZORPAY"`
  - failure reason in `meta.reason` when available

---

## 9) Auth Events (Auth Page + Auth Modal)

### Action
- Try login/signup OTP send and verify flows in:
  - full auth page
  - auth modal

### Expected
- Start:
  - `auth_login_started` or `auth_signup_started`
- Success:
  - `auth_login_success` or `auth_signup_success`
- Failure:
  - `auth_login_failed` (with `meta.reason`)

---

## 10) Payload Integrity Checks

For sampled events, verify:
- `channel` is always `website`.
- `sessionId` is stable within a browser session.
- `anonymousId` exists for guest flows.
- `userId` appears for authenticated flows (if token decodes to user id).
- `path` is meaningful frontend route.
- No malformed numeric fields (`price`, `cartValue`, `discountValue`).

---

## 11) Regression Checks

- Existing user flows still work (cart, checkout, auth, search).
- Existing GTM `dataLayer` events still fire.
- No console/runtime errors introduced.
- Build passes successfully.

---

## Quick Pass Criteria

Mark QA as passed when:
- All required events above are observed in network payloads.
- `dataLayer` events still appear for ecommerce actions.
- No duplicate or obviously incorrect event payloads.
- No broken user flow/regression observed.
