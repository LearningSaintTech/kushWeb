# Explore & Search Flows – Phase Summary

This doc describes how every "Explore" / "Explore More" entry point and the Header (menu + search bar) work so that section explore and search screens behave correctly.

---

## 1. Routes

| Route | Purpose |
|-------|--------|
| `/` | Home (sections by `webOrder`) |
| `/search` | Search/filter page: keyword `q`, `categoryId`, `subcategoryId`, `page`, `filters` |
| `/section/:sectionId` | Section explore: one section’s title + products (MANUAL/FLASH by sectionId, CATEGORY by first categoryId) |

Helpers in `utils/constants.js`:

- `getProductPath(id)` → `/product/:id`
- `getSectionExplorePath(sectionId)` → `/section/:sectionId` or `/search` if no id

---

## 2. Home → Explore buttons

| Component | "Explore" / "Explore More" target |
|-----------|-----------------------------------|
| **NewArrivals** | `getSectionExplorePath(section?._id)` → `/section/:sectionId` or `/search` |
| **Couples** | `section?._id ? getSectionExplorePath(section._id) : '/search?category=couple'` |
| **Collection** | Header "Explore More" → `ROUTES.SEARCH` (`/search`). Grid cards → `/search?categoryId=${cat._id}` |
| **OurCategory** | Card links → `/search?categoryId=...` or `/search?subcategoryId=...` |
| **OurProduct** | "Explore More" → `/search?categoryId=${section.categories[0]._id}` or `/search` |
| **BestSellar** | (no Explore link in component) |

All section-based Explore links that have a `section._id` go to **Section Explore** (`/section/:sectionId`). Category/collection links go to **Search** with `categoryId` or `subcategoryId`.

---

## 3. Header

- **Menu (hamburger)**  
  Category/subcategory links use `getSearchUrl({ categoryId, subcategoryId })` →  
  `/search?categoryId=...` and optionally `&subcategoryId=...`.  
  Same URL shape that SearchPage expects.

- **Search bar**  
  Submits to `ROUTES.SEARCH` with query `q`: `/search?q=...`.  
  Search modal "Recent" / "Popular" also navigate to `/search?q=...`.

---

## 4. Section Explore Page (`/section/:sectionId`)

- **Section load**  
  `sectionsService.getSingle(sectionId)` for title and type.

- **Products load**
  - **MANUAL / FLASH**: `itemsService.search({ sectionId, page, limit, pinCode })`. Backend resolves `sectionId` to item IDs.
  - **CATEGORY**: `itemsService.search({ categoryId: section.categoryId[0], page, limit, pinCode })`. Uses first category only; "Explore more in search" link goes to `/search?categoryId=...`.

- **UI**  
  Back to home, section title, product grid, pagination. For CATEGORY sections, an extra link to search with that category.

---

## 5. Search Page (`/search`)

- **URL params**  
  `q`, `categoryId` (or `category`), `subcategoryId` (or `subcategory`), `page`, `filters`.

- **API**  
  `itemsService.search({ keyword: q, categoryId, subcategoryId, page, limit, filters, pinCode })`.

- **Entry points**  
  Header menu (category/subcategory), Header search (keyword), Home Collection/OurCategory/OurProduct links, and Section Explore "Explore more in search" (for CATEGORY sections).

---

## 6. Flow checklist

- [x] Home section Explore (NewArrivals, Couples, etc.) with `section._id` → `/section/:sectionId` (SectionExplorePage).
- [x] Home section Explore without section or category-based blocks → `/search` or `/search?categoryId=...` / `?subcategoryId=...`.
- [x] Collection "Explore More" → `/search`.
- [x] Collection grid cards → `/search?categoryId=...`.
- [x] Header menu category/subcategory → `/search?categoryId=...&subcategoryId=...`.
- [x] Header search bar / modal → `/search?q=...`.
- [x] Section Explore page works for MANUAL, FLASH, and CATEGORY section types.
- [x] Single source for section URL: `getSectionExplorePath(sectionId)` in constants.

---

## 7. File reference

| Area | Files |
|------|--------|
| Routes | `app/routes/index.jsx` |
| Constants | `utils/constants.js` (ROUTES, getProductPath, getSectionExplorePath) |
| Section explore | `features/sectionExplore/SectionExplorePage.jsx` |
| Search | `features/search/SearchPage.jsx` |
| Header | `shared/components/Header.jsx` (getSearchUrl, ROUTES.SEARCH) |
| Home sections | `features/home/components/NewArrivals.jsx`, `Couples.jsx`, `Collection.jsx`, `OurCategory.jsx`, `OurProduct.jsx` |
