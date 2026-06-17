import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
import { useSupportChat } from "../../app/context/SupportChatContext";
import { orderService } from "../../services/order.service.js";
import { itemsService } from "../../services/items.service.js";
import { cancellationService } from "../../services/cancellation.service.js";
import { exchangeService } from "../../services/exchange.service.js";
import { policyService } from "../../services/policy.service.js";
import { ROUTES, getOrderTrackPath } from "../../utils/constants";
import {
  formatPaymentLine,
  getPaymentStatus,
  getPaymentStatusLabel,
  isCodPayment,
  resolvePaymentMode,
} from "../../utils/paymentMode";
import { navigateToOrderCancelled } from "../checkout/orderConversion.js";
import { reviewsService } from "../../services/reviews.service.js";
import { trackEvent } from "../../analytics";

const QUANTITY_LABELS = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
};
function getExchangeQuantityOptions(maxQuantity) {
  const max = Math.max(1, Math.min(Number(maxQuantity) || 1, 10));
  return Array.from({ length: max }, (_, i) => {
    const value = i + 1;
    return { value, label: QUANTITY_LABELS[value] || String(value) };
  });
}

const FALLBACK_CANCEL_REASONS = [
  "Changed my mind",
  "Wrong size or color",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery too late",
  "Other",
];

const FALLBACK_EXCHANGE_REASONS = [
  "Wrong size",
  "Wrong color",
  "Defective or damaged",
  "Not as described",
  "Changed my mind",
  "Other",
];

