import { useState } from 'react'

const COLLAPSE_AT = 90

/**
 * Compact gift strip for order list / track — description gets Read more when long.
 */
export default function OrderGiftNote({ gift, compact = false }) {
  const [expanded, setExpanded] = useState(false)
  if (!gift?.name && !gift?.image) return null

  const description = String(gift.description || '').trim()
  const needsToggle = description.length > COLLAPSE_AT
  const shown =
    !description
      ? ''
      : expanded || !needsToggle
        ? description
        : `${description.slice(0, COLLAPSE_AT).trimEnd()}…`

  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 ${
        compact ? 'mt-2 px-2 py-1.5' : 'mt-3 max-w-sm px-2.5 py-2'
      }`}
    >
      <div
        className={`shrink-0 overflow-hidden rounded border border-amber-100 bg-white ${
          compact ? 'h-9 w-9' : 'h-11 w-11'
        }`}
      >
        {gift.image ? (
          <img
            src={gift.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] text-amber-700/70">
            Gift
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-inter text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          {compact ? 'Free gift' : 'Free gift with this order'}
        </p>
        <p
          className={`font-inter text-amber-950/90 ${
            compact ? 'truncate text-[11px] sm:text-xs' : 'text-sm'
          }`}
        >
          {gift.name || 'Gift item'}
        </p>
        {description ? (
          <div className="mt-0.5">
            <p className="font-inter text-[11px] leading-snug text-amber-900/70">{shown}</p>
            {needsToggle ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 cursor-pointer font-inter text-[11px] font-semibold text-amber-900 underline underline-offset-2 hover:opacity-80"
              >
                {expanded ? 'Read less' : 'Read more'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
