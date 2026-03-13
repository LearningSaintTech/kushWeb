# khushWeb – Notification & Real-Time Integration (Implementation Guide)

This document describes how to implement **in-app notifications** and **real-time updates** in khushWeb so it connects to the existing KhushBackend notification system. Use it as a step-by-step guide; **do not write code until you give the command**.

---

## 1. Backend Summary (What’s Already There)

The backend exposes:

- **Base URL:** All API requests use `API_BASE_URL` = `import.meta.env.VITE_API_URL + "/api"` (e.g. `https://api.khushpehno.com/api`).
- **Auth:** Every notification request must send `Authorization: Bearer <accessToken>`. The existing `axiosClient` already adds this when `getAccessToken()` returns a token (AuthContext sets it from `localStorage` key `khush_access_token`).
- **Socket.IO:** The same HTTP server that serves the API also runs Socket.IO. The socket **URL is the API host only** (no `/api` path), i.e. `import.meta.env.VITE_API_URL` (e.g. `https://api.khushpehno.com` or `http://localhost:5000`). Auth is done by sending the JWT in the handshake (e.g. `auth: { token: accessToken }` or `query: { token: accessToken }`). After connect, the server joins the client to room `user:${userId}` and emits `notification:new` when a new in-app notification is created.

### 1.1 User Notification REST APIs (Backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notification/list` | Paginated list of in-app notifications for current user. Query: `page`, `limit`. Response: `{ list, total, page, limit }`. |
| GET | `/notification/unread-count` | Unread count. Response: `{ count }`. |
| PATCH | `/notification/:id/read` | Mark one notification as read. Params: `id` (Mongo ObjectId string). |
| PATCH | `/notification/read-all` | Mark all as read for current user. |
| POST | `/notification/push-subscribe` | Register for web push. Body: `{ subscription: { endpoint, keys: { p256dh, auth } }, deviceLabel? }`. |
| POST | `/notification/push-unsubscribe` | Remove web push subscription. Body: `{ endpoint }`. |

All of the above require an authenticated user (Bearer token). Response shape follows existing backend: `{ success, message, data }`; list/count/data are in `data` or at top level depending on backend.

### 1.2 Real-Time (Socket.IO) – Backend Behaviour

- **Connect:** Client connects to `VITE_API_URL` (same host as API, no `/api`).
- **Auth:** Send token in handshake, e.g. `auth: { token: accessToken }`. Backend validates JWT and extracts `userId`; client is joined to room `user:${userId}`.
- **Event:** When a new in-app notification is created, backend emits to that room:
  - **Event name:** `notification:new`
  - **Payload:** `{ id, title, body, module, referenceId, createdAt }` (all strings where applicable).

No other events are required for the basic notification bell + list; optional future: `order:status` for live order updates.

---

## 2. khushWeb Current State (Scanned)

- **Stack:** Vite, React 18, React Router, Redux (search, location), AuthContext (token, user, login, logout, getProfile).
- **API:** `src/services/config.js` exports `API_BASE_URL` = `VITE_API_URL + "/api"`. `src/services/axiosClient.js` uses it as `baseURL`, adds `Authorization: Bearer <token>` and `x-device-id` from localStorage; 401 triggers refresh/clear.
- **Auth:** Token and user from `useAuth()`; token is stored in localStorage and set as access-token getter for axios.
- **Header:** `src/shared/components/Header.jsx` uses `IconBadge` with `wishlistCount` and `cartCount` from `useCartWishlist()`, and `SearchIcon`, `HeartIcon`, `CartIcon`, `ProfileIcon` from `src/shared/ui/icons.jsx`. Good place to add a notification bell with unread count.
- **Routes:** `src/app/routes/index.jsx` defines routes; `src/utils/constants.js` has `ROUTES`. No `/notifications` route yet.
- **Services:** Pattern is a service file (e.g. `order.service.js`) that uses `client` from `axiosClient.js` with a `BASE` path. No `notification.service.js` yet. No Socket.IO client dependency yet (`socket.io-client` not in package.json).

---

