# Khush Community — Frontend Integration Guide

Single handoff for **app / web frontend** to integrate Community (posts, reels, feed, social, saves).

**Base URL:** gateway only — e.g. `http://localhost:8080` (staging/prod URL from your env)  
**Path prefix:** `/api/community/...`  
**Auth:** `Authorization: Bearer <accessToken>` (same JWT from user OTP login)  
**Device header (auth only):** `x-device-id: <stable-device-uuid>`

| Reference | Path |
|-----------|------|
| Postman collection | `postman/khush-community-full.postman_collection.json` |
| Postman environment | `postman/khush-community-full.postman_environment.json` |
| Upload deep-dive | [`FRONTEND_FAST_UPLOAD.md`](./FRONTEND_FAST_UPLOAD.md) |
| Create flow detail | [`POST_REEL_FLOW.md`](./POST_REEL_FLOW.md) |
| QA / backend test map | [`COMMUNITY_API_FULL.md`](./COMMUNITY_API_FULL.md) |

---

## 1. Envelope & conventions

Almost all gateway responses look like:

```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

On error: `success: false`, `message` string, HTTP status as below.

| HTTP | Meaning | FE action |
|------|---------|-----------|
| 401 | Missing / expired token | Refresh or re-login |
| 403 | Not allowed (e.g. item not delivered, designer not verified, not owner) | Show `message`; if `DESIGNER_NOT_VERIFIED`, hide create |
| 404 | Not found | Empty / 404 UI |
| 422 | Validation | Highlight form fields |
| 503 | Dependency down (backend purchase / auth) | Retry later |

**Pagination (cursor):** most lists return:

```json
{
  "items": [],
  "nextCursor": "<mongoId or null>",
  "hasMore": true
}
```

Pass `cursor=<nextCursor>` on the next request. Do not invent offsets.

---

## 2. Auth (before any community call)

Use existing user auth (Postman folder **1. User Auth**).

```http
POST /api/user/auth/login
Header: x-device-id, Content-Type: application/json
{ "countryCode": "+91", "phoneNumber": "9988776655" }

POST /api/user/auth/register   // only if new user
{ "name": "...", "countryCode": "+91", "phoneNumber": "..." }

POST /api/user/auth/verify-otp
Header: x-device-id
{ "countryCode": "+91", "phoneNumber": "...", "otp": "..." }
```

From `data`: store `accessToken` and user `_id` as `userId`.

All community user APIs below need:

```http
Authorization: Bearer <accessToken>
```

Admin keyword CRUD uses a separate admin JWT (`/api/admin/...`) — **not needed for the consumer app**. Skip unless you build an admin panel.

---

## 3. Product rules (enforce in UI)

1. User can create a post/reel **only** for a product they **purchased and received** (delivered / exchange completed).
2. Always open a **product picker** from purchased-items — never free-type `itemId`.
3. Post = ≥1 image. Reel = ≥1 video (thumbnail strongly recommended).
4. Caption optional (max ~2200). Hashtags via `#tag` in caption and/or `hashtags: ["tag"]`.
5. If user is a designer and `designerVerificationStatus !== "verified"`, create APIs return **403** — disable create UI.

---

## 4. Endpoint map (what the app should call)

| # | Feature | Method | Path | Auth |
|---|---------|--------|------|------|
| 1 | Product picker | `GET` | `/api/community/purchased-items` | User |
| 2 | Presign upload | `POST` | `/api/community/uploads/presign` | User |
| 3 | Multipart part | `POST` | `/api/community/uploads/multipart/sign-part` | User |
| 4 | Multipart complete | `POST` | `/api/community/uploads/multipart/complete` | User |
| 5 | Multipart abort | `POST` | `/api/community/uploads/multipart/abort` | User |
| 6 | Publish post | `POST` | `/api/community/posts/publish` | User |
| 7 | Publish reel | `POST` | `/api/community/reels/publish` | User |
| 8 | Get content | `GET` | `/api/community/content/:id` | Optional* |
| 9 | Record view | `POST` | `/api/community/content/:id/view` | Optional |
| 10 | Edit post caption | `PATCH` | `/api/community/posts/:id` | User (owner) |
| 11 | Delete content | `DELETE` | `/api/community/content/:id` | User (owner) |
| 12 | Feed | `GET` | `/api/community/feed` | User |
| 13 | Keyword chips | `GET` | `/api/community/hashtags` | User |
| 14 | Follow | `POST` | `/api/community/follow/:userId` | User |
| 15 | Unfollow | `DELETE` | `/api/community/follow/:userId` | User |
| 16 | Own profile | `GET` | `/api/community/profile/me` | User |
| 17 | Other profile | `GET` | `/api/community/profile/:userId` | User |
| 18 | Followers | `GET` | `/api/community/profile/:userId/followers` | User |
| 19 | Following | `GET` | `/api/community/profile/:userId/following` | User |
| 20 | Like | `POST` | `/api/community/content/:id/like` | User |
| 21 | Unlike | `DELETE` | `/api/community/content/:id/like` | User |
| 22 | Add comment | `POST` | `/api/community/content/:id/comments` | User |
| 23 | List comments | `GET` | `/api/community/content/:id/comments` | User |
| 24 | Delete comment | `DELETE` | `/api/community/comments/:commentId` | User (owner) |
| 25 | Save | `POST` | `/api/community/content/:id/save` | User |
| 26 | Unsave | `DELETE` | `/api/community/content/:id/save` | User |
| 27 | List saves | `GET` | `/api/community/saves` | User |

