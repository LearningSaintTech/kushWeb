import SafeExternalLink from './SafeExternalLink.jsx';
import {
  getTrackButtonLabel,
  getProviderLabel,
} from '../../utils/orderTracking.js';

/**
 * Shipment leg tracking card — AWB, carrier status, external track button.
 */
export default function ShipmentTrackingCard({
  tracking,
  title = 'Shipment tracking',
  subtitle,
  emptyMessage = 'Tracking will appear here once your shipment is booked.',
  compact = false,
  highlighted = false,
  legLabel = null,
}) {
  const boxClass = compact
    ? `rounded-lg border px-4 py-3 ${highlighted ? 'border-gray-900 bg-white shadow-sm' : 'border-gray-200 bg-white'}`
    : `rounded-lg border px-5 py-4 mb-4 ${highlighted ? 'border-gray-900 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'}`;

  if (!tracking) {
    return (
      <div className={boxClass}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {legLabel ? (
              <span className="inline-block rounded-full bg-gray-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {legLabel}
              </span>
            ) : null}
            <p className={`text-[11px] font-bold tracking-wider text-gray-900 uppercase ${legLabel ? 'mt-2' : ''}`}>
              {title}
            </p>
          </div>
        </div>
        {subtitle ? <p className="text-xs text-gray-600 mt-1">{subtitle}</p> : null}
        <p className="mt-3 text-sm text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  const providerLabel = getProviderLabel(tracking.provider) || tracking.courier;
  const trackLabel = getTrackButtonLabel(tracking.provider);

  return (
    <div className={boxClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {legLabel ? (
            <span className="inline-block rounded-full bg-gray-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {legLabel}
            </span>
          ) : null}
          <p className={`text-[11px] font-bold tracking-wider text-gray-900 uppercase ${legLabel ? 'mt-2' : ''}`}>
            {title}
          </p>
          {subtitle ? <p className="text-xs text-gray-600 mt-1">{subtitle}</p> : null}
        </div>
        {tracking.status ? (
          <span className="shrink-0 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900">
            {tracking.status}
          </span>
        ) : null}
      </div>

      <div className={`space-y-2 text-sm text-gray-800 ${subtitle || legLabel ? 'mt-3' : 'mt-2'}`}>
        {tracking.selfShipping ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            {tracking.selfShippingMode === 'EXTERNAL' ? 'External courier' : 'Khush self-shipping'}
          </p>
        ) : null}

        {providerLabel && !tracking.selfShipping ? (
          <p>
            <span className="text-gray-500">Delivery partner</span>
            {' — '}
            <strong>{providerLabel}</strong>
          </p>
        ) : null}

        {tracking.trackingNumber ? (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-gray-500">
              {tracking.selfShipping && !tracking.trackingUrl ? 'Reference' : 'AWB / Tracking ID'}
            </span>
            <strong className="font-mono text-sm text-gray-900 break-all">{tracking.trackingNumber}</strong>
          </p>
        ) : null}

        {tracking.trackingUrl ? (
          <div className="pt-2">
            <SafeExternalLink
              href={tracking.trackingUrl}
              className={
                compact
                  ? 'inline-flex items-center justify-center rounded-sm bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 transition-colors'
                  : 'inline-flex items-center justify-center rounded-sm bg-black px-5 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-800 transition-colors'
              }
            >
              {trackLabel}
            </SafeExternalLink>
          </div>
        ) : tracking.trackingNumber ? (
          <p className="text-xs text-gray-500 pt-1">
            Live tracking link will appear once the carrier confirms the shipment.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Hero banner for current order status on track page */
export function OrderStatusBanner({
  primaryLabel,
  secondaryLabel,
  badgeClass,
}) {
  if (!primaryLabel) return null;
  return (
    <div className="mb-5 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
        Current status
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-md border px-3 py-1.5 text-sm font-bold uppercase tracking-wide ${badgeClass}`}
        >
          {primaryLabel}
        </span>
        {secondaryLabel ? (
          <span className="text-sm text-gray-600">{secondaryLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
