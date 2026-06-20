/** Bind-offer helpers for storefront (BOGO / qty / cart threshold). */

export function bogoApiToMarketing(bogoRules) {
  const buyQuantity = Number(bogoRules?.buyQuantity) || 0;
  const freeQuantity = Number(bogoRules?.freeQuantity) || 0;
  if (buyQuantity < 1 || freeQuantity < 1) return { paidQuantity: 1, freeQuantity: 1 };
  return {
    paidQuantity: Math.max(1, buyQuantity - freeQuantity),
    freeQuantity,
  };
}

export function formatBogoMarketingText(paidQuantity, freeQuantity) {
  const paid = Number(paidQuantity) || 0;
  const free = Number(freeQuantity) || 0;
  if (paid < 1 || free < 1) return "";
  return `Buy ${paid} Get ${free} Free`;
}

export function formatBindOfferLabel(bindOffer) {
  if (!bindOffer?.offerType) return null;
  if (bindOffer.isEligible === false) return null;

  return formatBindOfferMarketingLabel(bindOffer);
}

/** Marketing label for cards / headers (ignores isEligible). */
export function formatBindOfferMarketingLabel(bindOffer) {
  if (!bindOffer?.offerType) return null;

  const custom = (bindOffer.label || bindOffer.badgeText || "").trim();
  if (custom) return custom;

  if (bindOffer.offerType === "BUY_X_GET_Y_FREE" && bindOffer.bogoRules) {
    const { paidQuantity, freeQuantity } = bogoApiToMarketing(bindOffer.bogoRules);
    return formatBogoMarketingText(paidQuantity, freeQuantity);
  }

  if (bindOffer.offerType === "BUY_N_GET_DISCOUNT" && bindOffer.qtyDiscountRules) {
    const min = bindOffer.qtyDiscountRules.minQuantity;
    return min ? `Buy ${min}+ & save` : "Quantity offer";
  }

  if (bindOffer.offerType === "CART_THRESHOLD_DISCOUNT" && bindOffer.cartThresholdRules) {
    const min = bindOffer.cartThresholdRules.minEligibleSubtotal;
    return min ? `Shop ₹${min}+ & save` : "Cart offer";
  }

  return null;
}

export function hasBindOffer(bindOffer) {
  return Boolean(bindOffer?.offerType);
}

/** Badge on product cards — show campaign label whenever offerType is set. */
export function getProductCardOfferBadge(bindOffer) {
  if (!hasBindOffer(bindOffer)) return null;
  return formatBindOfferMarketingLabel(bindOffer);
}

export function getOfferBadgeText(bindOffer) {
  if (!bindOffer?.offerType) return null;
  if (bindOffer.isEligible === false) return null;
  return bindOffer.badgeText || formatBindOfferMarketingLabel(bindOffer) || null;
}

export function getOfferHint(bindOffer) {
  if (!bindOffer?.offerType || bindOffer.isEligible === false) return null;
  if (bindOffer.uiHints?.message) return bindOffer.uiHints.message;
  if (bindOffer.offerType === "BUY_X_GET_Y_FREE" && bindOffer.bogoRules) {
    const { paidQuantity, freeQuantity } = bogoApiToMarketing(bindOffer.bogoRules);
    const minCart = paidQuantity + freeQuantity;
    return `Add ${minCart} items to unlock — ${formatBogoMarketingText(paidQuantity, freeQuantity)}`;
  }
  return formatBindOfferLabel(bindOffer);
}

export function getSectionOfferHeadline(section) {
  if (!section) return null;
  const bind = formatBindOfferMarketingLabel(section.bindOffer);
  if (bind) return bind;
  const d = section.discount;
  if (d?.value != null && Number(d.value) > 0) {
    return d.type === "PERCENT" ? `${Math.round(Number(d.value))}% OFF` : `₹${d.value} OFF`;
  }
  return null;
}

export function bindOfferPayloadFromSection(section) {
  if (!hasBindOffer(section?.bindOffer)) return null;
  const offer = section.bindOffer;
  return {
    isEligible: true,
    sectionId: section._id,
    sectionTitle: section.title,
    offerType: offer.offerType,
    label: offer.label || section.title,
    badgeText: offer.badgeText || null,
    bogoRules: offer.bogoRules || null,
    qtyDiscountRules: offer.qtyDiscountRules || null,
    cartThresholdRules: offer.cartThresholdRules || null,
    uiHints: buildBindOfferUiHints(offer),
  };
}

