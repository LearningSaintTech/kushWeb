/**
 * Shared order / shipment tracking helpers for storefront (orders list + track page).
 */

export function normalizeStatusKey(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

const OUT_FOR_DELIVERY_ENUMS = new Set([
  'OUT_FOR_DELIVERY',
  'EXCHANGE_OUT_FOR_DELIVERY',
]);

/** Khush enum or raw carrier scan (e.g. ofd) */
export function isOutForDeliveryStatus(raw) {
  if (!raw) return false;
  const s = normalizeStatusKey(raw);
  if (OUT_FOR_DELIVERY_ENUMS.has(s)) return true;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  return key === 'ofd' || key === 'out_for_delivery';
}

/** Formatted user-facing label or raw enum */
export function isOutForDeliveryDisplayLabel(label) {
  if (!label) return false;
  if (isOutForDeliveryStatus(label)) return true;
  const normalized = String(label).trim().toLowerCase();
  return (
    normalized === 'out for delivery' ||
    normalized === 'replacement out for delivery' ||
    normalized.endsWith('out for delivery')
  );
}

/** Shadowfax AWB on trackingId when shadowfax.awb was not denormalized */
export function looksLikeShadowfaxAwb(value) {
  const id = String(value || '').trim();
  return /^SF[A-Z0-9]+$/i.test(id);
}

export function inferManifestProvider(item = {}, shipment = null) {
  const line = item || {};
  const ship = shipment || {};
  const sfx = line.shadowfax || ship.shadowfax || {};
  const dl = line.delhivery || ship.delhivery || {};
  const sr = line.shiprocket || ship.shiprocket || {};
  const trackingId =
    sfx.awb ||
    dl.waybill ||
    sr.awbCode ||
    line.trackingId ||
    ship.trackingId ||
    null;

  if (sfx.awb || looksLikeShadowfaxAwb(trackingId)) return 'SHADOWFAX';
  if (dl.waybill) return 'DELHIVERY';
  if (sr.awbCode) return 'SHIPROCKET';
  return String(line.shippingProvider || ship.shippingProvider || '').toUpperCase() || null;
}

/** Show external track link when a third-party carrier URL is available */
export function shouldShowCarrierTrackLink(carrierTracking) {
  if (!carrierTracking?.trackingUrl) return false;
  const provider = String(carrierTracking.provider || '').toUpperCase();
  return ['SHADOWFAX', 'DELHIVERY', 'SHIPROCKET'].includes(provider);
}

/** @deprecated use shouldShowCarrierTrackLink */
export function shouldShowTrackShipmentInsteadOfOfd(context = {}) {
  return shouldShowCarrierTrackLink(context.carrierTracking);
}

/** Format carrier raw scan / enum for display (never suppress OUT_FOR_DELIVERY) */
export function formatCarrierScanLabel(statusLabel) {
  if (!statusLabel) return null;
  if (isOutForDeliveryStatus(statusLabel)) {
    return getKhushStatusLabel('OUT_FOR_DELIVERY');
  }
  return formatCarrierStatus(statusLabel) || statusLabel;
}

/** @deprecated use formatCarrierScanLabel */
export function sanitizeCarrierStatusForDisplay(statusLabel) {
  return formatCarrierScanLabel(statusLabel);
}

const THIRD_PARTY_CARRIERS = new Set(['SHIPROCKET', 'DELHIVERY', 'SHADOWFAX']);

/** True when a line has live third-party carrier data (manifest / webhooks). */
export function hasCarrierWebhookStatus(carrierTracking) {
  if (!carrierTracking) return false;
  const provider = String(carrierTracking.provider || '').toUpperCase();
  if (!THIRD_PARTY_CARRIERS.has(provider)) return false;
  if (carrierTracking.selfShipping) return false;
  return Boolean(
    carrierTracking.status ||
      carrierTracking.rawStatus ||
      carrierTracking.trackingNumber ||
      carrierTracking.trackingUrl,
  );
}

/**
 * User-facing status label — prefer latest carrier webhook scan when manifest exists.
 * Khush items.status is still used for cancel/exchange rules; display follows the courier.
 */
export function resolveUserFacingStatusLabel(itemStatus, carrierTracking) {
  if (hasCarrierWebhookStatus(carrierTracking)) {
    const fromApi = carrierTracking.status
      ? formatCarrierScanLabel(String(carrierTracking.status).trim())
      : null;
    if (fromApi) return fromApi;

    const raw = carrierTracking.rawStatus
      ? String(carrierTracking.rawStatus).trim()
      : null;
    if (raw) {
      return (
        formatCarrierScanLabel(formatCarrierStatus(raw) || raw) || raw
      );
    }
  }
  return getKhushStatusLabel(itemStatus);
}

/** Track page banner */
export function resolveTrackPagePrimaryStatus(itemStatus, carrierTracking) {
  return resolveUserFacingStatusLabel(itemStatus, carrierTracking);
}

/** User-friendly Khush line-item status labels */
export function getKhushStatusLabel(status) {
  const s = normalizeStatusKey(status);
  const map = {
    CREATED: 'Order placed',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing at warehouse',
    SHIPPED: 'Shipped',
    OUT_FOR_DELIVERY: 'Out for delivery',
    PICKED_UP: 'Picked up by courier',
    IN_TRANSIT: 'In transit',
    DISPATCHED: 'Dispatched',
    MANIFESTED: 'Manifested',
    AWB_ASSIGNED: 'AWB assigned',
    BOOKED: 'Shipment booked',
    SHIPMENT_BOOKED: 'Shipment booked',
    PENDING_PICKUP: 'Pending pickup',
    PICKUP_SCHEDULED: 'Pickup scheduled',
    REACHED_DESTINATION_HUB: 'Reached destination hub',
    DELIVERED: 'Delivered',
    RETURN_REQUESTED: 'Return requested',
    RETURN_APPROVED: 'Return approved',
    RETURN_PICKUP_SCHEDULED: 'Return pickup scheduled',
    RETURNED: 'Return item collected',
    REFUNDED: 'Return refund processed',
    EXCHANGE_REQUESTED: 'Exchange requested',
    EXCHANGE_APPROVED: 'Exchange approved',
    EXCHANGE_REJECTED: 'Exchange rejected',
    EXCHANGE_PICKUP_SCHEDULED: 'Exchange pickup scheduled',
    EXCHANGE_OUT_FOR_PICKUP: 'Out for exchange pickup',
    EXCHANGE_PICKED: 'Item picked for exchange',
    EXCHANGE_RECEIVED: 'Exchange received at warehouse',
    EXCHANGE_PROCESSING: 'Exchange processing',
    EXCHANGE_SHIPPED: 'Replacement shipped',
    EXCHANGE_OUT_FOR_DELIVERY: 'Replacement out for delivery',
    EXCHANGE_DELIVERED: 'Exchange delivered',
    EXCHANGE_COMPLETED: 'Exchange completed',
    CANCELLED: 'Cancelled',
    CANCELED: 'Cancelled',
  };
  return map[s] || (s ? s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'â€”');
}

/** Return document status (camelCase from backend) â€” always prefixed for clarity vs forward delivery */
export function getReturnDocStatusLabel(status) {
  const key = String(status || '').trim();
  const map = {
    returnRequested: 'Return requested',
    returnApproved: 'Return approved',
    pickupScheduled: 'Return pickup scheduled',
    outForPickup: 'Return out for pickup',
   pickedUp: 'Return item collected from you',
    inTransit: 'Return in transit to warehouse',
    receivedAtWarehouse: 'Return delivered to warehouse',
    qualityCheck: 'Return under quality check',
    refundProcessed: 'Return refund processed',
    returnRejected: 'Return rejected',
  };
  return map[key] || (key ? `Return ${key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()}` : null);
}

/** Order line item status during return flow */
export function getReturnItemStatusLabel(status) {
  const s = normalizeStatusKey(status);
  const map = {
    RETURN_REQUESTED: 'Return requested',
    RETURN_APPROVED: 'Return approved',
    RETURN_PICKUP_SCHEDULED: 'Return pickup scheduled',
    RETURNED: 'Return item collected',
    REFUNDED: 'Return refund processed',
  };
  return map[s] || getKhushStatusLabel(status);
}

/** Return pickup leg carrier scans â€” never reuse forward-delivery wording */
export function formatReturnCarrierStatus(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  const map = {
    new: 'Return pickup created',
    scheduled: 'Return pickup scheduled',
    pending: 'Return pickup pending',
    assigned_for_pickup: 'Return pickup assigned',
    ofp: 'Return out for pickup',
    out_for_pickup: 'Return out for pickup',
    picking: 'Return out for pickup',
   picked: 'Return item collected',
   picked_up: 'Return item collected',
    received: 'Return received by courier',
    received_at_hub: 'Return in transit to warehouse',
    received_at_return_dc: 'Return in transit to warehouse',
    item_added_to_bag: 'Return in transit to warehouse',
    bag_in_transit: 'Return in transit to warehouse',
    bag_received: 'Return in transit to warehouse',
    in_transit_for_return: 'Return in transit to warehouse',
    returned_to_client: 'Return delivered to warehouse',
    rto_d: 'Return delivered to warehouse',
    cancelled: 'Return pickup cancelled',
    cancelled_by_customer: 'Return pickup cancelled',
    completed: 'Return pickup completed',
  };
  if (map[key]) return map[key];
  return formatCarrierStatus(raw);
}

/** Return progress steps â€” separate from forward delivery stepper */
export const RETURN_STEPPER = [
  {
    key: 'return_requested',
    label: 'Return requested',
    docStatuses: ['returnRequested'],
    itemStatuses: ['RETURN_REQUESTED'],
  },
  {
    key: 'return_approved',
    label: 'Return approved',
    docStatuses: ['returnApproved'],
    itemStatuses: ['RETURN_APPROVED'],
  },
  {
    key: 'RETURN_PICKUP_SCHEDULED',
    label: 'Return pickup scheduled',
    docStatuses: ['pickupScheduled'],
    itemStatuses: ['RETURN_PICKUP_SCHEDULED'],
  },
  {
    key: 'return_out_for_pickup',
    label: 'Return out for pickup',
    docStatuses: ['outForPickup'],
    itemStatuses: [],
    carrierKeys: ['ofp', 'assigned_for_pickup', 'out_for_pickup', 'picking'],
  },
  {
    key: 'return_picked_up',
    label: 'Return item collected',
    docStatuses: ['pickedUp'],
    itemStatuses: ['RETURNED'],
    carrierKeys: ['picked', 'picked_up', 'received'],
  },
  {
    key: 'return_in_transit',
    label: 'Return in transit to warehouse',
    docStatuses: ['inTransit'],
    itemStatuses: [],
    carrierKeys: [
      'in_transit_for_return',
      'bag_in_transit',
      'received_at_hub',
      'received_at_return_dc',
      'item_added_to_bag',
      'bag_received',
    ],
  },
  {
    key: 'return_received',
    label: 'Return delivered to warehouse',
    docStatuses: ['receivedAtWarehouse'],
    itemStatuses: [],
    carrierKeys: ['returned_to_client', 'rto_d'],
  },
  {
    key: 'return_quality_check',
    label: 'Return quality check',
    docStatuses: ['qualityCheck'],
    itemStatuses: [],
  },
  {
    key: 'return_refunded',
    label: 'Return refund processed',
    docStatuses: ['refundProcessed'],
    itemStatuses: ['REFUNDED'],
  },
];

const RETURN_DOC_STEP_INDEX = {
  returnRequested: 0,
  returnApproved: 1,
  pickupScheduled: 2,
  outForPickup: 3,
  pickingUp: 3,
 pickedUp: 4,
  inTransit: 5,
  receivedAtWarehouse: 6,
  qualityCheck: 7,
  refundProcessed: 8,
};

const RETURN_ITEM_STEP_INDEX = {
  RETURN_REQUESTED: 0,
  RETURN_APPROVED: 1,
  RETURN_PICKUP_SCHEDULED: 2,
  RETURNED: 4,
  REFUNDED: 8,
};

function normalizeCarrierKey(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
}

/** Current return stepper index (0â€“8) */
export function getCurrentReturnStepIndex({
  returnDocStatus,
  itemStatus,
  carrierRawStatus,
  returnPickupStatus,
} = {}) {
  if (returnDocStatus === 'returnRejected') return -1;

  const carrierKey = normalizeCarrierKey(
    carrierRawStatus || returnPickupStatus,
  );

  let idx =
    returnDocStatus != null && RETURN_DOC_STEP_INDEX[returnDocStatus] != null
      ? RETURN_DOC_STEP_INDEX[returnDocStatus]
      : -1;

  const itemKey = normalizeStatusKey(itemStatus);
  const fromItem = RETURN_ITEM_STEP_INDEX[itemKey];
  if (fromItem != null && fromItem > idx) idx = fromItem;

  for (let i = RETURN_STEPPER.length - 1; i >= 0; i -= 1) {
    const step = RETURN_STEPPER[i];
    if (step.carrierKeys?.includes(carrierKey)) {
      idx = Math.max(idx, i);
      break;
    }
  }

  if (carrierKey === 'scheduled' && idx < 2) idx = 2;

  return idx < 0 ? 0 : idx;
}

/** Primary return status line for banners and order list */
export function getReturnDisplayStatus({
  returnDocStatus,
  itemStatus,
  carrierRawStatus,
  returnPickupStatus,
} = {}) {
  if (returnDocStatus === 'returnRejected') {
    return getReturnDocStatusLabel('returnRejected');
  }

  const idx = getCurrentReturnStepIndex({
    returnDocStatus,
    itemStatus,
    carrierRawStatus,
    returnPickupStatus,
  });

  if (idx >= 0 && RETURN_STEPPER[idx]) {
    return RETURN_STEPPER[idx].label;
  }

  if (returnDocStatus) {
    return getReturnDocStatusLabel(returnDocStatus);
  }

  return getReturnItemStatusLabel(itemStatus) || 'Return in progress';
}

export const RETURN_ITEM_STATUSES = new Set([
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_PICKUP_SCHEDULED',
  'RETURNED',
  'REFUNDED',
]);

export function isReturnFlowItemStatus(status) {
  return RETURN_ITEM_STATUSES.has(normalizeStatusKey(status));
}

export function getReturnStatusBadgeClass(status) {
  const s = normalizeStatusKey(status);
  if (s === 'REFUNDED') return STATUS_BADGE_CLASSES.success;
  if (s === 'RETURNED') return 'border-orange-500 bg-orange-50 text-orange-900';
  if (s.startsWith('RETURN_')) return 'border-orange-400 bg-orange-50 text-orange-900';
  return STATUS_BADGE_CLASSES.neutral;
}

/** Resolve stepper step completion for return timeline */
export function getReturnStepCompletion(currentStepIndex, stepIndex) {
  return currentStepIndex >= stepIndex;
}

/** Find status history entry for a return step */
export function findReturnStepHistory(statusHistory, step) {
  const itemStatuses = step.itemStatuses || [];
  if (!itemStatuses.length) return null;
  return (statusHistory || []).find((r) =>
    itemStatuses.includes(normalizeStatusKey(r.status)),
  );
}

/** Exchange document status (camelCase from backend) */
export function getExchangeDocStatusLabel(status) {
  const key = String(status || '').trim();
  const map = {
    exchangeRequested: 'Exchange requested',
    exchangeApproved: 'Exchange approved',
    pickupScheduled: 'Pickup scheduled',
    pickedUp: 'Item picked up',
    inTransit: 'In transit to warehouse',
    receivedAtWarehouse: 'Received at warehouse',
    qualityCheck: 'Quality check',
    exchangeShipped: 'Replacement shipped',
    outForDelivery: 'Replacement out for delivery',
    exchangeDelivered: 'Exchange delivered',
  };
  return map[key] || (key ? key.replace(/_/g, ' ') : null);
}

/** Raw carrier scan â†’ readable label */
export function formatCarrierStatus(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase().replace(/\s+/g, '_');
  const map = {
    new: 'Shipment created',
    assigned_for_pickup: 'Pickup assigned',
    assigned_for_seller_pickup: 'Pickup assigned at warehouse',
    ofp: 'Out for pickup',
    out_for_pickup: 'Out for pickup',
    picked: 'Picked up',
    picked_up: 'Picked up',
    received: 'Received by courier',
    received_at_hub: 'Received at hub',
    received_at_return_dc: 'Received at return centre',
    received_from_client_warehouse: 'Received from warehouse',
    item_manifested: 'Manifested',
    item_added_to_bag: 'Added to transit bag',
    bag_in_transit: 'In transit',
    bag_received: 'Arrived at hub',
    bag_received_at_via: 'Arrived at transit point',
    recd_at_fwd_dc: 'At delivery centre',
    recd_at_fwd_hub: 'At forward hub',
    received_at_dc: 'At delivery centre',
    received_at_hub: 'Received at hub',
    in_transit_for_return: 'In transit (return)',
    assigned_for_delivery: 'Assigned for delivery',
    ofd: 'Out for delivery',
    delivered: 'Delivered',
    returned_to_client: 'Returned to seller',
    rto_d: 'Returned to seller',
    cancelled: 'Cancelled',
    cancelled_by_customer: 'Cancelled',
    cid: 'Delivery rescheduled',
    nc: 'Could not contact customer',
    na: 'Delivery not attempted',
    scheduled: 'Scheduled',
    pending: 'Pending',
    completed: 'Completed',
  };

  if (map[key]) return map[key];

  // Title-case fallback for unknown carrier strings
  return trimmed
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** True when a third-party carrier manifest exists on the line (webhook / AWB data). */
export function hasThirdPartyCarrierManifest(item = {}, shipment = null) {
  const line = item || {};
  const ship = shipment || {};
  const sfx = line.shadowfax || ship.shadowfax || {};
  const dl = line.delhivery || ship.delhivery || {};
  const sr = line.shiprocket || ship.shiprocket || {};
  if (sfx.awb) return true;
  if (looksLikeShadowfaxAwb(line.trackingId || ship.trackingId)) return true;
  if (dl.waybill || dl.lrn) return true;
  if (sr.awbCode || (Number(sr.shipmentId) > 0) || (Number(sr.orderId) > 0)) return true;
  return false;
}

const KHUSH_TIMELINE_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'CANCELED',
]);