## 3. Implementation Plan (Doc Only – No Code Yet)

### 3.1 Dependencies

- Add **socket.io-client** so the app can connect to the backend Socket.IO server and listen for `notification:new`.

### 3.2 Environment

- Use existing **VITE_API_URL** for both:
  - REST: `API_BASE_URL = VITE_API_URL + "/api"` (already used by axios).
  - Socket: connect to `VITE_API_URL` (no `/api`). For local dev, `http://localhost:5000`; for prod, same host as API (e.g. `https://api.khushpehno.com`).

### 3.3 Notification REST Service

- **File:** `src/services/notification.service.js`.
- **Base path:** `BASE = '/notification'` (so full URL is `API_BASE_URL + '/notification/...'`).
- **Methods:** Call the existing axios `client` (so auth header is automatic):
  - `getList(params)` → `GET /notification/list` with `params: { page, limit }`.
  - `getUnreadCount()` → `GET /notification/unread-count`.
  - `markRead(id)` → `PATCH /notification/:id/read`.
  - `markAllRead()` → `PATCH /notification/read-all`.
  - `pushSubscribe(subscription, deviceLabel?)` → `POST /notification/push-subscribe`.
  - `pushUnsubscribe(endpoint)` → `POST /notification/push-unsubscribe`.
- Normalise responses to a simple shape (e.g. `data` from `res.data.data ?? res.data`) so components get `{ list, total, page, limit }` or `{ count }` etc.

### 3.4 Real-Time: Socket.IO Connection and Hook

- **Socket URL:** `import.meta.env.VITE_API_URL` (no trailing slash). Must be the same origin/host as the backend server (Socket.IO is attached to the same HTTP server).
- **When to connect:** Only when the user is authenticated (token and ideally `user`/`userId` available). Disconnect on logout or when token is cleared.
- **Auth in handshake:** Pass the current access token, e.g. `auth: { token: token }` (or `query: { token: token }` if the backend supports it). Backend expects JWT and joins the client to `user:${userId}`.
- **Listen:** On connection, subscribe to `notification:new`. When received, update whatever holds “notification list” and “unread count” so the UI (bell badge, list) updates without a full page reload.
- **Suggested place:** A small **NotificationContext** (or a **useNotificationSocket** hook) that:
  - Holds: `notifications` (list), `unreadCount`, `loading` (for list fetch).
  - Provides: `refreshList()`, `refreshUnreadCount()`, `markRead(id)`, `markAllRead()`, and optionally `unreadCount` for the bell.
  - On mount (when authenticated): fetch initial list and unread count; open Socket.IO with token; on `notification:new`, append the payload to the list (or refetch list) and increment unread count (or refetch unread count).
  - On logout: disconnect socket, clear list and count.
- **Reconnect:** If token is refreshed (e.g. after 401), the socket may need to reconnect with the new token if the backend closed the connection. Optional: listen to token changes and reconnect when token updates.

### 3.5 UI: Notification Bell and List

- **Header:** Add a notification icon (e.g. bell) next to wishlist/cart, with `IconBadge` showing `unreadCount` from the notification context/hook. Only show when `isAuthenticated`. Click opens a dropdown or navigates to a notifications page.
- **Dropdown (optional):** A small panel under the bell showing the last N notifications (e.g. 5), “Mark all read”, and a “See all” link to `/notifications`. On “mark read” or “mark all read”, call the service and then update context state (or refetch).
- **Full list page (optional):** Route `/notifications` (or `/account/notifications`) with a page that uses the same list from context (or fetches `getList` with pagination), shows title, body, time, read state, and allows mark read / mark all read. Use `referenceId` and `module` to link to order (e.g. `/orders/track/:orderId/:itemId`) when applicable.

### 3.6 Routes and Constants

- Add `ROUTES.NOTIFICATIONS` (e.g. `'/notifications'` or `'/account/notifications'`) in `src/utils/constants.js`.
- In `src/app/routes/index.jsx`, add a route for the notifications page (e.g. under MainLayout, protected by auth or redirect to login if needed).

