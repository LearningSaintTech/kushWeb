import {
  getBindOfferBillLabel,
  getBindOfferProgressMessages,
  getGrossSubTotalBeforeBindOffer,
  getLineBindOfferNote,
  getTotalBindOfferDiscount,
} from "../../utils/bindOffer.js";

function formatRsDiscount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `−Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Progress hints from price-summary (e.g. “Add 1 more to get 1 free”). */
export function BindOfferProgressBanner({ bindOffers, className = "" }) {
  const messages = getBindOfferProgressMessages(bindOffers);
  if (!messages.length) return null;
  return (
    <div
      className={`rounded-sm border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-900 ${className}`.trim()}
    >
      <p className="font-semibold uppercase tracking-wide text-[10px] text-violet-800">
        Offer progress
      </p>
      <ul className="mt-1 space-y-0.5">
        {messages.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

/** Bill summary rows for bind-offer discount (cart, checkout, orders). */
export function BindOfferBillRows({ bindOffers, formatRsFn }) {
  const total = getTotalBindOfferDiscount(bindOffers);
  if (!total || total <= 0) return null;
  const label = getBindOfferBillLabel(bindOffers);
  const formatted = formatRsFn
    ? formatRsFn(total)
    : formatRsDiscount(total);
  if (!formatted) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium text-violet-700">{formatted}</span>
    </div>
  );
}

/** Item total row with optional strikethrough before bind-offer / coupon. */
export function BillSummaryItemTotal({
  summary,
  bindOffers,
  subTotalAfterDiscount,
  amountClassName = "font-medium",
}) {
  const couponDiscount = Number(summary?.coupon?.discountAmount ?? 0);
  const displayAmount = Number(
    subTotalAfterDiscount ?? summary?.subTotalAfterDiscount ?? summary?.subTotal ?? 0,
  );
  const grossBeforeOffer = getGrossSubTotalBeforeBindOffer(summary, bindOffers);
  const strikeAmount =
    grossBeforeOffer != null && grossBeforeOffer > displayAmount
      ? grossBeforeOffer
      : couponDiscount > 0 && summary?.subTotal != null
        ? Number(summary.subTotal)
        : null;

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-700">Item Total</span>
      <span className={amountClassName}>
        {strikeAmount != null && strikeAmount > displayAmount ? (
          <span className="text-gray-400 line-through mr-1">
            Rs{" "}
            {strikeAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        ) : null}
        Rs {displayAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

/** Per cart / order line: free qty, discount, or progress hint. */
export function BindOfferLineNote({ bindOffer, className = "" }) {
  const note = getLineBindOfferNote(bindOffer);
  if (!note) return null;
  const isProgressOnly =
    bindOffer?.isEligible === false &&
    !Number(bindOffer?.lineDiscount) &&
    !Number(bindOffer?.freeQuantity);
  return (
    <p
      className={`mt-1 text-[10px] font-medium uppercase tracking-wide sm:text-xs ${
        isProgressOnly ? "text-violet-600 normal-case" : "text-violet-700"
      } ${className}`.trim()}
    >
      {note}
    </p>
  );
}

/** Line price with strikethrough when bind-offer reduced the line subtotal. */
export function CartLineOfferPrice({
  unitPrice,
  quantity,
  itemSubtotal,
  bindOffer,
  className = "text-sm font-semibold whitespace-nowrap",
}) {
  const qty = Number(quantity) || 1;
  const unit = Number(unitPrice) || 0;
  const gross = unit * qty;
  const net = Number(itemSubtotal ?? gross);
  const hasOfferApplied =
    bindOffer &&
    (Number(bindOffer.lineDiscount) > 0 || Number(bindOffer.freeQuantity) > 0) &&
    net < gross - 0.009;

  return (
    <p className={className}>
      {hasOfferApplied ? (
        <span className="text-gray-400 line-through mr-1 text-xs font-normal">
          Rs.{" "}
          {gross.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ) : null}
      Rs.{" "}
      {net.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </p>
  );
}