/** Label for one itemStatusHistory row (Khush enum or carrier note). */
export function formatStatusHistoryEntryLabel(entry, context = {}) {
  void context;
  const notes = String(entry?.notes || '').trim();
  if (/shadowfax order manifested/i.test(notes)) {
    return getKhushStatusLabel('SHIPPED');
  }

  const webhookMatch =
    notes.match(/webhook:\s*(.+)$/i) ||
    notes.match(/shadowfax webhook:\s*(.+)$/i);
  if (webhookMatch) {
    const scan = webhookMatch[1].trim();
    return formatCarrierScanLabel(formatCarrierStatus(scan) || scan);
  }

  const statusUpper = normalizeStatusKey(entry?.status);
  if (KHUSH_TIMELINE_STATUSES.has(statusUpper)) {
    return getKhushStatusLabel(entry.status);
  }

  if (notes) {
    const fromNote = formatCarrierStatus(notes);
    const normalizedNote = notes.toLowerCase().replace(/\s+/g, '_');
    const normalizedFromNote = (fromNote || '').toLowerCase().replace(/\s+/g, '_');
    if (fromNote && normalizedFromNote !== normalizedNote) {
      return formatCarrierScanLabel(fromNote);
    }
  }

  const status = entry?.status || '';
  if (RETURN_ITEM_STATUSES?.has?.(String(status).toUpperCase())) {
    return formatCarrierScanLabel(getReturnItemStatusLabel(status));
  }
  return formatCarrierScanLabel(getKhushStatusLabel(status));
}

