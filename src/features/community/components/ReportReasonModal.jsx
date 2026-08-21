import { useEffect, useState } from 'react'

export const COMMUNITY_REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'nudity', label: 'Nudity / sexual content' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'scam', label: 'Scam / fraud' },
  { id: 'other', label: 'Other' },
]

/**
 * Report reason picker for community content / comments / users.
 */
export default function ReportReasonModal({
  open,
  title = 'Report',
  submitting = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('spam')
    setDetails('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reason || submitting) return
    onSubmit?.({
      reason,
      details: details.trim().slice(0, 500) || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-black/45"
        onClick={() => !submitting && onClose?.()}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="report-modal-title"
            className="font-inter text-lg font-bold text-black"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={submitting}
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 font-inter text-xs text-neutral-500">
          Reports are reviewed by our team. This does not hide the content for you.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Reason</legend>
          {COMMUNITY_REPORT_REASONS.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                reason === item.id
                  ? 'border-black bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={item.id}
                checked={reason === item.id}
                onChange={() => setReason(item.id)}
                className="h-4 w-4 accent-black"
              />
              <span className="font-inter text-sm font-medium text-black">
                {item.label}
              </span>
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Details (optional)
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            placeholder="Add context for reviewers…"
            className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </label>

        {error ? (
          <p className="mt-3 font-inter text-xs text-red-600">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !reason}
          className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-black font-inter text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
