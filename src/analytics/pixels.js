import { pushToDataLayer } from "./tracker.js";

const BEGIN_CHECKOUT_KEY = "khush_begin_checkout_tracked";

function logPixel(channel, event, payload) {
  if (!import.meta.env.DEV) return;
  console.info(`[Pixels:${channel}]`, event, payload ?? "");
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

/** GA4-friendly line item from cart API row or guest cart row. */
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

/** GA4 requires clearing ecommerce before each new ecommerce event in dataLayer. */
function pushEcommerceEvent(payload) {
  pushToDataLayer({ ecommerce: null });
  pushToDataLayer(payload);
  logPixel("dataLayer", payload?.event, payload);
}

function trackSnap(event, payload = {}) {
  if (typeof window !== "undefined" && typeof window.snaptr === "function") {
    window.snaptr("track", event, payload);
    logPixel("snap", event, payload);
  } else if (import.meta.env.DEV) {
    logPixel("snap", `${event} (snaptr missing)`, payload);
  }
}

function trackMeta(event, payload = {}, options) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (options) {
      window.fbq("track", event, payload, options);
    } else {
      window.fbq("track", event, payload);
    }
    logPixel("meta", event, payload);
  } else if (import.meta.env.DEV) {
    logPixel("meta", `${event} (fbq missing)`, payload);
  }
}

export function trackPixelPageView(pagePath) {
  const payload = {
    event: "page_view",
    page_path: pagePath,
  };
  pushToDataLayer(payload);
  logPixel("dataLayer", payload.event, payload);
  trackSnap("PAGE_VIEW");
}

export function trackPixelViewItem({ id, name, price, currency = "INR" }) {
  const value = parsePrice(price);
  const item = buildEcommerceItem({ id, name, price: value, quantity: 1 });
  pushEcommerceEvent({
    event: "view_item",
    ecommerce: { currency, value, items: [item] },
  });
  trackMeta("ViewContent", {
    content_type: "product",
    content_ids: id ? [String(id)] : [],
    content_name: name,
    value,
    currency,
  });
  trackSnap("VIEW_CONTENT", {
    item_ids: id ? [String(id)] : undefined,
    price: value,
    currency,
  });
}

export function trackPixelAddToCart({
  id,
  name,
  price,
  quantity = 1,
  currency = "INR",
  sku,
}) {
  const unitPrice = parsePrice(price);
  const qty = Number(quantity) || 1;
  const value = unitPrice * qty;
  const item = buildEcommerceItem({
    id,
    name,
    price: unitPrice,
    quantity: qty,
    variant: sku,
  });
  pushEcommerceEvent({
    event: "add_to_cart",
    ecommerce: { currency, value, items: [item] },
  });
  trackMeta("AddToCart", {
    content_type: "product",
    content_ids: id ? [String(id)] : [],
    contents: id ? [{ id: String(id), quantity: qty }] : [],
    value,
    currency,
  });
  trackSnap("ADD_CART", {
    item_ids: id ? [String(id)] : undefined,
    price: value,
    currency,
    number_items: qty,
  });
}

export function trackPixelViewCart({ items, value, currency = "INR" }) {
  pushEcommerceEvent({
    event: "view_cart",
    ecommerce: {
      currency,
      value: value != null ? Number(value) : undefined,
      items,
    },
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
  pushEcommerceEvent({
    event: "begin_checkout",
    ecommerce: {
      currency,
      value: parsedValue,
      items,
    },
  });
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
  trackSnap("START_CHECKOUT", {
    price: parsedValue,
    currency,
    number_items: count,
  });
}

/** GTM + Meta + Snap begin_checkout once per checkout session. */
export function trackPixelBeginCheckoutOnce(params) {
  if (typeof sessionStorage !== "undefined") {
    if (sessionStorage.getItem(BEGIN_CHECKOUT_KEY)) {
      if (import.meta.env.DEV) {
        logPixel("skip", "begin_checkout already tracked this session");
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
  const ecommerceItems = items.map((row) =>
    buildEcommerceItem({
      id: row.id,
      name: row.name,
      price: row.price,
      quantity: row.quantity,
    }),
  );
  const contentIds = items.map((row) => row.id).filter(Boolean);
  const contents = items.map((row) => ({
    id: row.id,
    quantity: row.quantity ?? 1,
  }));
  const numItems =
    conversion?.numItems ??
    contents.reduce((sum, row) => sum + (row.quantity || 1), 0);

  pushEcommerceEvent({
    event: "purchase",
    ecommerce: {
      transaction_id: conversion?.orderId,
      value,
      currency,
      items: ecommerceItems,
    },
  });

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

  trackSnap("PURCHASE", {
    price: value,
    currency,
    transaction_id: conversion?.orderId,
    number_items: numItems,
    item_ids: contentIds,
  });
}