function isSameTimelineLabel(left, right) {
  if (!left || !right) return false;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

const TIMELINE_STATUS_RANK = {
  CREATED: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  IN_TRANSIT: 3,
  PICKED_UP: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

function getTimelineStatusRank(entry) {
  const key = normalizeStatusKey(entry?.status);
  return TIMELINE_STATUS_RANK[key] ?? -1;
}

/** Collapse duplicate / noisy rows for the track-page timeline */
export function buildStatusHistoryTimeline(history, context = {}) {
  const sorted = [...(history || [])].sort(
    (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
  );

  const display = [];
  let maxLifecycleRank = -1;

  for (let idx = 0; idx < sorted.length; idx += 1) {
    const entry = sorted[idx];
    const lifecycleRank = getTimelineStatusRank(entry);
    if (
      lifecycleRank >= 0 &&
      maxLifecycleRank >= 3 &&
      lifecycleRank < maxLifecycleRank
    ) {
      continue;
    }
    if (lifecycleRank > maxLifecycleRank) {
      maxLifecycleRank = lifecycleRank;
    }

    const label = formatStatusHistoryEntryLabel(entry, context);
    if (!label) continue;

    const notes = String(entry?.notes || '').trim();
    const trackingId = entry.trackingId ? String(entry.trackingId).trim() : null;
    const prev = display[display.length - 1];

    if (prev && isSameTimelineLabel(prev.label, label)) {
      if (trackingId && trackingId !== prev.trackingId) {
        prev.trackingId = trackingId;
      }
      if (new Date(entry.createdAt || 0) > new Date(prev.entry.createdAt || 0)) {
        prev.entry = entry;
      }
      continue;
    }

    if (
      prev &&
      /shadowfax order manifested/i.test(notes) &&
      isSameTimelineLabel(prev.label, getKhushStatusLabel('SHIPPED'))
    ) {
      if (trackingId) prev.trackingId = trackingId;
      continue;
    }

    display.push({
      entry,
      idx,
      label,
      notes,
      trackingId,
    });
  }

  const carrierTracking = context?.carrierTracking;
  const itemStatus = context?.itemStatus || context?.status;
  const carrierSource =
    carrierTracking?.rawStatus ||
    carrierTracking?.status ||
    null;
  const carrierLabel = carrierSource
    ? formatCarrierScanLabel(
        formatCarrierStatus(String(carrierSource)) || String(carrierSource),
      )
    : null;

  if (carrierLabel && itemStatus) {
    const khushLabel = getKhushStatusLabel(itemStatus);
    const alreadyInTimeline = display.some((row) =>
      isSameTimelineLabel(row.label, carrierLabel),
    );
    if (
      !alreadyInTimeline &&
      !isSameTimelineLabel(carrierLabel, khushLabel)
    ) {
      const last = display[display.length - 1];
      display.push({
        entry: {
          status: itemStatus,
          createdAt: carrierTracking?.updatedAt || last?.entry?.createdAt || new Date().toISOString(),
          courier: carrierTracking?.courier || null,
          trackingId: carrierTracking?.trackingNumber || null,
        },
        idx: sorted.length + 1,
        label: carrierLabel,
        notes: '',
        trackingId: carrierTracking?.trackingNumber
          ? String(carrierTracking.trackingNumber).trim()
          : null,
        isLiveCarrier: true,
      });
    }
  }

  return display;
}

export function getProviderLabel(provider) {
  const p = String(provider || '').toUpperCase();
  if (p === 'SHADOWFAX') return 'Shadowfax';
  if (p === 'DELHIVERY') return 'Delhivery';
  if (p === 'SHIPROCKET') return 'Shiprocket';
  if (p === 'SELF_SHIPPING') return 'Khush delivery';
  return p ? p.replace(/_/g, ' ') : null;
}

export function getTrackButtonLabel(provider) {
  const p = String(provider || '').toUpperCase();
  if (p === 'SHADOWFAX') return 'Track shipment';
  const label = getProviderLabel(provider);
  if (label && ['Delhivery', 'Shiprocket'].includes(label)) {
    return `Track on ${label}`;
  }
  return 'Track shipment';
}

export function resolveTrackingUrl(url, trackingId, provider) {
  const p = String(provider || '').toUpperCase();
  if (p === 'SELF_SHIPPING') return null;

  const safeUrl = typeof url === 'string' ? url.trim() : '';
  if (safeUrl) return safeUrl;
  if (!trackingId) return null;

  const id = encodeURIComponent(String(trackingId).trim());
  if (p === 'SHIPROCKET') return `https://shiprocket.co/tracking/${id}`;
  if (p === 'DELHIVERY') return `https://www.delhivery.com/track/package/${id}`;
  if (p === 'SHADOWFAX') return `https://tracker.shadowfax.in/#/awb/${id}`;
  return null;
}

/** Badge tone for status pills */
export function getStatusBadgeTone(status) {
  const s = normalizeStatusKey(status);
  if (s === 'DELIVERED' || s === 'EXCHANGE_DELIVERED' || s === 'EXCHANGE_COMPLETED' || s === 'REFUNDED') {
    return 'success';
  }
  if (s === 'CANCELLED' || s === 'CANCELED' || s === 'EXCHANGE_REJECTED') {
    return 'danger';
  }
  if (s.startsWith('EXCHANGE_') || s.startsWith('RETURN_') || s === 'RETURNED') {
    return 'exchange';
  }
  if (['SHIPPED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKED_UP', 'DISPATCHED'].includes(s)) {
    return 'transit';
  }
  if (s === 'PROCESSING' || s === 'CONFIRMED') {
    return 'processing';
  }
  return 'neutral';
}

export const STATUS_BADGE_CLASSES = {
  success: 'border-green-500 bg-green-50 text-green-800',
  danger: 'border-red-500 bg-red-50 text-red-800',
  exchange: 'border-blue-500 bg-blue-50 text-blue-800',
  transit: 'border-violet-500 bg-violet-50 text-violet-900',
  processing: 'border-amber-500 bg-amber-50 text-amber-900',
  neutral: 'border-gray-300 bg-gray-50 text-gray-900',
};

export function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASSES[getStatusBadgeTone(status)] || STATUS_BADGE_CLASSES.neutral;
}

/** Normalize API carrierTracking snapshot â†’ UI tracking object */
export function mapCarrierTrackingSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  let trackingId = snapshot.trackingId
    ? String(snapshot.trackingId).trim()
    : null;
  let provider = snapshot.provider ? String(snapshot.provider).toUpperCase() : null;
  let selfShipping = Boolean(snapshot.selfShipping);

  if (
    trackingId &&
    (provider === 'SELF_SHIPPING' || selfShipping) &&
    looksLikeShadowfaxAwb(trackingId)
  ) {
    provider = 'SHADOWFAX';
    selfShipping = false;
  }

  const trackingUrl = resolveTrackingUrl(snapshot.trackingUrl, trackingId, provider);
  const statusLabel = formatCarrierScanLabel(
    formatCarrierStatus(snapshot.status) ||
      (snapshot.status ? String(snapshot.status) : null),
  );
  const hasProgress = Boolean(trackingId || trackingUrl || statusLabel);

  if (!hasProgress && !selfShipping) return null;

  return {
    trackingNumber: trackingId,
    trackingUrl,
    status: statusLabel,
    rawStatus: snapshot.status || null,
    courier: snapshot.courier || getProviderLabel(provider),
    provider,
    leg: snapshot.leg || null,
    selfShipping,
    selfShippingMode: snapshot.selfShippingMode || null,
  };
}

/** Normalize user API carrierTracking snapshot → list UI tracking object */
export function normalizeApiCarrierTracking(apiSnapshot) {
  if (!apiSnapshot || typeof apiSnapshot !== 'object') return null;

  let trackingId = apiSnapshot.trackingId
    ? String(apiSnapshot.trackingId).trim()
    : null;
  let provider = apiSnapshot.provider ? String(apiSnapshot.provider).toUpperCase() : null;
  let selfShipping = Boolean(apiSnapshot.selfShipping);

  if (
    trackingId &&
    (provider === 'SELF_SHIPPING' || selfShipping) &&
    looksLikeShadowfaxAwb(trackingId)
  ) {
    provider = 'SHADOWFAX';
    selfShipping = false;
  }

  const trackingUrl = resolveTrackingUrl(apiSnapshot.trackingUrl, trackingId, provider);
  const rawCarrierStatus = apiSnapshot.status
    ? String(apiSnapshot.status).trim()
    : apiSnapshot.rawStatus
      ? String(apiSnapshot.rawStatus).trim()
      : null;
  const carrierStatus = formatCarrierScanLabel(
    rawCarrierStatus
      ? formatCarrierStatus(rawCarrierStatus) || rawCarrierStatus
      : formatCarrierStatus(apiSnapshot.rawStatus),
  );
  const hasProgress = Boolean(trackingId || trackingUrl || carrierStatus);

  if (!hasProgress && !selfShipping) return null;

  return {
    trackingNumber: trackingId,
    trackingUrl,
    status: carrierStatus,
    rawStatus: apiSnapshot.rawStatus || apiSnapshot.status || null,
    courier: apiSnapshot.courier || getProviderLabel(provider),
    provider,
    selfShipping,
  };
}

/** Per-order-line AWB for orders list — never reuse another order's history. */
export function resolveOrderListTrackingId(oi, carrierTracking = null) {
  const item = oi?.item || {};
  const fromLine =
    item.shipping?.awb ||
    item.shadowfax?.awb ||
    item.delhivery?.waybill ||
    item.shiprocket?.awbCode ||
    item.trackingId ||
    null;
  if (fromLine) return String(fromLine).trim();
  if (carrierTracking?.trackingNumber) {
    return String(carrierTracking.trackingNumber).trim();
  }
  const fromHistory = oi?.latestStatusHistory?.trackingId;
  return fromHistory ? String(fromHistory).trim() : null;
}

/** Derive tracking from order list line (fallback when API omits carrierTracking) */
export function deriveTrackingFromOrderLine(oi) {
  const item = oi?.item || {};
  const provider = String(item.shippingProvider || '').toUpperCase();
  const sfx = item.shadowfax || {};
  const dl = item.delhivery || {};
  const sr = item.shiprocket || {};

  let trackingId =
    item.shipping?.awb ||
    sfx.awb ||
    dl.waybill ||
    sr.awbCode ||
    item.trackingId ||
    oi?.latestStatusHistory?.trackingId ||
    null;
  let resolvedProvider = provider;

  if (sfx.awb) resolvedProvider = 'SHADOWFAX';
  else if (looksLikeShadowfaxAwb(trackingId)) resolvedProvider = 'SHADOWFAX';
  else if (dl.waybill) resolvedProvider = 'DELHIVERY';
  else if (sr.awbCode) resolvedProvider = 'SHIPROCKET';

  if (!trackingId) return null;

  const trackingUrl = resolveTrackingUrl(
    sfx.trackingUrl || dl.trackingUrl || sr.trackingUrl,
    trackingId,
    resolvedProvider,
  );

  const rawStatus = sfx.status || dl.status || sr.status || null;
  const khushStatus = oi?.status ?? oi?.itemStatus;
  const statusLabel = formatCarrierScanLabel(
    formatCarrierStatus(rawStatus) || getKhushStatusLabel(khushStatus),
  );

  return {
    trackingNumber: String(trackingId),
    trackingUrl,
    status: statusLabel,
    rawStatus,
    courier: getProviderLabel(resolvedProvider),
    provider: resolvedProvider,
  };
}

/** Orders list status pill */
export function resolveOrderListStatusLabel(statusDisplay, carrierTracking, khushStatus) {
  const label = resolveUserFacingStatusLabel(
    khushStatus ?? statusDisplay?.statusLabel,
    carrierTracking,
  );
  return label || statusDisplay.statusLabel || statusDisplay.label;
}

/** Show external track link when carrier URL is available */
export function shouldShowExternalTrackLink(carrierTracking, khushStatus) {
  void khushStatus;
  if (!carrierTracking?.trackingUrl) return false;
  const provider = String(carrierTracking.provider || '').toUpperCase();
  if (provider === 'SELF_SHIPPING' && carrierTracking.selfShipping) return false;
  return shouldShowCarrierTrackLink(carrierTracking);
}

/** Line statuses that should show track actions on orders list */
export const TRACKABLE_LINE_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'PICKED_UP',
  'IN_TRANSIT',
  'DISPATCHED',
  'MANIFESTED',
  'AWB_ASSIGNED',
  'BOOKED',
  'SHIPMENT_BOOKED',
  'PENDING_PICKUP',
  'PICKUP_SCHEDULED',
  'REACHED_DESTINATION_HUB',
  'OUT_FOR_PICKUP',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_PICKUP_SCHEDULED',
  'RETURNED',
  'EXCHANGE_REQUESTED',
  'EXCHANGE_APPROVED',
  'EXCHANGE_PICKUP_SCHEDULED',
  'EXCHANGE_OUT_FOR_PICKUP',
  'EXCHANGE_PICKED',
  'EXCHANGE_RECEIVED',
  'EXCHANGE_PROCESSING',
  'EXCHANGE_SHIPPED',
  'EXCHANGE_OUT_FOR_DELIVERY',
  'EXCHANGE_DELIVERED',
]);