function buildBindOfferUiHints(offer) {
  if (!offer?.offerType) return null;

  if (offer.offerType === "BUY_X_GET_Y_FREE" && offer.bogoRules) {
    const target = Number(offer.bogoRules.buyQuantity) || 0;
    return {
      progressType: "QUANTITY",
      targetQuantity: target,
      message: target
        ? `Add ${target} to get ${offer.bogoRules.freeQuantity || 1} free`
        : null,
    };
  }

  if (offer.offerType === "BUY_N_GET_DISCOUNT" && offer.qtyDiscountRules) {
    const target = Number(offer.qtyDiscountRules.minQuantity) || 0;
    return {
      progressType: "QUANTITY",
      targetQuantity: target,
      message: target ? `Buy ${target} to unlock ${offer.label || "discount"}` : null,
    };
  }

  if (offer.offerType === "CART_THRESHOLD_DISCOUNT" && offer.cartThresholdRules) {
    const min = Number(offer.cartThresholdRules.minEligibleSubtotal) || 0;
    return {
      progressType: "SUBTOTAL",
      targetSubtotal: min,
      message: min ? `Shop ₹${min}+ for ${offer.label || "discount"}` : null,
    };
  }

  return null;
}

function toId(value) {
  if (value == null) return "";
  return String(value._id ?? value.id ?? value);
}

/** All product item IDs used for bind-offer scope matching on a section. */
export function getSectionBindProductIds(section) {
  const ids = new Set();
  const add = (value) => {
    if (value == null) return;
    const id = toId(value);
    if (id) ids.add(id);
  };

  for (const p of section?.products || []) {
    add(p?.itemId ?? p?.item?._id ?? p?.item?.id);
  }
  for (const p of section?.bindOffer?.scope?.products || []) {
    add(p?.itemId ?? p?.item?._id ?? p?.item?.id ?? p);
  }

  return ids;
}

/** Mirror backend scope: section products, categoryId, subcategoryId, or bindOffer.scope override. */
export function itemMatchesSectionBindScope(item, section) {
  if (!hasBindOffer(section?.bindOffer) || !item) return false;

  const scope = section.bindOffer?.scope;
  const hasScopeOverride =
    scope &&
    ((scope.products || []).length > 0 ||
      (scope.categoryId || []).length > 0 ||
      (scope.subcategoryId || []).length > 0);

  const products = [
    ...(section.products || []),
    ...(scope?.products || []),
  ];
  const categoryIds = hasScopeOverride ? scope.categoryId || [] : section.categoryId || [];
  const subcategoryIds = hasScopeOverride
    ? scope.subcategoryId || []
    : section.subcategoryId || [];

  const itemId = toId(item._id ?? item.id);
  const catId = item.categoryId ?? item.catId;
  const subId = item.subcategoryId;

  const inProducts = products.some((p) => {
    const pid = p?.itemId ?? p?.item?._id ?? p?.item?.id ?? p;
    return pid != null && toId(pid) === itemId;
  });
  const inCategory =
    catId != null && categoryIds.some((c) => toId(c) === toId(catId));
  const inSubcategory =
    subId != null && subcategoryIds.some((s) => toId(s) === toId(subId));

  return Boolean(inProducts || inCategory || inSubcategory);
}

export function resolveListingBindOffer(item, section = null) {
  if (hasBindOffer(item?.bindOffer)) return item.bindOffer;
  if (!item || !section) return null;

  if (itemMatchesSectionBindScope(item, section)) {
    return bindOfferPayloadFromSection(section);
  }

  return null;
}

export function listingBindOfferProps(item, section = null) {
  const bindOffer = resolveListingBindOffer(item, section);
  const offerBadge = getProductCardOfferBadge(bindOffer);
  const props = {};
  if (bindOffer) props.bindOffer = bindOffer;
  if (offerBadge) props.offerBadge = offerBadge;
  return props;
}

export function offerBadgeFromItem(item, section = null) {
  if (!item || typeof item !== "object") return null;
  return getProductCardOfferBadge(resolveListingBindOffer(item, section));
}