\* Owner can see own `processing` content; others only see `published`.

### Do **not** use in production app

| Method | Path | Why |
|--------|------|-----|
| `POST` | `/api/community/posts` | Legacy multipart through API — slow, timeouts |
| `POST` | `/api/community/reels` | Same |

Use **presign → S3 → publish** only (section 6).

---

## 5. Purchased items (product picker)

```http
GET /api/community/purchased-items?limit=100
Authorization: Bearer <token>
```

**`data.items[]` (typical fields):**

| Field | Type | Use |
|-------|------|-----|
| `itemId` | string | Pass as `itemId` on publish |
| `name` | string | Title in picker |
| `imageUrl` | string | Thumbnail |
| `designedBy` / `designedById` | string | Designer attribution |
| `price` | number \| null | **Display price** (discounted if valid) |
| `originalPrice` | number \| null | Strike-through if discounted |
| `discountedPrice` | number \| null | `null` if no discount |
| `color` / `colorHex` / `size` | string | Variant hint |
| `lastPurchasedAt` | date | Optional sort/label |
| `deliveryStatus` | string | e.g. `DELIVERED` |

Empty list → user has no eligible delivered orders; hide create or show “Buy & receive a product first”.

---

## 6. Create post / reel (production flow)

```
Pick product → Compress media → Presign → Upload to S3 → Publish → Poll until published
```

Show progress on the **S3 upload** step, not on `/publish` (publish is a small JSON call).

### 6.1 Compress on device

| Posts | Reels |
|-------|--------|
| Long edge ~1080–1440px | H.264 MP4, ≤1080p |
| JPEG/WebP ~0.8 quality | Target ~20–40 MB after encode |
| Aim &lt; 1–2 MB / image | Prefer client compressor |

### 6.2 Presign

```http
POST /api/community/uploads/presign
Content-Type: application/json

{
  "purpose": "post",          // "post" | "reel" | "thumbnail"
  "mimeType": "image/jpeg",
  "fileName": "look.jpg",
  "fileSize": 850000,
  "mode": "put"               // optional; reels often return "multipart"
}
```

**`mode: "put"`** → `uploadUrl`, `key`, `headers` — `PUT` binary to S3 with those headers.  
**`mode: "multipart"`** → `uploadId`, `key`, `partSize` — chunk upload (section 6.3).

### 6.3 Multipart (reels / large files)

1. Split file into chunks of `partSize`.
2. For each part `n` (1-based):
   - `POST /api/community/uploads/multipart/sign-part` `{ "key", "uploadId", "partNumber": n }`
   - `PUT` chunk to returned `uploadUrl`
   - Keep `ETag` from S3 response
3. `POST /api/community/uploads/multipart/complete`  
   `{ "key", "uploadId", "parts": [{ "PartNumber": 1, "ETag": "..." }, ...] }`
4. Cancel: `POST .../multipart/abort` `{ "key", "uploadId" }`

Upload 3–4 parts in parallel for speed.

### 6.4 Publish

**Post**

```http
POST /api/community/posts/publish
{
  "itemId": "<from purchased-items>",
  "caption": "Loved this #khush",
  "hashtags": ["khush"],
  "media": [
    { "key": "<presign key>", "mimeType": "image/jpeg", "kind": "image" }
  ]
}
```

**Reel**

```http
POST /api/community/reels/publish
{
  "itemId": "<from purchased-items>",
  "caption": "Unboxing #ootd",
  "hashtags": ["ootd"],
  "video": { "key": "<reel key>", "mimeType": "video/mp4" },
  "thumbnail": { "key": "<thumb key>", "mimeType": "image/jpeg" }
}
```

Expect **202** / `data.status === "processing"`. Save `data._id`.

### 6.5 Poll until published

```http
GET /api/community/content/:id
```

