const BEGIN_CHECKOUT_KEY = "khush_begin_checkout_tracked";
const ADD_TO_CART_DEDUPE_MS = 5000;

/**
 * Meta Pixel events are fired here via fbq (not Meta Event Setup Tool button rules).
 * autoConfig is disabled in index.html so Meta does not auto-track button clicks (duplicates).
 * In Events Manager → delete any automatic "Event Setup Tool" rules to avoid duplicates.
 *
 * Funnel mapping:
 * - PageView        → every route (MainLayout)
 * - ViewContent     → product page
 * - AddToCart       → "Add To Cart" + "Buy It Now" on PDP; cart icon on product cards
 * - ViewCart        → /cart
 * - InitiateCheckout→ cart "Checkout" button (not "Add new address")
 * - AddPaymentInfo  → place order on /checkout
 * - Purchase        → /order/thank-you (NOT /orders)
 */

function logPixel(event, payload) {
  if (!import.meta.env.DEV) return;
  console.info("[Meta Pixel]", event, payload ?? "");
}

export function parsePrice(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function buildEcommerceItem({ id, name, price, quantity = 1, variant }) {
  return {
    item_id: id != null ? String(id) : undefined,
    item_name: name ?? undefined,
    price: price != null ? Number(price) : undefined,
    quantity: Number(quantity) || 1,
    item_variant: variant != null ? String(variant) : undefined,
  };
}

/** Line item shape for Meta contents payloads. */
export function cartRowToEcommerceItem(row) {
  const item = row?.itemId;
  const id = item?._id ?? item?.id ?? row?.guestProductId ?? row?.id;
  return buildEcommerceItem({
    id,
    name: item?.name ?? row?.title,
    price: row?.unitPrice != null ? Number(row.unitPrice) : undefined,
    quantity: row?.quantity ?? 1,
    variant: row?.variant?.sku,
  });
}

function trackMeta(event, payload = {}, options) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    if (import.meta.env.DEV) {
      logPixel(`${event} (fbq missing — set VITE_META_PIXEL_ID in .env)`, payload);
    }
    return;
  }
  if (options) {
    window.fbq("track", event, payload, options);
  } else {
    window.fbq("track", event, payload);
  }
  logPixel(event, payload);
}

function trackMetaCustom(event, payload = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    if (import.meta.env.DEV) {
      logPixel(`${event} (fbq missing — set VITE_META_PIXEL_ID in .env)`, payload);
    }
    return;
  }
  window.fbq("trackCustom", event, payload);
  logPixel(`Custom:${event}`, payload);
}

export function trackPixelPageView(pagePath) {
  trackMeta("PageView", pagePath ? { page_path: pagePath } : {});
}

export function trackPixelViewItem({ id, name, price, currency = "INR" }) {
  const value = parsePrice(price);
  trackMeta("ViewContent", {
    content_type: "product",
    content_ids: id ? [String(id)] : [],
    content_name: name,
    value,
    currency,
  });
}

export function trackPixelAddToCart({
  id,
  name,
  price,
  quantity = 1,
  currency = "INR",
}) {
  const productId = id != null ? String(id) : "unknown";
  const qty = Number(quantity) || 1;
  const dedupeKey = `khush_atc_${productId}_${qty}`;
  const now = Date.now();

  try {
    const last = sessionStorage.getItem(dedupeKey);
    if (last && now - Number(last) < ADD_TO_CART_DEDUPE_MS) {
      if (import.meta.env.DEV) {
        logPixel("AddToCart skipped (dedupe)", { id: productId, quantity: qty });
      }
      return;
    }
    sessionStorage.setItem(dedupeKey, String(now));
  } catch {
    // ignore storage errors
  }

  const unitPrice = parsePrice(price);
  const value = unitPrice * qty;
  const eventID = `add_to_cart_${productId}_${Math.floor(now / ADD_TO_CART_DEDUPE_MS)}`;

  trackMeta(
    "AddToCart",
    {
      content_type: "product",
      content_ids: id ? [productId] : [],
      contents: id ? [{ id: productId, quantity: qty }] : [],
      content_name: name,
      value,
      currency,
    },
    { eventID },
  );
}

export function trackPixelViewCart({ items, value, currency = "INR" }) {
  const contentIds = (items || [])
    .map((row) => row.item_id ?? row.id)
    .filter(Boolean);
  trackMetaCustom("ViewCart", {
    content_type: "product",
    content_ids: contentIds,
    value: value != null ? Number(value) : undefined,
    currency,
    num_items: (items || []).reduce(
      (sum, row) => sum + (Number(row?.quantity) || 1),
      0,
    ),
  });
}

export function trackPixelRemoveFromCart({ id, name, price, quantity = 1, currency = "INR" }) {
  const qty = Number(quantity) || 1;
  trackMetaCustom("RemoveFromCart", {
    content_type: "product",
    content_ids: id ? [String(id)] : [],
    content_name: name,
    value: parsePrice(price) * qty,
    currency,
    num_items: qty,
  });
}

export function trackPixelBeginCheckout({
  items,
  value,
  currency = "INR",
  numItems,
}) {
  const parsedValue = parsePrice(value);
  const count =
    numItems ??
    (Array.isArray(items)
      ? items.reduce((sum, row) => sum + (Number(row?.quantity) || 1), 0)
      : 0);
  trackMeta("InitiateCheckout", {
    value: parsedValue,
    currency,
    num_items: count,
    content_type: "product",
    contents: (items || [])
      .map((row) => ({
        id: row.item_id ?? row.id,
        quantity: row.quantity ?? 1,
      }))
      .filter((row) => row.id),
  });
}

/** Meta InitiateCheckout once per checkout session. */
export function trackPixelBeginCheckoutOnce(params) {
  if (typeof sessionStorage !== "undefined") {
    if (sessionStorage.getItem(BEGIN_CHECKOUT_KEY)) {
      if (import.meta.env.DEV) {
        logPixel("InitiateCheckout skipped (already tracked this session)");
      }
      return false;
    }
    sessionStorage.setItem(BEGIN_CHECKOUT_KEY, "1");
  }
  trackPixelBeginCheckout(params);
  return true;
}

export function trackPixelAddPaymentInfo({ value, currency = "INR", contents }) {
  trackMeta("AddPaymentInfo", {
    value: parsePrice(value),
    currency,
    content_type: "product",
    contents,
  });
}

export function trackPixelPurchase(conversion) {
  const value = Number(conversion?.value || 0);
  const currency = conversion?.currency || "INR";
  const items = Array.isArray(conversion?.items) ? conversion.items : [];
  const contentIds = items.map((row) => row.id).filter(Boolean);
  const contents = items.map((row) => ({
    id: row.id,
    quantity: row.quantity ?? 1,
  }));
  const numItems =
    conversion?.numItems ??
    contents.reduce((sum, row) => sum + (row.quantity || 1), 0);

  trackMeta(
    "Purchase",
    {
      value,
      currency,
      content_type: "product",
      content_ids: contentIds,
      contents,
      num_items: numItems,
    },
    { eventID: String(conversion.orderId) },
  );
}
