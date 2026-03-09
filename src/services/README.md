# API Services

Central API layer for khushWeb. All requests go through an axios instance with auth and debug interceptors.

## Setup

1. Copy `.env.example` to `.env` in the project root.
2. Set `VITE_API_URL` to your backend base URL (e.g. `http://192.168.1.13:5000/api`).
3. Optional: set `VITE_DEBUG=true` to log every request/response in the console (or rely on dev mode).
4. Run `npm install` (adds `axios`).

## Usage

```js
import {
  apiClient,
  authService,
  itemsService,
  setAccessTokenGetter,
  setOnUnauthorized,
  ACCESS_TOKEN_KEY,
} from './services'
// or from '@/services' if alias is set

// Use services (responses are axios response objects; use .data for body)
const { data } = await itemsService.search({ q: 'shirt' })
await authService.login({ countryCode: '+91', phoneNumber: '9999999999' })

// Token: by default read from localStorage key ACCESS_TOKEN_KEY.
// To use a different source (e.g. React context), set a getter:
setAccessTokenGetter(() => myAuthContext.accessToken)

// 401 handling (e.g. refresh token or redirect to login):
setOnUnauthorized((response, error) => {
  // try refresh then retry, or redirect to /auth
})
```

## Structure

| File | Role |
|------|------|
| `config.js` | `API_BASE_URL`, `isDebug()` |
| `axiosClient.js` | Axios instance, request/response interceptors (auth header, debug logs, 401 hook) |
| `*.service.js` | One file per backend module; each exports methods that call the client |
| `index.js` | Re-exports config, client, and all services |

## Debug mode

When `isDebug()` is true (dev or `VITE_DEBUG=true`), interceptors log:

- **Request:** `[API Request]` with method, url, params, body.
- **Response:** `[API Response]` with method, url, status, data.
- **Error:** `[API Error]` with method, url, status, data, message.

No logs are emitted in production unless `VITE_DEBUG=true` is set in the build env.