### 3.7 Web Push (Implemented)

- **Env:** Set `VITE_VAPID_PUBLIC_KEY` (same as backend `VAPID_PUBLIC_KEY`) to enable web push.
- Request permission with `Notification.requestPermission()`.
- Use `navigator.serviceWorker.ready` and `registration.pushManager.subscribe()` with backend VAPID public key (if backend exposes it via an endpoint or env).
- Send the subscription object to `POST /notification/push-subscribe` via `notificationService.pushSubscribe(subscription)`.
- On logout or “disable notifications”, call `pushUnsubscribe(endpoint)` and/or revoke permission. This can be a later phase.

### 3.8 File and Component Checklist (To Implement When You Command)

| Item | Purpose |
|------|--------|
| `package.json` | Add dependency: `socket.io-client`. |
| `src/services/notification.service.js` | REST API: list, unread-count, mark read, mark all read, push-subscribe, push-unsubscribe. |
| `src/app/context/NotificationContext.jsx` (or hook) | State: list, unreadCount; socket connect when authenticated; listen `notification:new`; provide refreshList, refreshUnreadCount, markRead, markAllRead. |
| `src/app/App.jsx` or layout | Wrap app (or layout) with `NotificationProvider` so Header and notifications page can use the context. |
| `src/shared/ui/icons.jsx` | Add a `NotificationIcon` / bell icon if not present. |
| `src/shared/components/Header.jsx` | Use notification context; add bell + IconBadge(unreadCount); click to open dropdown or go to `/notifications`. |
| `src/features/notifications/NotificationsPage.jsx` (or similar) | Full list page: paginated list, mark read, mark all read. |
| `src/features/notifications/index.jsx` | Export and optional route entry. |
| `src/app/routes/index.jsx` | Add route for notifications page. |
| `src/utils/constants.js` | Add `ROUTES.NOTIFICATIONS`. |

---

## 4. Data Flow Summary

1. **User logs in** → Token and user are in AuthContext; axios uses token for all requests.
2. **App (or MainLayout) mounts** → NotificationProvider mounts; if token exists, it fetches `getList()` and `getUnreadCount()` and connects Socket.IO with that token.
3. **Backend creates a notification** (e.g. order confirmed) → Backend emits `notification:new` to room `user:${userId}`.
4. **Socket.IO client receives** `notification:new` → Context updates list (prepend or refetch) and unread count (increment or refetch); Header bell badge and dropdown/list update.
5. **User clicks “Mark read” or “Mark all read”** → Service calls PATCH; then context updates local state or refetches so UI is in sync.
6. **User logs out** → Socket disconnects; context clears list and count; bell/link can be hidden.

---

## 5. Backend Event Payload Reference

**Event:** `notification:new`  
**Payload (from backend):**

```json
{
  "id": "string (Mongo ObjectId)",
  "title": "string",
  "body": "string",
  "module": "string | null (e.g. 'order')",
  "referenceId": "string | null (e.g. orderId)",
  "createdAt": "ISO date string"
}
```

Use `module` and `referenceId` to build links (e.g. for `module === 'order'`, link to track order page with `referenceId` as orderId if you have itemId from elsewhere, or to orders list).

---

## 6. Order of Implementation (When You Command)

Suggested order so each step is testable:

1. Add `socket.io-client` and create `notification.service.js` (REST only); test list and unread-count with a logged-in user (e.g. from browser console or a temporary button).
2. Create NotificationContext (or hook) that fetches list and unread count when authenticated; no socket yet. Expose unreadCount and list.
3. Add notification bell and badge in Header using that context; optional dropdown with last N items and “See all” link.
4. Add Socket.IO in the same context: connect when token exists, send token in handshake, listen for `notification:new` and update list/count. Test by triggering an order confirmation (or backend test) and see badge update in real time.
5. Add `/notifications` route and full NotificationsPage; connect mark read / mark all read to the service and context.
6. (Optional) Web push: permission, subscribe, send to backend, and unsubscribe on logout.

---

**End of document. Awaiting your command to implement the code.**
