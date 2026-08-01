# API Services

Central API layer for kushWeb. All requests go through an axios instance with auth, refresh, and debug interceptors.

## Setup

1. Run `npm install`.
2. API URL is set per Vite mode (see `.env.example`):
   - `npm run dev` → `.env.development` → `http://localhost:5000`
   - `npm run build:staging` → `.env.staging` → `https://apidev.khushpehno.com`
   - `npm run build` → `.env.production` → `https://api.khushpehno.com`
3. For local secrets (Maps key, Meta Pixel), use `.env.local` (gitignored).
4. Set `VITE_DEBUG=false` in staging/production CI builds.

## Usage

```js
import { apiClient, authService, itemsService } from './services'

// Responses are axios response objects; use .data for body
const { data } = await itemsService.search({ q: 'shirt' })
await authService.login({ countryCode: '+91', phoneNumber: '9999999999' })
```

## Auth model

| Token | Storage |
|-------|---------|
| Access JWT | **Memory only** (`tokenMemory.js` via `AuthContext`) |
| Refresh JWT | **httpOnly cookie** (`withCredentials: true`) |

- Boot: `AuthContext` calls `POST /user/auth/newAccessToken` if memory is empty or `exp` passed, then loads profile.
- 401: `axiosClient` silently refreshes once, retries the request; on failure calls `performLogout({ server: true })`.
- `ACCESS_TOKEN_KEY` / `setOnUnauthorized` are deprecated exports kept for compatibility — do not use localStorage for tokens.

## Structure

| File | Role |
|------|------|
| `config.js` | `API_BASE_URL`, `API_ORIGIN`, `isDebug()` |
| `axiosClient.js` | Axios instance, Bearer header, device id, 401 refresh, rate-limit messages |
| `auth.service.js` | User auth endpoints; DEV-only redacted debug logs |
| `communityProfile.service.js` | Creator/designer onboarding (`/user/community-profile`) |
| `community.service.js` | Community feed/social (`/community/*`) — feed, like, save, follow, comments |
| `communityUpload.service.js` | Fast upload: compress → presign → S3 → publish → poll |
| `communityApi.js` | Shared unwrap / wrap / `[Community]` debug logs |
| `*.service.js` | One file per backend module |
| `index.js` | Re-exports config, client, and all services |

## Debug mode

| Environment | Console / API logs |
|-------------|-------------------|
| **Dev** (`npm run dev`) | On by default; set `VITE_DEBUG=false` to silence |
| **Prod build** | Off unless `VITE_DEBUG=true` at build time |

- `isDebug()` gates `debugLog` / axios interceptors / auth logs.
- `silenceConsoleUnlessDebug()` runs at boot in `main.jsx` and no-ops all `console.*` when not in debug.
- Production builds also strip `console` via Vite `esbuild.drop` unless `VITE_DEBUG=true`.
- Missing `VITE_API_URL` in prod logs a one-time boot warning before silencing.
