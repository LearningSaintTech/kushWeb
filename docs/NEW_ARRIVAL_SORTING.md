# New Arrival — how the newest product (e.g. "The Amara formal set") shows first

Last verified against production on **2026-10-23** (khushpehno.com → `api-prod.khushpehno.com`).

There is **no manual priority** on these products. The order comes from one query
parameter, `sort=newest`, which the web home page sends since commit `b828295`
(2026-10-22, "feat(home): New Arrival shows newest in-stock products").

---

## 1. Flow at a glance

```
HomePage.jsx
  └─ GET /api/sections/get?isWeb=true&limit=20&productLimit=24
       └─ picks the section for web slot 1  →  "NEW ARRIVAL" (CATEGORY)  id 6a0f05690ac2f4358842f1af
            └─ <NewArrivals section={…} />
                 └─ GET /api/items/search?sectionId=6a0f05690ac2f4358842f1af&page=1&limit=24&sort=newest&inStock=1
                      └─ backend: items in the section's categories, in stock, sorted newest createdAt first
                           └─ frontend hides "coming soon" items, shows the first 5
```

---

## 2. Step 1 — home page picks the section

File: `src/features/home/HomePage.jsx`

```http
GET https://api-prod.khushpehno.com/api/sections/get?isWeb=true&limit=20&productLimit=24
```

- Sections are sorted by `webinfo.webOrder` (`webOrder: 0` is treated as `1`).
- Slot `1` renders `<NewArrivals />`. When several sections share slot 1, the **last one wins**.

Live data today — three sections compete for slot 1:

| Section | Type | webOrder | Shown on web? |
|---|---|---|---|
| NEW ARRIVALS (`69c527a6…`) | MANUAL | 1 | No |
| JUST FOR YOU (`6a0f0602…`) | MANUAL | 0 → 1 | No |
| **NEW ARRIVAL** (`6a0f05690ac2f4358842f1af`) | **CATEGORY** (Men + Women) | 1 | **Yes** |

> Risk: which section wins depends on the order the API returns them. Give each
> section a unique `webOrder` (or deactivate the unused ones) to make this stable.

---

## 3. Step 2 — the exact product query

File: `src/features/home/components/NewArrivals.jsx` (`fetchUnlockedSectionProducts`)

```js
const SECTION_PAGE_SIZE = 24
const DISPLAY_COUNT = 5
const MAX_FETCH_PAGES = 4

// New Arrival = latest products that are in stock
const params = { sectionId: section._id, page, limit: SECTION_PAGE_SIZE, sort: 'newest', inStock: 1 }
if (pincode) params.pinCode = String(pincode)
const res = await itemsService.search(params)
```

`itemsService.search` (`src/services/items.service.js`) sends it as:

```http
GET https://api-prod.khushpehno.com/api/items/search
    ?sectionId=6a0f05690ac2f4358842f1af
    &page=1
    &limit=24
    &sort=newest
    &inStock=1
    [&pinCode=<user pincode, only if set>]
```

| Param | Value | Effect |
|---|---|---|
| `sectionId` | `6a0f05690ac2f4358842f1af` | CATEGORY section → backend uses its `categoryId` / `subcategoryId` (Men + Women) |
| `page`, `limit` | `1`, `24` | Page of 24 candidates (up to 4 pages if needed) |
| **`sort`** | **`newest`** | **Orders by `createdAt`, newest first. This puts Amara first.** |
| `inStock` | `1` | Removes out-of-stock items (266 → 245). Does **not** change the order. |
| `pinCode` | optional | Delivery type / warehouse availability for that pincode |

---

## 4. Step 3 — what the frontend does with the response

1. Maps each item to a card (`mapItemToCard`): `thumbnail` → image, `discountedPrice` → price.
2. `filterHomeVisibleProducts` drops locked "coming soon" items
   (`isComingSoon === true` with a future or missing `launchDate`).
3. De-duplicates by item id and keeps the **first 5** (`DISPLAY_COUNT`).
4. If page 1 doesn't give 5 visible items, it fetches page 2, 3, 4.

So **API position = display position** for the first 5 visible items.

---

## 5. Proof — the same call with and without each param

Same `sectionId`, `page=1`, `limit=24`, run against production:

| Extra params | Total | First 3 results |
|---|---|---|
| *(none)* | 266 | Shaktimaan motion block pant, shakti mode on classic denim, Shaktimaan Courage Code Jeans |
| `&sort=newest` | 266 | **The Amara formal set, Greyline Co-ord Set, Maya draped tube top** |
| `&inStock=1` | 245 | Shaktimaan motion block pant, shakti mode on classic denim, Shaktimaan Courage Code Jeans |
| `&sort=newest&inStock=1` *(what the site sends)* | 245 | **The Amara formal set, Greyline Co-ord Set, Maya draped tube top** |
| `&sort=garbage` | 266 | Shaktimaan … (unknown values are ignored) |
| `&sortBy=newest` | 266 | Shaktimaan … (param name must be `sort`) |

Live response, top 5 (= what the home page displays):

| # | Product | createdAt | totalStock | availableQuantity |
|---|---|---|---|---|
| 1 | The Amara formal set | 2026-10-19 04:52 | 0 | 300 |
| 2 | Greyline Co-ord Set | 2026-10-19 04:51 | 0 | 1200 |
| 3 | Maya draped tube top | 2026-10-19 04:51 | 0 | 600 |
| 4 | Chic halter Coat Dress | 2026-10-19 04:51 | 0 | 600 |
| 5 | Sandstone formal suit set | 2026-10-19 04:51 | 0 | 600 |

---

## 6. Why it was different before (no `sort` param)

Without `sort`, the backend's default order is (from `KhushBackend/src/modules/item/item.repository.js`, `searchItems`):

```js
{ $sort: { totalStock: -1, createdAt: -1 } }   // highest stock first, then newest
```

- `totalStock` = sum of `variants[].sizes[].stock` saved on the item itself.
- `availableQuantity` / `inStock` come from **warehouse stock** (`overlayWarehouseAvailability`).
- New items like Amara have stock only in the warehouse, so their sizes say `0` → `totalStock: 0`
  → they sorted to **#188 of 266**, below every item with size stock (e.g. Shaktimaan items at 1200).

`sort=newest` skips the stock-first rule, so these items now rank by date.

> Other listings that do **not** send `sort=newest` (search page, category pages) still use
> the stock-first default, so new warehouse-only items still sink there.

---

## 7. What decides who is first from now on

- Newest `createdAt` among **in-stock**, **not locked coming-soon** items in the
  section's categories wins.
- The next product added to Men/Women will push Amara down one place.
- To pin a product regardless of date, there is no priority field today. The options are
  a MANUAL section with hand-picked products, or a new backend sort.

---

## 8. Note on the backend source

The production API clearly supports `sort=newest` and `inStock=1` (table in section 5),
but **no branch of `LearningSaintTech/KhushBackend` on GitHub contains that code**
(checked all remote branches on 2026-10-23; the last change to item search there is
2026-08-20). The deployed backend has changes that aren't pushed. Push them, so the
repo matches what's running.
