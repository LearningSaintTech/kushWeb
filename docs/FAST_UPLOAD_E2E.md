# Fast upload — full path (UI → APIs → services)

This is exactly what the **dummy UI “Fast (presign)”** button does for a **Post**.  
(Reel is the same idea; video may use multipart chunks.)

---

## 0. Picture of the system

```
┌──────────────────┐
│  Browser UI      │  http://localhost:5173
│  (Vite React)    │
└────────┬─────────┘
         │  /api/*  (Vite proxy)
         ▼
┌──────────────────┐
│  API Gateway     │  :8080
└────────┬─────────┘
         │
    ┌────┴─────┬──────────────┐
    ▼          ▼              ▼
 Auth:3001  Community:3003  Backend:3002
    │            │               │
    │            │               │ Mongo: khush (orders/items)
    │            │ Mongo: community_db
    │            │
    │            └──► AWS S3 (file bytes go HERE from browser)
    │                   (+ CloudFront URL for reading)
    └── Redis (OTP)
```

**Important rule of Fast mode:**

- Small JSON APIs → Gateway → Community (and sometimes Backend)
- **Heavy file bytes → Browser → S3 directly** (not through Community)

---

## 1. Before Create — UI setup (not the upload yet)

### 1A. Login

| UI | API | Who handles it |
|----|-----|----------------|
| Send OTP | `POST /api/user/auth/login` | Gateway → **Auth** |
| Verify OTP | `POST /api/user/auth/verify-otp` | Gateway → **Auth** |

Auth returns `accessToken`. UI stores it and sends:

```http
Authorization: Bearer <accessToken>
```

on every community call.

### 1B. Load products

| UI | API | Who |
|----|-----|-----|
| Load purchased items | `GET /api/community/purchased-items` | Gateway → **Community** → **Backend** internal |

Community asks Backend: “which items did this user get DELIVERED?”  
You tap one product → UI keeps `itemId`.

Without a delivered `itemId`, upload will fail with 403.

---

## 2. You click “Create post (fast)”

UI function: `createFast()` in `khush-community-demo-ui/src/App.jsx`.

For **each image**, these steps run in order.

---

### STEP A — Compress in the browser (no server)

```
UI: compressImage(file)  →  canvas JPEG, smaller size
```

- Happens **only in the browser**
- No API call
- Makes upload faster (smaller file)

---

### STEP B — Ask for a gate pass (PRESIGN) = Postman **4b.1**

**UI calls:**

```http
POST http://localhost:5173/api/community/uploads/presign
     └─ Vite proxy ─► http://localhost:8080/api/community/uploads/presign
        └─ Gateway ─► http://localhost:3003/api/community/uploads/presign
```

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (example)**

```json
{
  "purpose": "post",
  "mimeType": "image/jpeg",
  "fileName": "look.jpg",
  "fileSize": 420000,
  "mode": "put"
}
```

**What Community does** (`createUploadSession`):

1. Check JWT → get `userId`
2. Validate purpose/mime
3. Build S3 key owned by that user, e.g.  
   `community/posts/{userId}/{uuid}-look.jpg`
4. Ask AWS SDK for a **presigned PUT URL** (valid ~15 min)
5. Return JSON (no file uploaded yet)

**Response (example)**

```json
{
  "mode": "put",
  "key": "community/posts/USERID/uuid-look.jpg",
  "uploadUrl": "https://khush-prod.s3.ap-south-1.amazonaws.com/...?X-Amz-Signature=...",
  "publicUrl": "https://d2efmszmuu4pfy.cloudfront.net/community/posts/...",
  "headers": {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable"
  },
  "expiresIn": 900
}
```

At this point: **S3 still empty**. You only have permission to upload.

---

### STEP C — Upload file to S3 (NOT your API)

**UI calls:**

```http
PUT {uploadUrl}          ← Amazon S3 URL, NOT localhost
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable

<binary image bytes>
```

Path:

```
Browser  ──────────────────────────►  AWS S3 bucket (khush-prod)
         (does NOT go through
          Vite / Gateway / Community)
```

- This is the heavy step
- Progress bar should track **this** step
- Needs valid AWS keys on Community (only for signing), and S3 CORS for browser PUT

When this returns 200 → file is sitting in S3 at `key`.

---

### STEP D — Publish post (tiny JSON) = Postman **4b.2**

**UI calls:**

```http
POST /api/community/posts/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "itemId": "6655...",
  "caption": "Demo from UI #khush",
  "hashtags": ["khush", "demo"],
  "media": [
    {
      "key": "community/posts/USERID/uuid-look.jpg",
      "mimeType": "image/jpeg",
      "kind": "image"
    }
  ]
}
```