// Delivery lifecycle from ORDER_STATUS_ENUM (order.model.js) — used for progress bar
const DELIVERY_STATUS_ORDER = [
  "CREATED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

/** Only show "Cancel order" before shipment / courier pickup (backend may still send isCancellable). */
const CANCEL_ORDER_UI_STATUSES = new Set([
  "CREATED",
  "CONFIRMED",
  "PROCESSING",
]);

const STEPPER = [
  { key: "order_placed", label: "Order Placed", statuses: ["CREATED"] },
  { key: "confirmed", label: "Confirmed", statuses: ["CONFIRMED"] },
  { key: "processing", label: "Processing", statuses: ["PROCESSING"] },
  { key: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    statuses: ["OUT_FOR_DELIVERY"],
  },
  { key: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
];

const EXCHANGE_STATUSES = [
  "EXCHANGE_REQUESTED",
  "EXCHANGE_APPROVED",
  "EXCHANGE_REJECTED",
  "EXCHANGE_PICKUP_SCHEDULED",
  "EXCHANGE_OUT_FOR_PICKUP",
  "EXCHANGE_PICKED",
  "EXCHANGE_RECEIVED",
  "EXCHANGE_PROCESSING",
  "EXCHANGE_SHIPPED",
  "EXCHANGE_OUT_FOR_DELIVERY",
  "EXCHANGE_DELIVERED",
  "EXCHANGE_COMPLETED",
];

// Exchange stepper (EXCHANGE_COMPLETED shown as final step "Exchange Delivered")
const EXCHANGE_STEPPER = [
  {
    key: "EXCHANGE_REQUESTED",
    label: "Exchange Requested",
    statuses: ["EXCHANGE_REQUESTED"],
  },
  {
    key: "EXCHANGE_APPROVED",
    label: "Exchange Approved",
    statuses: ["EXCHANGE_APPROVED"],
  },
  {
    key: "EXCHANGE_PICKUP_SCHEDULED",
    label: "Exchange Pickup Scheduled",
    statuses: ["EXCHANGE_PICKUP_SCHEDULED"],
  },
  {
    key: "EXCHANGE_OUT_FOR_PICKUP",
    label: "Exchange Out for Pickup",
    statuses: ["EXCHANGE_OUT_FOR_PICKUP"],
  },
  {
    key: "EXCHANGE_PICKED",
    label: "Exchange Picked",
    statuses: ["EXCHANGE_PICKED"],
  },
  {
    key: "EXCHANGE_RECEIVED",
    label: "Exchange Received",
    statuses: ["EXCHANGE_RECEIVED"],
  },
  {
    key: "EXCHANGE_PROCESSING",
    label: "Exchange Processing",
    statuses: ["EXCHANGE_PROCESSING"],
  },
  {
    key: "EXCHANGE_SHIPPED",
    label: "Exchange Shipped",
    statuses: ["EXCHANGE_SHIPPED"],
  },
  {
    key: "EXCHANGE_OUT_FOR_DELIVERY",
    label: "Exchange Out for Delivery",
    statuses: ["EXCHANGE_OUT_FOR_DELIVERY"],
  },
  {
    key: "EXCHANGE_DELIVERED",
    label: "Exchange Delivered",
    statuses: ["EXCHANGE_DELIVERED", "EXCHANGE_COMPLETED"],
  },
];

const IN_PROGRESS_EXCHANGE_STATUSES = [
  "exchangeRequested",
  "exchangeApproved",
  "pickupScheduled",
  "pickedUp",
  "inTransit",
  "receivedAtWarehouse",
  "qualityCheck",
  "exchangeShipped",
  "outForDelivery",
  "exchangeDelivered",
];

function isNormalDeliveryType(v) {
  return String(v || "").toUpperCase() === "NORMAL";
}

/** Local exchange stepper (black bar) only for quick delivery; NORMAL uses carrier tracking link when available. */
function isQuickDeliveryTypeForExchangeStepper(v) {
  const u = String(v || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return u === "ONE_DAY" || u === "90_MIN";
}

const INTEGRATOR_COURIER_LABELS = new Set([
  "delhivery",
  "shiprocket",
]);

function displayCourierName(name) {
  const label = String(name || "").trim();
  if (!label) return null;
  if (INTEGRATOR_COURIER_LABELS.has(label.toLowerCase())) return null;
  return label;
}

function resolveTrackingUrl(url, trackingNumber, provider) {
  const p = String(provider || "").toUpperCase();
  if (p === "SELF_SHIPPING") return null;

  const safeUrl = typeof url === "string" ? url.trim() : "";
  if (safeUrl) return safeUrl;
  if (!trackingNumber) return null;
  if (p === "SHIPROCKET") {
    return `https://shiprocket.co/tracking/${encodeURIComponent(String(trackingNumber))}`;
  }
  return null;
}

function isSelfShippingDelivery(data) {
  const item = data?.item || {};
  const shipment = data?.shipment || {};
  const provider = String(
    item.shippingProvider || shipment.shippingProvider || "",
  ).toUpperCase();
  if (provider === "SELF_SHIPPING") return true;
  const courier = String(item.courier || shipment.courier || "").toLowerCase();
  return courier.includes("self shipping") || courier.includes("self-shipping");
}

/** Unified shipment tracking for NORMAL delivery (Shiprocket, Delhivery, self shipping, or generic trackingId). */
function getCourierTrackingFromOrderItem(data) {
  const item = data?.item || {};
  const shipment = data?.shipment || {};
  const provider = String(
    item.shippingProvider || shipment.shippingProvider || "",
  ).toUpperCase();
  const itemStatus = String(data?.status || item.status || "").toUpperCase();

  const dl = item.delhivery || shipment.delhivery || {};
  const sr = item.shiprocket || shipment.shiprocket || data?.shiprocket || {};

  // Self shipping: reference ID only — never expose an external tracking URL.
  if (isSelfShippingDelivery(data)) {
    const trackingNumber =
      item.trackingId || data?.trackingId || shipment.trackingId || null;
    const hasProgress =
      trackingNumber ||
      (itemStatus &&
        !["CREATED", "CONFIRMED", "CANCELLED"].includes(itemStatus));
    if (!hasProgress) return null;
    return {
      trackingNumber,
      trackingUrl: null,
      status: data?.status || item.status || null,
      courier: null,
      selfShipping: true,
    };
  }

  if (provider === "DELHIVERY" || dl?.waybill) {
    const trackingNumber =
      dl.waybill ||
      item.trackingId ||
      data?.trackingId ||
      shipment.trackingId ||
      null;
    const trackingUrl = resolveTrackingUrl(
      dl.trackingUrl,
      trackingNumber,
      "DELHIVERY",
    );
    const hasAny = Boolean(
      trackingNumber ||
      trackingUrl ||
      (dl?.status && String(dl.status).trim()),
    );
    if (!hasAny) return null;
    return {
      trackingNumber,
      trackingUrl,
      status: dl.status || null,
      courier: displayCourierName(item.courier),
    };
  }

  if (
    provider === "SHIPROCKET" ||
    sr?.awbCode ||
    sr?.orderId != null ||
    sr?.shipmentId != null
  ) {
    const trackingNumber =
      sr.awbCode ||
      item.trackingId ||
      data?.trackingId ||
      shipment.trackingId ||
      null;
    const trackingUrl = resolveTrackingUrl(
      sr.trackingUrl,
      trackingNumber,
      "SHIPROCKET",
    );
    const hasAny = Boolean(
      trackingNumber ||
      trackingUrl ||
      sr?.orderId != null ||
      sr?.shipmentId != null ||
      (sr?.status && String(sr.status).trim()),
    );
    if (!hasAny) return null;
    return {
      trackingNumber,
      trackingUrl,
      status: sr.status || null,
      courier: displayCourierName(item.courier),
    };
  }

  const trackingNumber =
    item.trackingId || data?.trackingId || shipment.trackingId || null;
  const trackingUrl =
    resolveTrackingUrl(
      dl.trackingUrl || sr.trackingUrl,
      trackingNumber,
      provider || (isSelfShippingDelivery(data) ? "SELF_SHIPPING" : ""),
    ) || null;
  const hasAny = Boolean(
    trackingNumber ||
    trackingUrl ||
    (item?.courier && displayCourierName(item.courier)),
  );
  if (!hasAny) return null;
  return {
    trackingNumber,
    trackingUrl,
    status: dl.status || sr.status || null,
    courier: displayCourierName(item.courier),
  };
}

function getLatestExchangeRecord(exchange) {
  if (!exchange) return null;
  if (exchange.latestExchange && typeof exchange.latestExchange === "object")
    return exchange.latestExchange;
  const list = Array.isArray(exchange.exchanges) ? exchange.exchanges : [];
  if (!list.length) return null;
  // Prefer newest by updatedAt/createdAt; fallback to first entry.
  const sorted = [...list].sort((a, b) => {
    const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return tb - ta;
  });
  return sorted[0] || null;
}

function getExchangeShipmentTracking(data) {
  const latestExchange = getLatestExchangeRecord(data?.exchange) || {};
  const sr = latestExchange?.shiprocket || {};
  const returnOrder = sr?.returnOrder || null;
  const forwardOrder = sr?.forwardOrder || null;

  const returnNumber = returnOrder?.awbCode || null;
  const forwardNumber = forwardOrder?.awbCode || null;

  const returnTrackingUrl = resolveTrackingUrl(
    returnOrder?.trackingUrl,
    returnNumber,
    "SHIPROCKET",
  );
  const forwardTrackingUrl = resolveTrackingUrl(
    forwardOrder?.trackingUrl,
    forwardNumber,
    "SHIPROCKET",
  );

  const hasReturn = Boolean(
    returnNumber ||
    returnTrackingUrl ||
    returnOrder?.orderId != null ||
    returnOrder?.shipmentId != null,
  );
  const hasForward = Boolean(
    forwardNumber ||
    forwardTrackingUrl ||
    forwardOrder?.orderId != null ||
    forwardOrder?.shipmentId != null,
  );

  if (!hasReturn && !hasForward) return null;

  return {
    returnOrder: hasReturn
      ? {
          trackingNumber: returnNumber,
          status: returnOrder?.status || null,
          courier: displayCourierName(returnOrder?.courierName),
          trackingUrl: returnTrackingUrl,
        }
      : null,
    forwardOrder: hasForward
      ? {
          trackingNumber: forwardNumber,
          status: forwardOrder?.status || null,
          courier: displayCourierName(forwardOrder?.courierName),
          trackingUrl: forwardTrackingUrl,
        }
      : null,
  };
}

function getPrimaryExchangeLeg(exchangeTracking, currentStatus) {
  const forwardHasTracking = Boolean(
    exchangeTracking?.forwardOrder?.trackingUrl ||
    exchangeTracking?.forwardOrder?.trackingNumber,
  );
  const returnHasTracking = Boolean(
    exchangeTracking?.returnOrder?.trackingUrl ||
    exchangeTracking?.returnOrder?.trackingNumber,
  );

  // If backend has already created forward tracking, prefer that for primary tracking display.
  if (forwardHasTracking) return "forward";

  // Otherwise keep showing return pickup tracking while exchange is in reverse-flow stages.
  if (returnHasTracking) return "return";

  // Fallback to status-based default when links are still being generated.
  return [
    "EXCHANGE_SHIPPED",
    "EXCHANGE_OUT_FOR_DELIVERY",
    "EXCHANGE_DELIVERED",
    "EXCHANGE_COMPLETED",
  ].includes(currentStatus)
    ? "forward"
    : "return";
}

function formatStepperDate(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `On ${day}/${month}/${year}`;
}

function formatOrderDateTime(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const h = d.getHours() % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${date} ${month} ${year}, ${h}:${min} ${ampm}`;
}

function getStepStatus(statusHistory, currentStatus, step) {
  const statusUpper = (currentStatus || "").toUpperCase();
  const stepIndex = STEPPER.findIndex((s) => s.key === step.key);
  const completedStatuses = STEPPER.slice(0, stepIndex + 1).flatMap(
    (s) => s.statuses,
  );
  const isCompleted = completedStatuses.some((s) => statusUpper === s);
  const record = (statusHistory || []).find((r) =>
    step.statuses.includes((r.status || "").toUpperCase()),
  );
  return {
    completed: isCompleted,
    date: record?.createdAt
      ? formatStepperDate(record.createdAt)
      : isCompleted
        ? formatStepperDate(new Date())
        : "",
  };
}

/** Current step index (0–5) for progress bar; maps ORDER_STATUS_ENUM to stepper step */
function getCurrentStepIndex(currentStatus) {
  const statusUpper = (currentStatus || "").toUpperCase();
  for (let i = STEPPER.length - 1; i >= 0; i--) {
    if (STEPPER[i].statuses.includes(statusUpper)) return i;
  }
  return 0;
}

function getExchangeStepStatus(statusHistory, currentStatus, step) {
  const statusUpper = (currentStatus || "").toUpperCase();
  const stepIndex = EXCHANGE_STEPPER.findIndex((s) => s.key === step.key);
  const completedStatuses = EXCHANGE_STEPPER.slice(0, stepIndex + 1).flatMap(
    (s) => s.statuses,
  );
  const isCompleted = completedStatuses.some((s) => statusUpper === s);
  const record = (statusHistory || []).find((r) =>
    step.statuses.includes((r.status || "").toUpperCase()),
  );
  return {
    completed: isCompleted,
    date: record?.createdAt
      ? formatStepperDate(record.createdAt)
      : isCompleted
        ? formatStepperDate(new Date())
        : "",
  };
}

function getCurrentExchangeStepIndex(currentStatus) {
  const statusUpper = (currentStatus || "").toUpperCase();
  for (let i = EXCHANGE_STEPPER.length - 1; i >= 0; i--) {
    if (EXCHANGE_STEPPER[i].statuses.includes(statusUpper)) return i;
  }
  return 0;
}

function OrderStatusStepper({
  steps,
  currentStepIndex,
  statusHistory,
  currentStatus,
  resolveStepStatus,
}) {
  const progressPercent =
    steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
  const horizontalMinWidth = Math.max(640, steps.length * 96);

  const renderCircle = (reached) => (
    <div
      className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${
        reached ? "bg-black border-black" : "bg-gray-300 border-gray-400"
      }`}
    >
      {reached && (
        <span className="text-white text-[10px] font-bold leading-none">✓</span>
      )}
    </div>
  );

  return (
    <>
      {/* Phone: vertical timeline — readable at 320px without overlapping labels */}
      <div className="mb-8 md:hidden">
        <ol className="m-0 list-none p-0">
          {steps.map((step, idx) => {
            const reached = currentStepIndex >= idx;
            const { date } = resolveStepStatus(
              statusHistory,
              currentStatus,
              step,
            );
            const isLast = idx === steps.length - 1;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex w-5 flex-col items-center self-stretch">
                  {renderCircle(reached)}
                  {!isLast && (
                    <div
                      className={`my-1 w-0.5 flex-1 min-h-5 rounded-full ${
                        currentStepIndex > idx ? "bg-black" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
                  <p
                    className={`text-xs font-medium leading-snug ${
                      reached ? "text-black" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {date && reached && (
                    <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
                      {date}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* md+: horizontal stepper; scroll on narrower tablets */}
      <div className="mb-8 hidden overflow-x-auto pb-1 md:block lg:overflow-visible -mx-1 px-1">
        <div
          className="relative lg:min-w-0"
          style={{ minWidth: horizontalMinWidth }}
        >
          <div className="absolute left-0 right-0 top-[10px] h-2 w-full -translate-y-1/2 rounded-full bg-gray-200" />
          <div
            className="absolute left-0 top-[10px] h-2 -translate-y-1/2 rounded-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="relative z-10 flex flex-nowrap justify-between gap-0">
            {steps.map((step, idx) => {
              const reached = currentStepIndex >= idx;
              const { date } = resolveStepStatus(
                statusHistory,
                currentStatus,
                step,
              );
              return (
                <div
                  key={step.key}
                  className="flex w-[5.5rem] shrink-0 flex-col items-center px-0.5 lg:min-w-0 lg:w-auto lg:flex-1"
                >
                  {renderCircle(reached)}
                  <p
                    className={`mt-1.5 text-center text-[10px] font-medium leading-tight lg:text-xs ${
                      reached ? "text-black" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {date && reached && (
                    <p className="mt-0.5 text-center text-[9px] leading-tight text-gray-500 lg:text-[10px]">
                      {date}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function isDeliveryStepperRelevant(currentStatus) {
  const statusUpper = (currentStatus || "").toUpperCase();
  if (statusUpper === "CANCELLED") return false;
  if (EXCHANGE_STATUSES.includes(statusUpper)) return false;
  return true;
}

function ShipmentTrackingPanel({
  tracking,
  title = "Shipment tracking",
  subtitle,
  emptyMessage = "Tracking will appear here once your order is shipped.",
  compact = false,
}) {
  const boxClass = compact
    ? "mt-3 rounded border border-gray-200 bg-gray-50 px-4 py-3"
    : "py-4 mb-6 rounded border border-gray-200 bg-gray-50 px-4";

  return (
    <div className={boxClass}>
      <p className="text-[11px] font-bold tracking-wider text-gray-900 uppercase">
        {title}
      </p>
      {subtitle ? (
        <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      ) : null}
      {tracking ? (
        <div className={`space-y-1 text-sm text-gray-700 ${subtitle ? "mt-2" : "mt-2"}`}>
          {tracking.trackingNumber && (
            <p>
              {tracking.selfShipping && !tracking.trackingUrl
                ? "Reference"
                : "Tracking number"}{" "}
              : <strong className="font-mono">{tracking.trackingNumber}</strong>
            </p>
          )}
          {tracking.status && (
            <p>
              Shipment status :{" "}
              <strong className="uppercase">{String(tracking.status)}</strong>
            </p>
          )}
          {tracking.courier && !tracking.selfShipping && (
            <p>
              Carrier : <strong>{tracking.courier}</strong>
            </p>
          )}
          {tracking.trackingUrl ? (
            <a
              href={tracking.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className={
                compact
                  ? "inline-block mt-1 text-black font-semibold uppercase text-xs hover:underline"
                  : "inline-block mt-2 bg-black text-white px-4 py-2 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
              }
            >
              Track shipment
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-700">{emptyMessage}</p>
      )}
    </div>
  );
}

function isExchangeInProgress(exchange) {
  const latestExchange = getLatestExchangeRecord(exchange);
  if (!exchange?.hasExchange || !latestExchange?.status) return false;
  const s = (latestExchange.status || "").toLowerCase().replace(/_/g, "");
  const inProgress = IN_PROGRESS_EXCHANGE_STATUSES.map((x) =>
    x.toLowerCase().replace(/_/g, ""),
  );
  return inProgress.some((x) => s.includes(x) || x.includes(s));
}

export default function TrackOrderPage() {
  const { orderId, itemId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openSupportChat } = useSupportChat();
  const pincodeRedux = useSelector((s) => s?.location?.pincode) ?? null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    trackEvent({
      eventType: "order_tracking_view",
      orderId: orderId ? String(orderId) : undefined,
      itemId: itemId ? String(itemId) : undefined,
    });
  }, [orderId, itemId]);

  // Review state (per item for current user)
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Active policies (fetched from backend); if unavailable we fall back to local defaults above.
  const [cancelPolicy, setCancelPolicy] = useState(null);
  const [exchangePolicy, setExchangePolicy] = useState(null);

  const [cancelStep, setCancelStep] = useState(0);
  const [selectedCancelItemId, setSelectedCancelItemId] = useState(null);
  const [cancelReason, setCancelReason] = useState(FALLBACK_CANCEL_REASONS[0]);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const [exchangeStep, setExchangeStep] = useState(0);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);
  const [selectedExchangeItemId, setSelectedExchangeItemId] = useState(null);
  const [exchangeReason, setExchangeReason] = useState(
    FALLBACK_EXCHANGE_REASONS[0],
  );
  const [exchangeDesiredSize, setExchangeDesiredSize] = useState("");
  const [exchangeDesiredColor, setExchangeDesiredColor] = useState("");
  const [exchangeItemDetails, setExchangeItemDetails] = useState(null);
  const [exchangeItemLoading, setExchangeItemLoading] = useState(false);
  const [exchangeImages, setExchangeImages] = useState([]);
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false);
  const [exchangeError, setExchangeError] = useState(null);
  const [exchangePolicyAccepted, setExchangePolicyAccepted] = useState(false);

  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [invoiceAccordionOpen, setInvoiceAccordionOpen] = useState(false);

  const userName = user?.name || user?.firstName || "Customer";
  const currentUserId = user?._id || user?.id || user?.userId;

  const handleDownloadInvoice = () => {
    if (!orderId || !itemId) return;
    setInvoiceError(null);
    setInvoiceDownloading(true);
    orderService
      .downloadInvoice(orderId, itemId)
      .then(() => setInvoiceDownloading(false))
      .catch((err) => {
        setInvoiceError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to download invoice",
        );
        setInvoiceDownloading(false);
      });
  };

  useEffect(() => {
    if (!isAuthenticated || !orderId || !itemId) {
      setLoading(false);
      return;
    }
    console.log("[TrackOrder] REQ getOrderItemById", { orderId, itemId });
    orderService
      .getOrderItemById(orderId, itemId)
      .then((res) => {
        console.log("[TrackOrder] RES getOrderItemById", res?.data);
        const payload = res?.data?.data ?? res?.data;
        setData(payload);
        setSelectedCancelItemId(payload?.itemId ?? null);
        // After we know the item and status, try loading existing review (if any)
        const status = (payload?.status || "").toUpperCase();
        const resolvedItemId = payload?.itemId ?? itemId;
        if (status === "DELIVERED" && resolvedItemId && currentUserId) {
          loadUserReviewForItem(resolvedItemId, currentUserId);
        } else {
          setReview(null);
        }
      })
      .catch((err) => {
        console.log(
          "[TrackOrder] ERR getOrderItemById",
          err?.response?.data ?? err?.message,
        );
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load order details",
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, orderId, itemId, currentUserId]);

  // Helper to load current user's review for an item
  const loadUserReviewForItem = (resolvedItemId, currentUserIdVal) => {
    setReviewLoading(true);
    setReviewError(null);
    reviewsService
      .getByItem(resolvedItemId, { page: 1, limit: 50 })
      .then((res) => {
        const payload = res?.data?.data ?? res?.data;
        const list = payload?.reviews ?? payload?.data ?? [];
        const myReview = (list || []).find((r) => {
          const uid = r?.userId?._id || r?.userId?.id || r?.userId || r?.user;
          return (
            uid && currentUserIdVal && String(uid) === String(currentUserIdVal)
          );
        });
        if (myReview) {
          setReview(myReview);
          setReviewRating(Number(myReview.rating) || 5);
          setReviewText(myReview.description || "");
          setReviewModalOpen(false);
        } else {
          setReview(null);
          setReviewRating(5);
          setReviewText("");
          // Auto-open review modal when delivered and user has not posted a review yet
          setReviewModalOpen(true);
        }
      })
      .catch((err) => {
        setReviewError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load review",
        );
      })
      .finally(() => setReviewLoading(false));
  };

  const handleSubmitReview = (e) => {
    e?.preventDefault?.();
    if (!data?.itemId || !currentUserId) return;
    setReviewSubmitting(true);
    setReviewError(null);
    const commonPayload = {
      rating: reviewRating,
      description: reviewText?.trim() || "",
      files: reviewImages,
    };
    const promise = review
      ? reviewsService.update(review._id || review.id, commonPayload)
      : reviewsService.create({ ...commonPayload, itemId: data.itemId });

    promise
      .then((res) => {
        const payload = res?.data?.data ?? res?.data;
        setReview(payload ?? null);
        setReviewEditing(false);
        setReviewModalOpen(false);
      })
      .catch((err) => {
        setReviewError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to submit review",
        );
      })
      .finally(() => setReviewSubmitting(false));
  };

  const handleDeleteReview = () => {
    if (!review?._id && !review?.id) return;
    if (!window.confirm("Delete your review for this item?")) return;
    setReviewSubmitting(true);
    setReviewError(null);
    reviewsService
      .delete(review._id || review.id)
      .then(() => {
        setReview(null);
        setReviewRating(5);
        setReviewText("");
        setReviewImages([]);
        setReviewModalOpen(false);
      })
      .catch((err) => {
        setReviewError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to delete review",
        );
      })
      .finally(() => setReviewSubmitting(false));
  };

  // Load active cancellation & exchange policies once (for reasons + policy copy)
  useEffect(() => {
    if (!isAuthenticated) return;

    policyService
      .getActiveCancellation()
      .then((res) => {
        console.log("[TrackOrder] RES getActiveCancellation", res?.data);
        const payload = res?.data?.data ?? res?.data;
        if (payload) setCancelPolicy(payload);
      })
      .catch(() => {
        setCancelPolicy(null);
      });

    policyService
      .getActiveExchange()
      .then((res) => {
        console.log("[TrackOrder] RES getActiveExchange", res?.data);
        const payload = res?.data?.data ?? res?.data;
        if (payload) setExchangePolicy(payload);
      })
      .catch(() => {
        setExchangePolicy(null);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (exchangeStep === 1 && data?.item?.quantity != null) {
      const maxQty = Math.max(1, Number(data.item.quantity) || 1);
      setExchangeQuantity((prev) => (prev > maxQty ? maxQty : prev));
    }
  }, [exchangeStep, data?.item?.quantity]);

  useEffect(() => {
    if (exchangeStep !== 3 || !selectedExchangeItemId) {
      if (exchangeStep !== 3) setExchangeItemDetails(null);
      return;
    }
    setExchangeItemLoading(true);
    setExchangeItemDetails(null);
    setExchangeDesiredSize("");
    setExchangeDesiredColor("");
    const id =
      typeof selectedExchangeItemId === "string"
        ? selectedExchangeItemId
        : selectedExchangeItemId?.toString?.();
    // Prefer pincode from Redux location slice; fallback to order's delivery pincode if available.
    const pinFromOrder =
      data?.shipment?.deliveryPincode ??
      data?.item?.delivery?.pincode ??
      data?.deliveryPincode ??
      null;
    const pinCodeParam = pincodeRedux || pinFromOrder || null;
    itemsService
      // Use same param name pattern as ProductPage (`pincode`) so backend returns pincode-based availability.
      .getById(id, pinCodeParam ? { pincode: String(pinCodeParam) } : {})
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const item = data?.item ?? data;
        setExchangeItemDetails(item || null);
        // Preselect first color (for better UX), but keep size unselected so user must choose it.
        if (item?.variants?.length) {
          const firstVariant = item.variants[0];
          setExchangeDesiredColor(firstVariant?.color?.name ?? "");
          setExchangeDesiredSize("");
        }
      })
      .catch(() => setExchangeItemDetails(null))
      .finally(() => setExchangeItemLoading(false));
  }, [
    exchangeStep,
    selectedExchangeItemId,
    pincodeRedux,
    data?.shipment?.deliveryPincode,
    data?.item?.delivery?.pincode,
    data?.deliveryPincode,
  ]);

  const openCancelModal = () => {
    setCancelError(null);
    setPolicyAccepted(false);
    setCancelStep(1);
    setSelectedCancelItemId(data?.itemId ?? null);
    // When policy is loaded, default to its first reason; otherwise fallback.
    const reasons = (cancelPolicy?.cancellationReasons || []).filter(Boolean);
    setCancelReason((reasons[0] || FALLBACK_CANCEL_REASONS[0]) ?? "");
  };

  const closeCancelModal = () => {
    setCancelStep(0);
    setCancelError(null);
    if (cancelStep === 3) {
      orderService
        .getOrderItemById(orderId, itemId)
        .then((res) => {
          const payload = res?.data?.data ?? res?.data;
          setData(payload);
        })
        .catch(() => {});
    }
  };

  const cancelModalContinue = () => {
    if (cancelStep === 1) {
      setPolicyAccepted(false);
      setCancelStep(2);
      return;
    }
    if (cancelStep === 2) {
      setCancelError(null);
      setCancelSubmitting(true);
      cancellationService
        .cancelOrderItem({
          orderId,
          itemId: selectedCancelItemId,
          reason: cancelReason,
          couponIssued: true,
        })
        .then(() => {
          setCancelStep(0);
          setCancelError(null);
          navigateToOrderCancelled(navigate, {
            orderId,
            itemId: selectedCancelItemId,
            reason: cancelReason,
            paymentMode: resolvePaymentMode(data),
            isCod: isCodPayment(data),
          });
        })
        .catch((err) => {
          setCancelError(
            err?.response?.data?.message ??
              err?.message ??
              "Failed to cancel item",
          );
        })
        .finally(() => setCancelSubmitting(false));
    }
  };

  const openExchangeModal = () => {
    setExchangeQuantity(1);
    setExchangeError(null);
    setExchangePolicyAccepted(false);
    setExchangeStep(1);
    setSelectedExchangeItemId(data?.itemId ?? null);
    const reasons = (exchangePolicy?.exchangeReasons || []).filter(Boolean);
    setExchangeReason((reasons[0] || FALLBACK_EXCHANGE_REASONS[0]) ?? "");
    setExchangeDesiredSize("");
    setExchangeDesiredColor("");
    setExchangeImages([]);
  };

  const closeExchangeModal = () => {
    const wasSuccess = exchangeStep === 5;
    setExchangeStep(0);
    setExchangeError(null);
    if (wasSuccess) {
      orderService
        .getOrderItemById(orderId, itemId)
        .then((res) => {
          const payload = res?.data?.data ?? res?.data;
          setData(payload);
        })
        .catch(() => {});
    }
  };

  const exchangeModalContinue = () => {
    if (exchangeStep === 1) {
      setExchangeStep(2);
      return;
    }
    if (exchangeStep === 2) {
      setExchangeStep(3);
      return;
    }
    if (exchangeStep === 3) {
      if (!exchangeDesiredColor.trim() || !exchangeDesiredSize.trim()) {
        setExchangeError("Please select size and color.");
        return;
      }
      setExchangeError(null);
      setExchangeStep(4);
      return;
    }
    if (exchangeStep === 4) {
      if (exchangeImages.length < 3) {
        setExchangeError("Please upload at least 3 images.");
        return;
      }
      if (exchangeImages.length > 5) {
        setExchangeError("Maximum 5 images allowed.");
        return;
      }
      setExchangeError(null);
      setExchangeSubmitting(true);
      const selectedEntry = bookedItems.find(
        (e) => e.itemId?.toString() === selectedExchangeItemId?.toString(),
      );
      const selectedItemQuantity = Math.max(
        1,
        Number(selectedEntry?.item?.quantity) || 1,
      );
      const quantityToSend = Math.min(exchangeQuantity, selectedItemQuantity);
      const selectedVariant = exchangeItemDetails?.variants?.find(
        (v) => v.color?.name === exchangeDesiredColor,
      );
      const selectedSizeObj = selectedVariant?.sizes?.find(
        (s) => String(s.size ?? "").trim() === exchangeDesiredSize.trim(),
      );
      const variantImageUrl =
        selectedVariant?.images?.[0]?.url ||
        selectedVariant?.imageUrl ||
        exchangeItemDetails?.imageUrl ||
        data?.item?.variant?.imageUrl ||
        "";
      const unitPriceValue =
        selectedSizeObj?.price ??
        selectedVariant?.price ??
        exchangeItemDetails?.discountedPrice ??
        exchangeItemDetails?.price ??
        data?.item?.unitPrice;
      const fallbackSku = data?.item?.variant?.sku || data?.item?.sku || "";
      const fallbackColor =
        data?.item?.variant?.color || exchangeDesiredColor.trim();
      const fallbackSize =
        data?.item?.variant?.size || exchangeDesiredSize.trim();
      const fallbackHex = data?.item?.variant?.hex || "#FFFFFF";
      const replacedItem = {
        itemId:
          exchangeItemDetails?._id ||
          exchangeItemDetails?.id ||
          selectedExchangeItemId,
        sku: selectedSizeObj?.sku || selectedVariant?.sku || fallbackSku,
        variant: {
          color: exchangeDesiredColor.trim() || fallbackColor,
          size: exchangeDesiredSize.trim() || fallbackSize,
          sku: selectedSizeObj?.sku || selectedVariant?.sku || fallbackSku,
          hex: selectedVariant?.color?.hex || fallbackHex,
          imageUrl: variantImageUrl,
        },
        unitPrice: Number(unitPriceValue ?? 0),
      };
      if (
        !replacedItem.itemId ||
        !replacedItem.sku ||
        !replacedItem.variant.color ||
        !replacedItem.variant.size ||
        !replacedItem.variant.sku ||
        !replacedItem.variant.imageUrl ||
        !(replacedItem.unitPrice > 0)
      ) {
        setExchangeError(
          "Unable to prepare replaced item details. Please reselect color and size.",
        );
        setExchangeSubmitting(false);
        return;
      }
      console.log("[TrackOrder][ExchangeCreatePayload]", {
        orderId,
        itemId: selectedExchangeItemId,
        quantityToExchange: quantityToSend,
        reason: exchangeReason?.trim() || "Exchange requested",
        desiredSize: exchangeDesiredSize.trim() || undefined,
        desiredColor: exchangeDesiredColor.trim() || undefined,
        replacedItem,
      });
      exchangeService

        .createExchangeRequest(
          {
            orderId,
            itemId: selectedExchangeItemId,
            quantityToExchange: quantityToSend,
            reason: exchangeReason?.trim() || "Exchange requested",
            desiredSize: exchangeDesiredSize.trim() || undefined,
            desiredColor: exchangeDesiredColor.trim() || undefined,
            replacedItem,
          },
          exchangeImages,
        )
        .then(() => {
          setExchangeStep(5);
        })
        .catch((err) => {
          setExchangeError(
            err?.response?.data?.message ??
              err?.message ??
              "Failed to create exchange request",
          );
        })
        .finally(() => setExchangeSubmitting(false));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Please sign in to track your order.</p>
          <Link
            to={ROUTES.AUTH}
            className="mt-4 inline-block text-black font-semibold uppercase hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-red-600">{error || "Order not found."}</p>
          <Link
            to={ROUTES.ORDERS}
            className="mt-4 inline-block text-black font-semibold uppercase hover:underline"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const item = data.item || {};
  const brand = item.brandName || item.brand || "—";
  const name = item.name || item.shortDescription || "—";
  const imageUrl = item.variant?.imageUrl ?? "";
  const baseTrackingId = data.shipment?.trackingId || data.trackingId || null;
  const deliveryType =
    data?.item?.delivery?.type ||
    data?.shipment?.deliveryType ||
    data?.deliveryType ||
    null;
  const isNormalDelivery = isNormalDeliveryType(deliveryType);
  const currentStatus = (data.status || "").toUpperCase();
  const exchangeTracking = getExchangeShipmentTracking(data);
  const latestExchange = getLatestExchangeRecord(data?.exchange);
  const inExchangeFlow = EXCHANGE_STATUSES.includes(currentStatus);
  const primaryExchangeLeg = getPrimaryExchangeLeg(
    exchangeTracking,
    currentStatus,
  );
  const primaryExchangeOrder =
    primaryExchangeLeg === "forward"
      ? exchangeTracking?.forwardOrder
      : exchangeTracking?.returnOrder;

  // Override normal tracking with exchange tracking once exchange flow starts.
  const trackingId = inExchangeFlow
    ? primaryExchangeOrder?.trackingNumber || baseTrackingId || null
    : baseTrackingId;

  const normalCourierTracking = isNormalDelivery
    ? getCourierTrackingFromOrderItem(data)
    : null;
  const isSelfShippedOrder = isNormalDelivery && isSelfShippingDelivery(data);

  const shipmentTracking = inExchangeFlow
    ? primaryExchangeOrder
      ? {
          trackingNumber: primaryExchangeOrder.trackingNumber,
          trackingUrl: primaryExchangeOrder.trackingUrl,
          status: primaryExchangeOrder.status || null,
          courier: primaryExchangeOrder.courier || null,
        }
      : null
    : normalCourierTracking;

  const shipmentTrackingSubtitle = inExchangeFlow
    ? shipmentTracking?.trackingUrl
      ? "Track your exchange shipment using the link below."
      : "Exchange shipment updates appear in the status timeline below."
    : isSelfShippedOrder
      ? shipmentTracking?.trackingNumber
        ? "Use your reference below for delivery updates from our team."
        : "Order updates appear in the status timeline below."
      : isNormalDelivery
        ? shipmentTracking?.trackingUrl
          ? "Your package is shipped with our delivery partner. Use the link below for live updates."
          : "Shipment updates appear in the status timeline below."
        : undefined;
  const orderNo = data.orderId || "—";
  const statusHistory = data.statusHistory || [];
  const otherItems = data.otherItemsInOrder || [];
  const currentItemIdStr = (data.itemId ?? itemId)?.toString();
  const allBookedEntries = [{ item, itemId: data.itemId }].concat(
    otherItems.map((o) => ({
      item: {
        ...(o.item || {}),
        name: o.name,
        shortDescription: o.shortDescription,
      },
      itemId: o.itemId,
    })),
  );
  // Deduplicate by itemId so the same item does not appear twice
  const seenIds = new Set();
  const bookedItems = allBookedEntries.filter((entry) => {
    const id = entry.itemId?.toString();
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
  // Other line items in the same order (exclude the item currently being tracked)
  const otherBookedItemsForList = bookedItems.filter(
    (entry) => entry.itemId?.toString() !== currentItemIdStr,
  );
  const showBookedItemsSection = otherBookedItemsForList.length > 0;
  const isCancellable = data.isCancellable === true;
  const showCancelOrderButton =
    isCancellable &&
    CANCEL_ORDER_UI_STATUSES.has(currentStatus) &&
    !EXCHANGE_STATUSES.includes(currentStatus);
  const isExchangeable = data.isExchangeable !== false;
  const exchangeInProgress = isExchangeInProgress(data.exchange);
  const showExchangeButton =
    isExchangeable && !exchangeInProgress && currentStatus === "DELIVERED";
  const showDeliveryStepper = isDeliveryStepperRelevant(currentStatus);
  const showExchangeStepper =
    currentStatus !== "CANCELLED" &&
    EXCHANGE_STATUSES.includes(currentStatus) &&
    currentStatus !== "EXCHANGE_REJECTED" &&
    isQuickDeliveryTypeForExchangeStepper(deliveryType);

  console.log("[TrackOrder][TrackingDebug]", {
    orderId,
    itemId,
    currentStatus,
    inExchangeFlow,
    deliveryType,
    primaryExchangeLeg,
    baseTrackingId,
    activeTrackingId: trackingId,
    activeTrackingUrl: shipmentTracking?.trackingUrl || null,
    normalCourierTracking,
    isSelfShippedOrder,
    latestExchangeSource: data?.exchange?.latestExchange
      ? "latestExchange"
      : "exchanges[]",
    latestExchangeStatus: latestExchange?.status || null,
    exchangeTracking,
  });

  // Delivery boy from API (returned for SHIPPED / OUT_FOR_DELIVERY or exchange pickup/delivery when driver assigned)
  const deliveryBoyName =
    data.deliveryBoy?.name ?? data.shipment?.deliveryAgentName ?? null;
  const deliveryBoyPhone =
    data.deliveryBoy?.phoneNumber ?? data.shipment?.deliveryAgentPhone ?? null;
  // Delivery partner visible only: (1) between Out for delivery → Delivered, (2) between Exchange out for pickup → Exchange picked, (3) between Exchange out for delivery → Exchange delivered
  const deliveryStatusesShowDriver = [
    "OUT_FOR_DELIVERY",
    "EXCHANGE_OUT_FOR_PICKUP",
    "EXCHANGE_PICKED",
    "EXCHANGE_OUT_FOR_DELIVERY",
    "EXCHANGE_DELIVERED",
  ];
  const showDeliveryBoyContact =
    (deliveryBoyName || deliveryBoyPhone) &&
    deliveryStatusesShowDriver.includes(currentStatus);

  return (
    <div className="min-h-screen bg-gray-100 pt-26 pb-12">
      <div className="px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-black uppercase">
            HI {String(userName).toUpperCase()},
          </h1>
          <p className="text-gray-700 mt-1">
            Here The Latest Update On Your Order!
          </p>
        </div>

        {/* Order item summary card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full max-w-[min(100%,20rem)] aspect-square mx-auto sm:mx-0 sm:max-w-none sm:w-56 sm:h-56 md:w-64 md:h-64 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-3 sm:p-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="max-h-full max-w-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
            </div>
            <div className="min-w-0">
              {/* <p className="font-bold text-black uppercase">{brand}</p> */}
              <p className="text-gray-800 mt-1 normal-case">{name}</p>
              {trackingId &&
                (!isSelfShippedOrder || normalCourierTracking?.trackingNumber) && (
                <p className="text-gray-600 text-sm mt-2">
                  {isSelfShippedOrder ? "Reference" : "Tracking ID"} :{" "}
                  <strong>#{trackingId}</strong>
                </p>
              )}
              <p className="text-gray-600 text-sm mt-0.5">
                Order No : <strong>{orderNo}</strong>
              </p>
              {data?.orderCreatedAt && (
                <p className="text-gray-600 text-sm mt-0.5">
                  Order placed :{" "}
                  <strong>{formatOrderDateTime(data.orderCreatedAt)}</strong>
                </p>
              )}
              <p className="text-gray-600 text-sm mt-0.5">
                Payment : <strong>{formatPaymentLine(data)}</strong>
              </p>
              {getPaymentStatus(data) && getPaymentStatus(data) !== "SUCCESS" && (
                <p className="text-gray-500 text-xs mt-0.5">
                  Payment status: {getPaymentStatusLabel(data)}
                </p>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const resolvedItemId = data.itemId ?? itemId;
                    let supportIssueType = "ORDER_ISSUE";
                    if (inExchangeFlow) {
                      supportIssueType = "EXCHANGE";
                    } else if (
                      ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(currentStatus)
                    ) {
                      supportIssueType = "DELIVERY";
                    }
                    openSupportChat({
                      orderId,
                      itemId: resolvedItemId,
                      orderCode: orderNo,
                      productName: name,
                      issueType: supportIssueType,
                      subject: `Help with order ${orderNo}`,
                      description: `I need help with "${name}" from order ${orderNo}. Current status: ${currentStatus.replaceAll("_", " ")}.`,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-sm border border-black bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-gray-800"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Chat with us
                </button>
              </div>
              {/* {data?.item?.paymentStatus && (
                <p className="text-gray-600 text-sm mt-1">
                  Payment status :{" "}
                  <strong className="capitalize">
                    {data.item.paymentStatus.toLowerCase()}
                  </strong>
                  {data.item.paymentStatus === "COLLECTED" &&
                    data.item.paymentCollectedMethod && (
                      <span className="text-gray-500">
                        {" "}
                        ({data.item.paymentCollectedMethod})
                      </span>
                    )}
                </p>
              )} */}
            </div>
          </div>
        </div>

        {/* Invoice accordion: closed by default, click to open */}
        {data?.item && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setInvoiceAccordionOpen((o) => !o)}
              className="w-full flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-black uppercase text-sm">
                  Invoice
                </h2>
                <span
                  className={`inline-block transition-transform duration-200 ${invoiceAccordionOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </div>
              <span className="text-sm font-semibold">
                ₹{(Number(data.item.finalPayable) ?? 0).toFixed(2)}
              </span>
            </button>
            {invoiceAccordionOpen && (
              <div className="px-6 pb-6 pt-0 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-4">
                  <span className="text-gray-600 text-sm">Details</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadInvoice();
                    }}
                    disabled={invoiceDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
                  >
                    {invoiceDownloading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Downloading…
                      </>
                    ) : (
                      <>↓ Download invoice </>
                    )}
                  </button>
                </div>
                {invoiceError && (
                  <p className="text-sm text-red-600 mb-3">{invoiceError}</p>
                )}
                {data.item.invoiceLineId && (
                  <p className="text-gray-600 text-sm mb-4">
                    Invoice No. <strong>{data.item.invoiceLineId}</strong>
                  </p>
                )}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>
                      ₹
                      {(
                        Number(data.item.itemSubtotal) ??
                        (Number(data.item.unitPrice) || 0) *
                          (Number(data.item.quantity) || 1)
                      ).toFixed(2)}
                    </span>
                  </div>
                  {data.item.delivery?.charge != null &&
                    Number(data.item.delivery.charge) !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Delivery ({data.item.delivery?.type || "Delivery"})
                        </span>
                        <span>
                          ₹{Number(data.item.delivery.charge).toFixed(2)}
                        </span>
                      </div>
                    )}
                  {Array.isArray(data.item.charges) &&
                    data.item.charges.length > 0 &&
                    data.item.charges.map((ch, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {ch.key || ch.description || "Charge"}
                        </span>
                        <span>₹{(Number(ch.amount) || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  {data.item.gst?.amount != null &&
                    Number(data.item.gst.amount) !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          GST{" "}
                          {data.item.gst?.percent
                            ? `(${data.item.gst.percent}%)`
                            : ""}
                        </span>
                        <span>₹{Number(data.item.gst.amount).toFixed(2)}</span>
                      </div>
                    )}
                  {data.item.couponDiscount?.discountAmount != null &&
                    Number(data.item.couponDiscount.discountAmount) !== 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>
                          Coupon{" "}
                          {data.item.couponDiscount?.code
                            ? `(${data.item.couponDiscount.code})`
                            : ""}
                        </span>
                        <span>
                          - ₹
                          {Number(
                            data.item.couponDiscount.discountAmount,
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>
                      ₹{(Number(data.item.finalPayable) ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order status card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-black uppercase text-sm mb-1">
            ORDER STATUS
          </h2>
          <p className="text-gray-600 text-sm mb-6">ORDER #{orderNo}</p>

          {(isNormalDelivery || inExchangeFlow) && (
            <ShipmentTrackingPanel
              tracking={shipmentTracking}
              title={
                inExchangeFlow
                  ? primaryExchangeLeg === "forward"
                    ? "Replacement shipment"
                    : "Return pickup shipment"
                  : isNormalDelivery
                    ? "Standard delivery tracking"
                    : "Shipment tracking"
              }
              subtitle={shipmentTrackingSubtitle}
              emptyMessage={
                isSelfShippedOrder
                  ? "Shipment details will appear here once your order is on the way."
                  : "Tracking will appear here once your order is shipped."
              }
            />
          )}

          {/* Status: Cancelled */}
          {currentStatus === "CANCELLED" && (
            <div className="py-4 mb-6 rounded border border-red-200 bg-red-50">
              <p className="text-red-700 font-semibold uppercase text-sm">
                Order item cancelled
              </p>
              <p className="text-gray-600 text-sm mt-1">
                This item has been cancelled.
              </p>
            </div>
          )}

          {/* Status: Exchange rejected – show admin rejection note when provided */}
          {currentStatus === "EXCHANGE_REJECTED" && (
            <div className="py-4 mb-6 rounded border border-amber-200 bg-amber-50 px-4">
              <p className="text-amber-800 font-semibold uppercase text-sm">
                Exchange request rejected
              </p>
              <p className="text-gray-700 text-sm mt-1">
                Your exchange request was rejected.
              </p>
              {(latestExchange?.adminRemark || "").trim() && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs font-semibold uppercase text-amber-900 mb-1">
                    Reason from store
                  </p>
                  <p className="text-sm text-gray-800">
                    {latestExchange.adminRemark.trim()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Exchange tracking (pickup/return + replacement forward). */}
          {!isNormalDelivery && exchangeTracking && (
            <div className="py-4 mb-6 rounded border border-gray-200 bg-gray-50 px-4">
              <p className="text-gray-900 font-semibold uppercase text-sm">
                Exchange shipments
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Track return pickup and replacement delivery separately.
              </p>

              <div className="mt-3 space-y-3">
                {exchangeTracking.returnOrder && (
                  <div
                    className={`rounded border px-3 py-2 ${primaryExchangeLeg === "return" ? "border-gray-400 bg-white" : "border-gray-200 bg-white/70"}`}
                  >
                    <ShipmentTrackingPanel
                      compact
                      tracking={exchangeTracking.returnOrder}
                      title="Return pickup"
                      emptyMessage="Return pickup tracking is not available yet."
                    />
                  </div>
                )}

                {exchangeTracking.forwardOrder && (
                  <div
                    className={`rounded border px-3 py-2 ${primaryExchangeLeg === "forward" ? "border-gray-400 bg-white" : "border-gray-200 bg-white/70"}`}
                  >
                    <ShipmentTrackingPanel
                      compact
                      tracking={exchangeTracking.forwardOrder}
                      title="Replacement delivery"
                      emptyMessage="Replacement tracking is not available yet."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {showExchangeStepper && (
            <OrderStatusStepper
              steps={EXCHANGE_STEPPER}
              currentStepIndex={getCurrentExchangeStepIndex(currentStatus)}
              statusHistory={statusHistory}
              currentStatus={currentStatus}
              resolveStepStatus={getExchangeStepStatus}
            />
          )}

          {showDeliveryStepper && (
            <OrderStatusStepper
              steps={STEPPER}
              currentStepIndex={getCurrentStepIndex(currentStatus)}
              statusHistory={statusHistory}
              currentStatus={currentStatus}
              resolveStepStatus={getStepStatus}
            />
          )}

          {/* Contact delivery partner (delivery or exchange pickup/delivery when driver assigned) + Cancel + Exchange */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
            {showDeliveryBoyContact ? (
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">
                  {[
                    "EXCHANGE_PICKUP_SCHEDULED",
                    "EXCHANGE_OUT_FOR_PICKUP",
                    "EXCHANGE_PICKED",
                  ].includes(currentStatus)
                    ? "Assigned driver (pickup)"
                    : [
                          "EXCHANGE_SHIPPED",
                          "EXCHANGE_OUT_FOR_DELIVERY",
                          "EXCHANGE_DELIVERED",
                        ].includes(currentStatus)
                      ? "Assigned driver (exchange delivery)"
                      : "Contact delivery partner"}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                    {(deliveryBoyName || "D").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {deliveryBoyName || "Delivery partner"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {deliveryBoyPhone || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              {showCancelOrderButton && (
                <button
                  type="button"
                  onClick={openCancelModal}
                  className="bg-black text-white px-6 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Cancel order
                </button>
              )}
              {showExchangeButton && (
                <button
                  type="button"
                  onClick={openExchangeModal}
                  className="bg-black text-white px-6 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Exchange
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Your review – show after delivery */}
        {currentStatus === "DELIVERED" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-bold text-black uppercase text-sm mb-3">
              Your review
            </h2>
            {reviewLoading ? (
              <p className="text-sm text-gray-500">Loading your review…</p>
            ) : review ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`Rating ${review.rating} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const ratingNum = Number(review.rating) || 0;
                      const filled = star <= ratingNum;
                      return (
                        <span
                          key={star}
                          className={`text-lg leading-none ${filled ? "text-black" : "text-gray-200"}`}
                        >
                          ★
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-600">
                    {Number(review.rating) || 0} / 5
                  </span>
                </div>
                {review.description?.trim() ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
                    {review.description.trim()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-3">
                    No written review.
                  </p>
                )}
                {(review.imageUrl ||
                  (Array.isArray(review.images) &&
                    review.images.length > 0)) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {review.imageUrl && (
                      <img
                        src={review.imageUrl}
                        alt=""
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1"
                      />
                    )}
                    {Array.isArray(review.images) &&
                      review.images.map((img, i) => {
                        const src = img?.url || img?.imageUrl;
                        if (!src) return null;
                        return (
                          <img
                            key={img?.imageKey || img?.key || i}
                            src={src}
                            alt=""
                            className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1"
                          />
                        );
                      })}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewRating(Number(review.rating) || 5);
                      setReviewText(review.description || "");
                      setReviewImages([]);
                      setReviewError(null);
                      setReviewEditing(true);
                      setReviewModalOpen(true);
                    }}
                    className="bg-black text-white px-5 py-2 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                  >
                    Edit review
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={reviewSubmitting}
                    className="bg-white text-red-600 border border-red-600 px-5 py-2 text-xs font-semibold uppercase hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete review
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  You haven&apos;t reviewed this product yet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReviewRating(5);
                    setReviewText("");
                    setReviewImages([]);
                    setReviewError(null);
                    setReviewEditing(false);
                    setReviewModalOpen(true);
                  }}
                  className="bg-black text-white px-5 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Rate & review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Booked items card – only when there are other items in the order */}
        {showBookedItemsSection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-black uppercase text-sm mb-4">
              BOOKED ITEMS
            </h2>
            <ul className="space-y-4">
              {otherBookedItemsForList.map((entry, idx) => {
                const it = entry.item || {};
                const img = it.variant?.imageUrl ?? "";
                const n = it.name || it.shortDescription || "—";
                const trackPath = getOrderTrackPath(orderId, entry.itemId);
                return (
                  <li key={entry.itemId?.toString() || idx}>
                    <Link
                      to={trackPath}
                      className="flex gap-4 items-center rounded-lg border border-transparent p-2 -m-2 transition-colors hover:bg-gray-50 hover:border-gray-200"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-1.5">
                        {img ? (
                          <img
                            src={img}
                            alt={n}
                            className="max-h-full max-w-full object-contain object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-700 text-sm normal-case">{n}</p>
                      </div>
                      <span className="text-gray-400 shrink-0">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <Link
            to={ROUTES.ORDERS}
            className="text-sm font-medium uppercase text-gray-700 hover:text-black hover:underline"
          >
            ← Back to orders
          </Link>
        </div>

        {/* Cancel flow: 3 modals */}
        {cancelStep > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeCancelModal()}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {cancelStep === 1 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">Reason</h3>
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black"
                      aria-label="Close"
                      onClick={closeCancelModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-black uppercase text-sm mb-3">
                      Reason for cancel
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      Select the item you want to cancel:
                    </p>
                    <ul className="space-y-2 mb-4">
                      {bookedItems
                        .filter(
                          (entry) =>
                            entry.itemId?.toString() ===
                            (data?.itemId ?? itemId)?.toString(),
                        )
                        .map((entry, idx) => {
                          const it = entry.item || {};
                          const label =
                            [
                              it.brandName || it.brand,
                              it.name || it.shortDescription,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Item";
                          const idVal = entry.itemId?.toString?.() ?? idx;
                          const isSelected =
                            selectedCancelItemId?.toString?.() === idVal;
                          return (
                            <li key={idVal}>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="radio"
                                  name="cancelItem"
                                  checked={isSelected}
                                  onChange={() =>
                                    setSelectedCancelItemId(entry.itemId)
                                  }
                                  className="w-4 h-4 border-gray-300 text-black"
                                />
                                <span className="text-sm uppercase text-gray-800">
                                  {label}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                    </ul>
                    <p className="text-xs text-gray-600 mb-2 mt-4">
                      Reason for cancellation:
                    </p>
                    <ul className="space-y-2">
                      {(cancelPolicy?.cancellationReasons?.length
                        ? cancelPolicy.cancellationReasons
                        : FALLBACK_CANCEL_REASONS
                      ).map((r) => {
                        const isSelected = cancelReason === r;
                        return (
                          <li key={r}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="cancelReason"
                                checked={isSelected}
                                onChange={() => setCancelReason(r)}
                                className="w-4 h-4 border-gray-300 text-black"
                              />
                              <span className="text-sm uppercase text-gray-800">
                                {r}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={cancelModalContinue}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
              {cancelStep === 2 && (
                <>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-bold tracking-wider text-black uppercase">
                      Policies
                    </h3>
                    <button
                      type="button"
                      className="p-1.5 rounded text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                      aria-label="Close"
                      onClick={closeCancelModal}
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                  </div>
                  <div className="px-5 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {cancelPolicy ? (
                      <>
                        {cancelPolicy.name?.trim() && (
                          <div>
                            <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                              Policy name
                            </p>
                            <p className="text-sm font-normal text-gray-700">
                              {cancelPolicy.name.trim()}
                            </p>
                          </div>
                        )}
                        {(cancelPolicy.description?.trim() ?? "") && (
                          <div>
                            <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                              Description
                            </p>
                            <p className="text-sm font-normal text-gray-600 leading-relaxed whitespace-pre-line">
                              {cancelPolicy.description.trim()}
                            </p>
                          </div>
                        )}
                        {cancelPolicy.cancellationReasons?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                              Cancellation reasons
                            </p>
                            <p className="text-sm font-normal text-gray-600">
                              {cancelPolicy.cancellationReasons.join(", ")}
                            </p>
                          </div>
                        )}
                        {cancelPolicy.policies &&
                          typeof cancelPolicy.policies === "object" &&
                          Object.keys(cancelPolicy.policies).length > 0 && (
                            <div className="space-y-4">
                              <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                                Policy rules
                              </p>
                              {Object.entries(cancelPolicy.policies).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <p className="text-[11px] font-semibold tracking-wider text-black uppercase mb-1">
                                      {key
                                        .replace(/([A-Z])/g, " $1")
                                        .replace(/^./, (s) => s.toUpperCase())}
                                    </p>
                                    <p className="text-sm font-normal text-gray-600 leading-relaxed">
                                      {Array.isArray(value)
                                        ? value.join(", ")
                                        : String(value ?? "")}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                            Order cancellation
                          </p>
                          <p className="text-sm font-normal text-gray-600 leading-relaxed">
                            If you choose to cancel your order after it has been
                            booked, the cancellation will be processed as per
                            the store&apos;s cancellation policy.
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold tracking-wider text-black uppercase mb-1.5">
                            Refund method
                          </p>
                          <p className="text-sm font-normal text-gray-600 leading-relaxed">
                            Refunds may be issued as coupons or other methods
                            according to the store&apos;s refund policy.
                          </p>
                        </div>
                      </>
                    )}
                    <label className="flex items-start gap-3 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 shrink-0 accent-blue-600"
                      />
                      <span className="text-sm font-normal text-gray-700 leading-snug">
                        I accept the terms and conditions of the cancellation
                        and refund policy.
                      </span>
                    </label>
                  </div>
                  {cancelError && (
                    <p className="px-5 pb-1 text-red-600 text-sm">
                      {cancelError}
                    </p>
                  )}
                  <div className="px-5 py-4 border-t border-gray-200 bg-gray-50/50">
                    <button
                      type="button"
                      onClick={cancelModalContinue}
                      disabled={cancelSubmitting || !policyAccepted}
                      className="w-full bg-black text-white py-3.5 text-sm font-bold tracking-wider uppercase hover:bg-gray-800 active:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                    >
                      {cancelSubmitting ? "Cancelling…" : "Continue"}
                    </button>
                  </div>
                </>
              )}
              {cancelStep === 3 && (
                <>
                  <div className="flex justify-end p-4">
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black"
                      aria-label="Close"
                      onClick={closeCancelModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="px-4 pb-6 pt-0 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4 relative">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="font-bold text-black uppercase text-lg mb-2">
                      Order cancelled successfully
                    </h3>
                    {isCodPayment(data) ? (
                      <p className="text-sm text-gray-600">
                        This order item has been cancelled.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          The refund coupon will be added to your Coupons
                          section within 24 hours.
                        </p>
                        <Link
                          to={ROUTES.COUPONS}
                          className="mt-4 inline-block text-sm font-semibold uppercase text-black hover:underline"
                        >
                          View coupons
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exchange flow: 3 modals */}
        {exchangeStep > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) =>
              e.target === e.currentTarget && closeExchangeModal()
            }
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {exchangeStep === 1 &&
                (() => {
                  const currentItemQuantity = Math.max(
                    1,
                    Number(data?.item?.quantity) || 1,
                  );
                  const quantityOptions =
                    getExchangeQuantityOptions(currentItemQuantity);
                  const clampedQuantity = Math.min(
                    exchangeQuantity,
                    currentItemQuantity,
                  );
                  const maxDays = exchangePolicy?.maxExchangeTimeInDays ?? 3;
                  const maxLimit = exchangePolicy?.maxExchangeLimit ?? 1;
                  return (
                    <>
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="font-bold text-black uppercase text-sm">
                          Select the quantity to be exchanged
                        </h3>
                        <button
                          type="button"
                          className="p-1 text-gray-500 hover:text-black text-lg"
                          aria-label="Close"
                          onClick={closeExchangeModal}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <p className="text-xs text-gray-600 mb-2">
                          Current order quantity: {currentItemQuantity}
                        </p>
                        <div className="relative">
                          <select
                            value={clampedQuantity}
                            onChange={(e) =>
                              setExchangeQuantity(Number(e.target.value))
                            }
                            className="w-full appearance-none bg-gray-100 border-0 rounded-lg px-4 py-3 pr-10 text-sm font-semibold uppercase text-gray-800"
                          >
                            {quantityOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            ▼
                          </span>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                          <p className="text-[11px] font-bold tracking-wider text-black uppercase">
                            Exchange policy
                          </p>
                          <p className="text-sm text-gray-600">
                            You can request an exchange within{" "}
                            <strong>
                              {maxDays} day{maxDays !== 1 ? "s" : ""}
                            </strong>{" "}
                            of delivery.
                          </p>
                          <p className="text-sm text-gray-600">
                            Maximum{" "}
                            <strong>
                              {maxLimit} exchange{maxLimit !== 1 ? "s" : ""}
                            </strong>{" "}
                            per order.
                          </p>
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exchangePolicyAccepted}
                            onChange={(e) =>
                              setExchangePolicyAccepted(e.target.checked)
                            }
                            className="w-4 h-4 mt-0.5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 shrink-0 accent-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            I accept the terms and conditions of the exchange
                            policy.
                          </span>
                        </label>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={exchangeModalContinue}
                          disabled={!exchangePolicyAccepted}
                          className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  );
                })()}
              {exchangeStep === 2 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-bold text-black uppercase">
                        Reason for exchange
                      </h3>
                      <p className="font-semibold text-black uppercase text-xs mt-0.5">
                        Why do you want to exchange this item?
                      </p>
                    </div>
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black text-lg"
                      aria-label="Close"
                      onClick={closeExchangeModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {(exchangePolicy?.exchangeReasons?.length
                        ? exchangePolicy.exchangeReasons
                        : FALLBACK_EXCHANGE_REASONS
                      ).map((reason) => (
                        <li key={reason}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="exchangeReason"
                              checked={exchangeReason === reason}
                              onChange={() => setExchangeReason(reason)}
                              className="w-4 h-4 border-gray-300 text-black"
                            />
                            <span className="text-sm text-gray-800">
                              {reason}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={exchangeModalContinue}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 3 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">
                      Desired size & color
                    </h3>
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black text-lg"
                      aria-label="Close"
                      onClick={closeExchangeModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    {exchangeItemLoading ? (
                      <p className="text-sm text-gray-500">Loading options…</p>
                    ) : !exchangeItemDetails?.variants?.length ? (
                      <p className="text-sm text-gray-500">
                        No size/color options for this item.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-black uppercase mb-2">
                          Select color
                        </p>
                        <div className="flex flex-wrap gap-3 mb-4">
                          {exchangeItemDetails.variants.map((v) => {
                            const colorName = v.color?.name ?? "";
                            const isSelected =
                              exchangeDesiredColor === colorName;
                            const imgUrl =
                              v.images?.[0]?.url ??
                              (v.images && v.images[0] && v.images[0].url);
                            const hasInStockSize = (v.sizes || []).some((s) => {
                              const qty = Number(
                                s.availableQuantity ?? s.stock ?? 0,
                              );
                              return (
                                s.inStock === true ||
                                (s.inStock !== false && qty > 0)
                              );
                            });
                            return (
                              <button
                                key={colorName}
                                type="button"
                                onClick={() => {
                                  if (!hasInStockSize) return;
                                  setExchangeDesiredColor(colorName);
                                  // Clear size so user explicitly picks one, even after color change
                                  setExchangeDesiredSize("");
                                }}
                                disabled={!hasInStockSize}
                                className={`flex flex-col items-center rounded-lg border-2 p-1 transition-colors ${
                                  isSelected
                                    ? "border-black"
                                    : hasInStockSize
                                      ? "border-gray-200 hover:border-gray-400"
                                      : "border-gray-100 opacity-60 cursor-not-allowed"
                                }`}
                              >
                                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-lg border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center overflow-hidden p-1.5">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={colorName}
                                      className="max-h-full max-w-full object-contain object-center"
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full min-h-20"
                                      style={{
                                        backgroundColor:
                                          v.color?.hex || "#e5e7eb",
                                      }}
                                      title={colorName}
                                    />
                                  )}
                                </div>
                                <span className="text-[10px] font-medium uppercase mt-1 text-gray-800">
                                  {colorName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs font-semibold text-black uppercase mb-2">
                          Select size
                        </p>
                        {(() => {
                          const rawSizes =
                            exchangeItemDetails.variants.find(
                              (v) => v.color?.name === exchangeDesiredColor,
                            )?.sizes ?? [];
                          const sizesWithStock = rawSizes.map((s) => {
                            const qty = Number(
                              s.availableQuantity ?? s.stock ?? 0,
                            );
                            const inStock =
                              s.inStock === true ||
                              (s.inStock !== false && qty > 0);
                            return { ...s, inStock };
                          });
                          const anyInStock = sizesWithStock.some(
                            (s) => s.inStock,
                          );
                          return (
                            <div className="flex flex-wrap gap-2">
                              {sizesWithStock.map((s) => {
                                const sizeVal = s.size ?? "";
                                const isSelected =
                                  exchangeDesiredSize === sizeVal;
                                const disabled = !s.inStock;
                                return (
                                  <button
                                    key={s.sku ?? sizeVal}
                                    type="button"
                                    onClick={() => {
                                      if (disabled) return;
                                      setExchangeDesiredSize(sizeVal);
                                    }}
                                    disabled={disabled}
                                    className={`px-4 py-2 rounded border text-xs font-semibold uppercase ${
                                      isSelected
                                        ? "border-black bg-black text-white"
                                        : disabled
                                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                          : "border-gray-300 text-gray-800 hover:border-gray-500"
                                    }`}
                                  >
                                    {sizeVal}
                                    {disabled && anyInStock && (
                                      <span className="ml-1 text-[9px] uppercase tracking-wide"></span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  {exchangeError && (
                    <p className="px-4 text-red-600 text-sm">{exchangeError}</p>
                  )}
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={exchangeModalContinue}
                      disabled={
                        exchangeItemLoading ||
                        !exchangeItemDetails?.variants?.length ||
                        !exchangeDesiredColor.trim() ||
                        !exchangeDesiredSize.trim()
                      }
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 4 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">
                      Upload photo
                    </h3>
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black text-lg"
                      aria-label="Close"
                      onClick={closeExchangeModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-600 mb-3">
                      Upload 3 to 5 images of the item (required for exchange).
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="aspect-square min-h-38 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center p-2"
                        >
                          {exchangeImages[i] ? (
                            <img
                              src={URL.createObjectURL(exchangeImages[i])}
                              alt=""
                              className="max-h-full max-w-full object-contain object-center"
                            />
                          ) : (
                            <span className="text-gray-400 text-2xl">📷</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <label className="block">
                      <span className="sr-only">Upload images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(
                            0,
                            5,
                          );
                          setExchangeImages(files);
                        }}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:font-semibold file:uppercase file:bg-white file:text-black hover:file:bg-gray-50"
                      />
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Min 3, max 5 images. You have {exchangeImages.length}{" "}
                      selected.
                    </p>
                  </div>
                  {exchangeError && (
                    <p className="px-4 text-red-600 text-sm">{exchangeError}</p>
                  )}
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={exchangeModalContinue}
                      disabled={exchangeSubmitting || exchangeImages.length < 3}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {exchangeSubmitting ? "Submitting…" : "Exchange order"}
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 5 && (
                <>
                  <div className="flex justify-end p-4">
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-black"
                      aria-label="Close"
                      onClick={closeExchangeModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="px-4 pb-6 pt-0 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="font-bold text-black uppercase text-lg mb-2">
                      Exchange request submitted
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your exchange request has been received. We will process
                      it shortly.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Review modal */}
        {reviewModalOpen && currentStatus === "DELIVERED" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setReviewModalOpen(false)
            }
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-black uppercase text-sm">
                    Rate & review
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Share your experience with this product.
                  </p>
                </div>
                <button
                  type="button"
                  className="p-1 text-gray-500 hover:text-black text-lg"
                  aria-label="Close"
                  onClick={() => setReviewModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="px-4 py-4">
                {reviewLoading ? (
                  <p className="text-sm text-gray-500">Loading your review…</p>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase text-gray-700 mb-1">
                        Your rating
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-0.5"
                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          >
                            <span
                              className={`text-xl ${
                                star <= reviewRating
                                  ? "text-black"
                                  : "text-gray-300"
                              }`}
                            >
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-gray-600">
                          {reviewRating} / 5
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        handleSubmitReview(e);
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                          Your review (optional)
                        </label>
                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          rows={3}
                          placeholder="Tell us about fit, quality, and your overall experience."
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
                          Add photos (optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(
                              e.target.files || [],
                            ).slice(0, 5);
                            setReviewImages(files);
                          }}
                          className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:border file:border-gray-300 file:rounded file:text-[11px] file:font-semibold file:uppercase file:bg-white file:text-black hover:file:bg-gray-50"
                        />
                        {reviewImages.length > 0 && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            {reviewImages.length} image
                            {reviewImages.length > 1 ? "s" : ""} selected (max
                            5).
                          </p>
                        )}
                      </div>

                      {reviewError && (
                        <p className="text-sm text-red-600">{reviewError}</p>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-2">
                        {review ? (
                          <button
                            type="button"
                            onClick={handleDeleteReview}
                            disabled={reviewSubmitting}
                            className="text-xs font-semibold uppercase text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete review
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500">
                            You can update or delete this review later.
                          </span>
                        )}

                        <button
                          type="submit"
                          disabled={reviewSubmitting}
                          className="bg-black text-white px-5 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {reviewSubmitting
                            ? review
                              ? "Saving…"
                              : "Posting…"
                            : review
                              ? "Save changes"
                              : "Post review"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
