import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../../utils/constants'

const VIEWS = {
  MENU: 'menu',
  PAYMENT: 'payment',
  DELETE: 'delete',
}

const EMPTY_PAYMENT = {
  name: '',
  accountNo: '',
  confirmAccountNo: '',
  ifsc: '',
}

/**
 * Side drawer — Creator/Designer settings from profile dashboard info icon.
 * Views: menu → payment details | delete confirm
 */
export default function CreatorSettingsDrawer({
  open,
  onClose,
  mode = 'creator',
}) {
  const titleId = useId()
  const [view, setView] = useState(VIEWS.MENU)
  const [payment, setPayment] = useState(EMPTY_PAYMENT)
  const [paymentError, setPaymentError] = useState('')
  const [agreeDelete, setAgreeDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const roleLabel = mode === 'designer' ? 'Designer' : 'Creator'

  useEffect(() => {
    if (!open) return
    setView(VIEWS.MENU)
    setPaymentError('')
    setAgreeDelete(false)
    setDeleting(false)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (view !== VIEWS.MENU) {
        setView(VIEWS.MENU)
        return
      }
      onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, view, onClose])

  if (!open) return null

  const goBack = () => {
    if (view !== VIEWS.MENU) {
      setView(VIEWS.MENU)
      return
    }
    onClose?.()
  }

  const handleSavePayment = (e) => {
    e.preventDefault()
    setPaymentError('')
    if (!payment.name.trim()) {
      setPaymentError('Enter the account holder name.')
      return
    }
    if (!payment.accountNo.trim()) {
      setPaymentError('Enter the account number.')
      return
    }
    if (payment.accountNo.trim() !== payment.confirmAccountNo.trim()) {
      setPaymentError('Account numbers do not match.')
      return
    }
    if (!payment.ifsc.trim()) {
      setPaymentError('Enter the IFSC code.')
      return
    }
    // Persist when payment API is available
    setView(VIEWS.MENU)
  }

  const handleDelete = async () => {
    if (!agreeDelete || deleting) return
    setDeleting(true)
    try {
      // Hook up community profile delete API when available
      onClose?.()
    } finally {
      setDeleting(false)
    }
  }

  const headerTitle =
    view === VIEWS.PAYMENT
      ? 'Payment Details'
      : view === VIEWS.DELETE
        ? 'Delete Profile'
        : `${roleLabel} Setting`

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 left-0 z-10 flex w-full max-w-[400px] flex-col bg-white shadow-[16px_0_42px_rgba(0,0,0,0.12)] animate-[community-notifications-in_300ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-4 py-3.5">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 id={titleId} className="font-inter text-base font-bold text-black">
            {headerTitle}
          </h2>
        </header>

        {view === VIEWS.MENU ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="px-2 pt-1">
              <button
                type="button"
                onClick={() => setView(VIEWS.PAYMENT)}
                className="flex w-full cursor-pointer items-center justify-between border-b border-neutral-100 px-3 py-4 text-left transition hover:bg-neutral-50"
              >
                <span className="font-inter text-xs font-semibold uppercase tracking-[0.06em] text-black">
                  Payment Details
                </span>
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <Link
                to={ROUTES.PAYMENT_POLICY}
                onClick={onClose}
                className="flex w-full items-center justify-between border-b border-neutral-100 px-3 py-4 text-left transition hover:bg-neutral-50"
              >
                <span className="font-inter text-xs font-semibold uppercase tracking-[0.06em] text-black">
                  Payment Policy
                </span>
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </nav>

            <div className="mt-auto p-4 pb-6">
              <button
                type="button"
                onClick={() => setView(VIEWS.DELETE)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E85A5A] bg-white px-4 py-3.5 font-inter text-sm font-semibold text-[#E85A5A] transition hover:bg-red-50"
              >
                Delete Your Community Profile
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        {view === VIEWS.PAYMENT ? (
          <form onSubmit={handleSavePayment} className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {[
                { key: 'name', label: 'Name', placeholder: 'Your full name' },
                { key: 'accountNo', label: 'Account No.', placeholder: 'Account number' },
                {
                  key: 'confirmAccountNo',
                  label: 'Confirm Account No.',
                  placeholder: 'Re-enter account number',
                },
                { key: 'ifsc', label: 'IFSC', placeholder: 'IFSC code' },
              ].map((field) => (
                <label key={field.key} className="block">
                  <span className="font-inter text-[11px] font-bold uppercase tracking-[0.08em] text-black">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={payment[field.key]}
                    onChange={(e) =>
                      setPayment((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 font-inter text-sm text-black outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </label>
              ))}
              {paymentError ? (
                <p className="font-inter text-xs text-red-600" role="alert">
                  {paymentError}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-neutral-100 p-4 pb-6">
              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl border border-neutral-300 bg-white py-3.5 font-inter text-sm font-bold text-black transition hover:bg-neutral-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : null}

        {view === VIEWS.DELETE ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-hide flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FDECEC]">
                <svg className="h-8 w-8 text-[#E11D2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-center font-inter text-xl font-bold text-black">
                Are you sure?
              </h3>
              <p className="mt-1 text-center font-inter text-sm text-neutral-500">
                This action cannot be undone.
              </p>

              <div className="mt-6 rounded-2xl border border-[#F5B5B5] bg-[#FFF1F1] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#E11D2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  <p className="font-inter text-sm font-bold text-[#E11D2E]">
                    Permanently deleting profile
                  </p>
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 font-inter text-xs leading-relaxed text-neutral-600">
                  <li>
                    You will lose access to all your community posts, comments, likes, and
                    profile settings.
                  </li>
                  <li>
                    Your virtual wallet balance and any pending payouts will be permanently
                    forfeited.
                  </li>
                </ul>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeDelete}
                  onChange={(e) => setAgreeDelete(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-300 text-[#E11D2E] focus:ring-[#E11D2E]"
                />
                <span className="font-inter text-xs leading-relaxed text-neutral-700">
                  I agree to the{' '}
                  <Link
                    to={ROUTES.TERMS_CONDITIONS}
                    className="font-semibold text-[#E11D2E] underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms &amp; Policy
                  </Link>{' '}
                  and understand my wallet balance and data will be permanently wiped.
                </span>
              </label>
            </div>

            <div className="shrink-0 space-y-2.5 border-t border-neutral-100 p-4 pb-6">
              <button
                type="button"
                disabled={!agreeDelete || deleting}
                onClick={handleDelete}
                className="w-full cursor-pointer rounded-xl bg-[#C62828] py-3.5 font-inter text-sm font-bold text-white transition hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete My Profile'}
              </button>
              <button
                type="button"
                onClick={() => setView(VIEWS.MENU)}
                className="w-full cursor-pointer rounded-xl border border-neutral-200 bg-white py-3.5 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
              >
                Keep Profile
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