| `status` | UI |
|----------|-----|
| `processing` | “Posting…” — poll every 1–2s, timeout ~30–60s |
| `published` | Success — navigate to feed/profile |
| `draft` | Fail — incomplete upload |

### 6.6 Edit / delete

```http
PATCH /api/community/posts/:id
{ "caption": "Updated caption only" }
# Own posts only. Media / itemId not editable here.

DELETE /api/community/content/:id
# Own post or reel
```

---

## 7. Content object (feed, detail, profile, saves)

Shared shape for a post/reel in lists and detail:

```json
{
  "_id": "...",
  "authorId": "...",
  "type": "post",
  "caption": "...",
  "hashtags": ["khush"],
  "itemId": "...",
  "itemName": "...",
  "designedBy": "...",
  "designedById": "...",
  "media": [
    {
      "url": "https://...",
      "key": "...",
      "mimeType": "image/jpeg",
      "kind": "image"
    }
  ],
  "status": "published",
  "likeCount": 0,
  "commentCount": 0,
  "viewCount": 0,
  "createdAt": "...",
  "updatedAt": "...",
  "isLiked": false,
  "isSaved": false,
  "authorRole": "designer",
  "authorName": "Ada",
  "authorUsername": "ada",
  "item": {
    "itemId": "...",
    "name": "Silk Kurta",
    "productId": "...",
    "designedBy": "...",
    "designedById": "...",
    "imageUrl": "https://...",
    "price": 1499,
    "originalPrice": 1999,
    "discountedPrice": 1499,
    "discountPercentage": 25,
    "color": "Ivory",
    "colorHex": "#FFFFF0",
    "size": "M"
  }
}
```

### Product card (`item`) — display rules

| Field | Rule |
|-------|------|
| `price` | **Always show this** as the selling price |
| `discountedPrice` | Non-null and &gt; 0 means discount applied; `price` already equals this |
| `originalPrice` | Show as MRP / strike-through when `discountedPrice != null` |
| `imageUrl` | Product image (catalog default / first variant) |
| `color` / `colorHex` / `size` | Variant labels on product chip |
| `item` | May be `null` if catalog enrichment failed — fall back to `itemName` + content media |

`authorRole`: `"designer"` if designer, else `"creator"` if creator, else `null`.

`media[].kind`: `image` | `video` | `thumbnail`. Prefer `thumbnail` / first image for grid; use `video` for reels player.

---

## 8. Feed, search, reels

```http
GET /api/community/feed?scope=following&type=all&limit=20
GET /api/community/feed?scope=explore&type=all&limit=20
GET /api/community/feed?scope=explore&type=post&limit=20
GET /api/community/feed?scope=explore&type=reel&limit=8
GET /api/community/feed?scope=explore&q=summer%20vibes&limit=20
GET /api/community/feed?scope=explore&hashtag=khush&limit=20
GET /api/community/feed?scope=explore&itemId=<id>&limit=20
GET /api/community/feed?scope=explore&type=all&limit=20&cursor=<nextCursor>
```

| Query | Values | Notes |
|-------|--------|--------|
| `scope` | `following` (default), `explore` | Following = people you follow; explore = everyone (excludes your own) |
| `type` | `all`, `post`, `reel` | Reels tab → `type=reel` |
| `q` / `keyword` / `search` | string | Free-text: caption, hashtags, itemName |
| `hashtag` | string | Exact tag match |
| `itemId` | MongoId | Filter by product |
| `limit` | 1–50 | Default 20 |
| `cursor` | MongoId | From previous `nextCursor` |

**Response `data`:** `{ items, nextCursor, hasMore, scope }` — each item includes `item`, `isLiked`, `isSaved`, author fields.

### Reels viewer (client)

1. `GET .../feed?scope=explore&type=reel&limit=8`
2. Vertical scroll-snap; play **only** the active reel; keep ±1 mounted
3. Prefetch next page when ~3 from end (`cursor=nextCursor`)
4. Poster from thumbnail media; after ~1.5s watched → `POST /content/:id/view`
5. Like / save with optimistic UI on existing endpoints

### Keyword chips

```http
GET /api/community/hashtags
```

Use returned active keywords as chips; tapping a chip → `GET /feed?scope=explore&q=<keyword>`.

---

## 9. Follow & profile

```http
POST   /api/community/follow/:userId
DELETE /api/community/follow/:userId
```

Idempotent. Cannot follow yourself (**400**).

```http
GET /api/community/profile/me?postsLimit=12&reelsLimit=12&productsLimit=20
GET /api/community/profile/:userId?postsLimit=12&reelsLimit=12&productsLimit=20
GET /api/community/profile/:userId/followers?limit=20&cursor=...
GET /api/community/profile/:userId/following?limit=20&cursor=...
```