Again: Vite → Gateway → Community. Body is small (no photo).

**What Community does** (`publishPostFromKeys`):

1. Verify JWT  
2. Call **Backend** internal:  
   `POST /internal/purchases/verify`  
   `{ userId, itemId }`  
   → must be DELIVERED (+ payment SUCCESS/COLLECTED)  
3. Check `key` belongs to this user (`community/posts/{userId}/...`)  
4. Build public URL from key (CloudFront/S3)  
5. Insert Mongo doc in **community_db**:

```json
{
  "authorId": "...",
  "type": "post",
  "itemId": "...",
  "itemName": "...",
  "designedBy": "...",
  "media": [{ "url", "key", "mimeType", "kind": "image" }],
  "status": "processing"
}
```

6. Return **202** immediately  
7. Background: `HeadObject` on S3 → if file exists → `status: "published"`

**Response (example)**

```json
{
  "success": true,
  "message": "Post accepted — processing media",
  "data": {
    "_id": "68abc...",
    "status": "processing",
    "type": "post",
    "media": [...]
  }
}
```

---

### STEP E — UI polls until live

```http
GET /api/community/content/{_id}
Authorization: Bearer <token>
```

- Author can see own `processing` item  
- When `status === "published"` → success  
- Feed only shows `published`

```http
GET /api/community/feed?type=all
```

---

## 3. End-to-end sequence (Post, Fast)

```
 UI                Vite:5173         Gateway:8080      Community:3003       Backend:3002        S3
 │                    │                   │                  │                   │               │
 │── compress ────────┤                   │                  │                   │               │
 │                    │                   │                  │                   │               │
 │── POST /uploads/presign ──────────────►│─────────────────►│                   │               │
 │◄── uploadUrl + key ────────────────────│◄─────────────────│ (sign URL)        │               │
 │                    │                   │                  │                   │               │
 │── PUT uploadUrl ─────────────────────────────────────────────────────────────────────────────►│
 │◄── 200 ──────────────────────────────────────────────────────────────────────────────────────│
 │                    │                   │                  │                   │               │
 │── POST /posts/publish ────────────────►│─────────────────►│── verify purchase ►│               │
 │                    │                   │                  │◄── purchased:true ─│               │
 │                    │                   │                  │── save processing  │               │
 │◄── 202 + _id ──────────────────────────│◄─────────────────│                   │               │
 │                    │                   │                  │── HeadObject ─────────────────────►│
 │                    │                   │                  │── status=published │               │
 │── GET /content/:id ───────────────────►│─────────────────►│                   │               │
 │◄── published ──────────────────────────│◄─────────────────│                   │               │
 │── GET /feed ──────────────────────────►│─────────────────►│                   │               │
```

---

## 4. Reel Fast (same idea)

| Step | API | Like |
|------|-----|------|
| Compress (optional) | client | — |
| Presign | `POST /uploads/presign` purpose=`reel` | **4b.3** |
| If `mode=multipart` | `sign-part` → PUT chunk(s) → `complete` | **4b.4** + complete |
| If `mode=put` | one PUT to S3 | like post |
| Optional thumb | presign purpose=`thumbnail` + PUT | — |
| Publish | `POST /reels/publish` with `video.key` | **4b.5** |
| Poll | `GET /content/:id` | — |

Dummy UI forces small videos to `mode: "put"` when under ~8 MB so you see a simple path.

---

## 5. What each service is responsible for

| Service | Role in Fast upload |
|---------|---------------------|
| **UI** | Compress, call APIs, PUT file to S3, poll |
| **Vite** | Proxy `/api` → gateway (avoids CORS to :8080 for JSON) |
| **Gateway** | Route `/api/community/*` → community :3003 |
| **Community** | AuthZ, presign, publish, Mongo content, S3 HeadObject |
| **Backend** | Answer “is this item delivered for this user?” |
| **S3** | Store the actual image/video bytes |
| **CloudFront** | Serve media URLs when reading feed |

---

## 6. Map: Dummy UI log → this doc

| You see in Flow log | This step |
|---------------------|-----------|
| COMPRESS | Step A |
| POST /uploads/presign | Step B (4b.1) |
| PUT → S3 (direct) | Step C |
| POST /posts/publish | Step D (4b.2) |
| Poll #N status=… | Step E |
| Feed has N item(s) | Live |

---

## 7. One sentence summary

**Fast mode = browser asks Community for a temporary S3 upload URL, uploads the file straight to S3, then tells Community “save a post with this S3 key + this delivered product”; Community checks purchase, saves the post, verifies the file, and shows it on the feed.**