export function getTotalBindOfferDiscount(bindOffers) {
  if (!bindOffers) return 0;
  const direct = Number(
    bindOffers.totalBindOfferDiscount ?? bindOffers.totalDiscount ?? 0,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;
  const applied = Array.isArray(bindOffers.applied) ? bindOffers.applied : [];
  const fromApplied = applied.reduce(
    (sum, row) => sum + (Number(row.discountAmount) || 0),
    0,
  );
  if (fromApplied > 0) return fromApplied;
  const applications = Array.isArray(bindOffers.applications)
    ? bindOffers.applications
    : [];
  return applications.reduce(
    (sum, row) => sum + (Number(row.discountAmount) || 0),
    0,
  );
}

export function getBindOfferBillLabel(bindOffers) {
  if (!bindOffers) return "Offer discount";
  const fromApplied = bindOffers.applied?.[0];
  if (fromApplied?.label || fromApplied?.sectionTitle) {
    return fromApplied.label || fromApplied.sectionTitle;
  }
  const fromApplication = bindOffers.applications?.[0];
  if (fromApplication?.label || fromApplication?.sectionTitle) {
    return fromApplication.label || fromApplication.sectionTitle;
  }
  return "Offer discount";
}

export function getGrossSubTotalBeforeBindOffer(summary, bindOffers) {
  const netSubTotal = Number(summary?.subTotal ?? 0);
  const offerDiscount = getTotalBindOfferDiscount(bindOffers);
  if (!offerDiscount || offerDiscount <= 0) return null;
  return netSubTotal + offerDiscount;
}

/** Text for cart / order line when offer applied or progress-only. */
export function getLineBindOfferNote(bindOffer) {
  if (!bindOffer) return null;

  const parts = [];
  if (Number(bindOffer.freeQuantity) > 0) {
    parts.push(`${bindOffer.freeQuantity} free`);
  }
  if (Number(bindOffer.lineDiscount) > 0) {
    parts.push(`−₹${Number(bindOffer.lineDiscount).toLocaleString("en-IN")}`);
  } else if (
    bindOffer.label &&
    (Number(bindOffer.freeQuantity) > 0 || Number(bindOffer.lineDiscount) > 0)
  ) {
    parts.push(bindOffer.label);
  }

  if (parts.length) return parts.join(" · ");

  if (bindOffer.isEligible === false) {
    return getOfferHint(bindOffer) || formatBindOfferLabel(bindOffer);
  }

  if (bindOffer.label || bindOffer.offerType) {
    return bindOffer.label || formatBindOfferLabel(bindOffer);
  }

  return null;
}

export function normalizeCartPriceSummary(data) {
  const root = data?.cartSummary ?? data ?? {};
  return {
    items: Array.isArray(root.items) ? root.items : [],
    summary: root.summary ?? data?.summary ?? {},
  };
}

export function getBindOfferProgressMessages(bindOffers) {
  const progress = bindOffers?.progress;
  if (!Array.isArray(progress) || !progress.length) return [];
  return progress.map((p) => p.message).filter(Boolean);
}

/** When price-summary has no bindOffers block (older API), build progress from cart line payloads. */
export function getCartLineOfferProgressMessage(bindOffer, quantity = 0) {
  if (!bindOffer?.offerType) return null;

  if (bindOffer.offerType === "BUY_X_GET_Y_FREE" && bindOffer.bogoRules) {
    const buyQty = Number(bindOffer.bogoRules.buyQuantity) || 0;
    const freeQty = Number(bindOffer.bogoRules.freeQuantity) || 0;
    const qty = Number(quantity) || 0;
    if (buyQty > 0 && qty > 0 && qty < buyQty) {
      return `Add ${buyQty - qty} more to get ${freeQty || 1} free`;
    }
  }

  return (
    bindOffer.uiHints?.message ||
    (bindOffer.isEligible !== false ? getOfferHint(bindOffer) : null) ||
    formatBindOfferMarketingLabel(bindOffer)
  );
}

export function deriveBindOffersFromLineItems(lineItems = []) {
  const progress = [];
  const seen = new Set();

  for (const row of lineItems) {
    const bindOffer = row?.bindOffer;
    if (!bindOffer?.offerType) continue;

    const message = getCartLineOfferProgressMessage(bindOffer, row?.quantity);

    if (!message || seen.has(message)) continue;
    seen.add(message);
    progress.push({
      offerType: bindOffer.offerType,
      label: bindOffer.label,
      message,
    });
  }

  if (!progress.length) return null;
  return { applied: [], progress, totalBindOfferDiscount: 0 };
}

export function pickBindOfferSectionForItem(sections, item) {
  if (!item) return null;

  const itemRef = {
    _id: item._id ?? item.id,
    categoryId: item.categoryId,
    subcategoryId: item.subcategoryId,
  };

  const matches = (sections || [])
    .filter((section) => hasBindOffer(section?.bindOffer))
    .filter((section) => itemMatchesSectionBindScope(itemRef, section))
    .sort((a, b) => {
      const pa = Number(a?.bindOffer?.priority) || 0;
      const pb = Number(b?.bindOffer?.priority) || 0;
      if (pa !== pb) return pb - pa;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

  return matches[0] || null;
}

function cartRowHasBindOffer(row) {
  return hasBindOffer(row?.bindOffer) || hasBindOffer(row?.itemId?.bindOffer);
}

/** Fallback when /cart/my omits bindOffer — resolve from active sections (same rules as listings). */
export function enrichCartRowsWithSectionBindOffers(cartRows, sections) {
  if (!cartRows?.length || !sections?.length) return cartRows ?? [];

  return cartRows.map((row) => {
    if (cartRowHasBindOffer(row)) {
      const bindOffer = row.bindOffer ?? row.itemId?.bindOffer;
      const item =
        row.itemId && typeof row.itemId === "object"
          ? { ...row.itemId, bindOffer }
          : row.itemId;
      return { ...row, bindOffer, itemId: item };
    }

    const item = row?.itemId;
    const section = pickBindOfferSectionForItem(sections, item);
    if (!section) return row;

    const bindOffer = bindOfferPayloadFromSection(section);
    if (!bindOffer) return row;

    const itemPlain =
      item && typeof item === "object" ? { ...item, bindOffer } : item;

    return { ...row, bindOffer, itemId: itemPlain };
  });
}

export function resolveCartBindOffers(priceSummary, lineItems = []) {
  const fromSummary = priceSummary?.summary?.bindOffers ?? priceSummary?.bindOffers;
  if (fromSummary != null && typeof fromSummary === "object") {
    const hasContent =
      (fromSummary.applied?.length ?? 0) > 0 ||
      (fromSummary.progress?.length ?? 0) > 0 ||
      Number(fromSummary.totalBindOfferDiscount) > 0;
    if (hasContent) return fromSummary;
    // Empty but present from API — still use progress if any
    if (Array.isArray(fromSummary.progress) && fromSummary.progress.length > 0) {
      return fromSummary;
    }
  }
  return deriveBindOffersFromLineItems(lineItems);
}

/** Merge priced lines from GET /cart/price-summary onto cart rows (by sku). */
export function enrichCartRowsWithPriceSummary(cartRows, priceSummary) {
  const pricedItems = priceSummary?.items ?? [];
  if (!pricedItems.length) return cartRows ?? [];

  const bySku = new Map(
    pricedItems.map((line) => [String(line.sku ?? ""), line]).filter(([sku]) => sku),
  );

  return (cartRows ?? []).map((row) => {
    const sku = String(row.variant?.sku ?? row.sku ?? "");
    const priced = bySku.get(sku);
    if (!priced) {
      return {
        ...row,
        bindOffer: row.bindOffer ?? row.itemId?.bindOffer ?? null,
      };
    }
    return {
      ...row,
      unitPrice: priced.unitPrice ?? row.unitPrice,
      itemSubtotal: priced.itemSubtotal ?? row.itemSubtotal,
      itemTotal: priced.itemSubtotal ?? row.itemTotal,
      bindOffer: priced.bindOffer ?? row.bindOffer ?? row.itemId?.bindOffer ?? null,
      couponDiscount: priced.couponDiscount ?? row.couponDiscount,
    };
  });
}

export function appendOfferBadgeToCardProps(cardProps, item, section = null) {
  return {
    ...cardProps,
    ...listingBindOfferProps(item, section),
  };
}