**Profile `data` highlights:**

| Field | Meaning |
|-------|---------|
| `fullName`, `username`, `shortBio`, `profileImage` | Header |
| `isCreator`, `isDesigner`, `designerVerificationStatus` | Badges / create gate |
| `counts.followers` / `following` / `posts` | `posts` = published posts **+** reels |
| `isFollowing`, `isOwnProfile` | CTA button |
| `posts[]`, `reels[]` | Grids — each content includes `item` card |
| `postsNextCursor` / `reelsNextCursor` / `*HasMore` | Paginate tabs |
| `taggedProducts[]` | Curated Picks — products tagged in their content |

**`taggedProducts[]` fields:** `itemId`, `itemName`, `imageUrl`, `price`, `originalPrice`, `discountedPrice`, `color`, `size`, `likeCount`, `viewCount`, `contentCount`, `item` (full card when available).

---

## 10. Like / comment / save

Same `contentId` for posts and reels.

```http
POST   /api/community/content/:contentId/like
DELETE /api/community/content/:contentId/like

POST   /api/community/content/:contentId/comments
{ "text": "Love this look" }

GET    /api/community/content/:contentId/comments?limit=20&cursor=...

DELETE /api/community/comments/:commentId

POST   /api/community/content/:contentId/save
DELETE /api/community/content/:contentId/save

GET    /api/community/saves?limit=20
GET    /api/community/saves?type=post&limit=20
GET    /api/community/saves?type=reel&limit=20
```

| Query `type` | Meaning |
|--------------|---------|
| `all` (default) | Mixed |
| `post` | Saved posts only |
| `reel` | Saved reels only |

Saves response items: `{ saveId, savedAt, content: { ...contentObject, isSaved: true, item } }`.

Like/save are idempotent. Prefer optimistic UI; reconcile with counters from next GET.

---

## 11. Screen → API checklist

| Screen | APIs |
|--------|------|
| Login | Auth login → verify-otp |
| Create → picker | `GET purchased-items` |
| Create → upload | `presign` → S3 → `publish` → poll `GET content/:id` |
| Home following | `GET feed?scope=following` |
| Explore | `GET feed?scope=explore` (+ `q` / hashtag chips) |
| Reels tab | `GET feed?type=reel` + view / like / save |
| Content detail | `GET content/:id` |
| Edit caption | `PATCH posts/:id` |
| Profile (me / other) | `profile/me` or `profile/:userId` |
| Followers / following | profile `.../followers` / `.../following` |
| Follow button | `POST` / `DELETE follow/:userId` |
| Saved | `GET saves?type=...` |
| Product chip on post | Use `item.price`, `item.imageUrl`, color/size |

---

## 12. Pseudo-code (publish)

```js
async function createPost({ itemId, caption, hashtags, imageFile }) {
  const compressed = await compressImage(imageFile);

  const session = await api.post("/api/community/uploads/presign", {
    purpose: "post",
    mimeType: compressed.mimeType,
    fileName: compressed.name,
    fileSize: compressed.size,
    mode: "put",
  });

  await fetch(session.uploadUrl, {
    method: "PUT",
    headers: session.headers,
    body: compressed.blob,
  });

  const created = await api.post("/api/community/posts/publish", {
    itemId,
    caption,
    hashtags,
    media: [{ key: session.key, mimeType: compressed.mimeType, kind: "image" }],
  });

  return waitUntilPublished(created._id); // poll GET /content/:id
}
```

Full reel multipart: see [`FRONTEND_FAST_UPLOAD.md`](./FRONTEND_FAST_UPLOAD.md).

---

## 13. Out of scope (not in API yet)

- Server-side video transcoding / HLS
- Auto thumbnail generation (client should send thumbnail)
- Admin keyword management in consumer app

---

## 14. FE delivery checklist

- [ ] Gateway base URL + auth token flow
- [ ] This doc + fast-upload doc shared with app team
- [ ] S3 CORS allows app origins (`PUT`, expose `ETag`)
- [ ] Test user with ≥1 **delivered** purchase
- [ ] Product picker from `purchased-items` only
- [ ] Create via **presign → S3 → publish** (not legacy multipart)
- [ ] Upload progress on S3; poll until `published`
- [ ] Feed uses `item.price` (discount-aware) + `item.imageUrl` / color / size
- [ ] Reels: `type=reel`, cursor pages, active-only playback
- [ ] Saves: `type=post|reel` if separate tabs
- [ ] Designer gate: hide create when not verified

That’s the complete frontend integration package for Community.
