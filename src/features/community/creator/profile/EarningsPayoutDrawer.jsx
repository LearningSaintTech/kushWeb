import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  earningsService,
  unwrapEarningsResponse,
} from '../../../../services/earnings.service.js'
import { debugError, debugLog } from '../../../../utils/debugLog.js'
import {
  EMPTY_BANK_FORM,
  formatEarningsInr,
  formToPayoutMethodBody,
  getDefaultPayoutMethod,
  getEarningsErrorMessage,
  maskAccountNumber,
  normalizePayoutItems,
  normalizePayoutMethods,
  payoutStatusMeta,
  resolveRoleAvailableBalance,
  resolveRoleDisplayedPending,
  resolveRolePaidOut,
} from './earningsMappers'

/**
 * Earnings withdrawal drawer — link bank account + request payout.
 * Mirrors Android EarningsPayoutScreen flow.
 */
export default function EarningsPayoutDrawer({
  open,
  onClose,
  mode = 'creator',
  onUpdated,
}) {
  const titleId = useId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [summary, setSummary] = useState(null)
  const [methods, setMethods] = useState([])
  const [payouts, setPayouts] = useState([])
  const [selectedMethodId, setSelectedMethodId] = useState(null)

  const [bankForm, setBankForm] = useState({ ...EMPTY_BANK_FORM })
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const [amount, setAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const role = mode === 'designer' ? 'designer' : 'creator'
  const pendingBalance = summary
    ? resolveRoleDisplayedPending(summary, role, 0)
    : 0
  const availableBalance = summary
    ? resolveRoleAvailableBalance(summary, role, 0)
    : 0
  const paidOutBalance = summary ? resolveRolePaidOut(summary, role) : 0
  const minPayout = Number(summary?.minPayoutAmount ?? 5) || 5
  const ratePct =
    role === 'designer'
      ? summary?.rates?.designerCommissionRatePct ?? 1
      : summary?.rates?.creatorCommissionRatePct ?? 2.5

  const linkedMethod = useMemo(() => {
    if (!methods.length) return null
    if (selectedMethodId) {
      return (
        methods.find((m) => String(m._id ?? m.id) === String(selectedMethodId)) ||
        null
      )
    }
    return getDefaultPayoutMethod(methods)
  }, [methods, selectedMethodId])

  const fetchPayoutDetails = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const [summaryRes, methodsRes, payoutsRes] = await Promise.all([
        earningsService.getSummary({ role }),
        earningsService.getPayoutMethods(),
        earningsService.getPayouts({ page: 1, limit: 20, role }),
      ])
      const nextSummary = unwrapEarningsResponse(summaryRes)
      const nextMethods = normalizePayoutMethods(unwrapEarningsResponse(methodsRes))
      const nextPayouts = normalizePayoutItems(unwrapEarningsResponse(payoutsRes))

      setSummary(nextSummary)
      setMethods(nextMethods)
      setPayouts(nextPayouts)

      const preferred = getDefaultPayoutMethod(nextMethods)
      setSelectedMethodId(preferred ? preferred._id ?? preferred.id : null)

      debugLog('[Earnings] payout screen loaded', {
        role,
        available: resolveRoleAvailableBalance(nextSummary, role, 0),
        pending: resolveRoleDisplayedPending(nextSummary, role, 0),
        paidOut: resolveRolePaidOut(nextSummary, role),
        earned: nextSummary?.byRole?.[role]?.earned ?? nextSummary?.lifetimeEarned,
        methods: nextMethods.length,
        payouts: nextPayouts.length,
      })
    } catch (err) {
      const msg = getEarningsErrorMessage(err, 'Could not load payout details.')
      setError(msg)
      debugError('[Earnings] payout screen failed', msg)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [role])

  useEffect(() => {
    if (!open) return
    setSuccess('')
    setError('')
    setAmount('')
    setBankForm({ ...EMPTY_BANK_FORM })
    fetchPayoutDetails(true)
  }, [open, fetchPayoutDetails, role])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const updateBankField = (key, value) => {
    setBankForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLinkBank = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!bankForm.bankName.trim()) {
      setError('Enter the bank name.')
      return
    }
    if (!bankForm.accountHolderName.trim()) {
      setError('Enter the account holder name.')
      return
    }
    if (!bankForm.accountNumber.trim()) {
      setError('Enter the account number.')
      return
    }
    if (bankForm.accountNumber.trim() !== bankForm.confirmAccountNumber.trim()) {
      setError('Account numbers do not match.')
      return
    }
    if (!bankForm.ifsc.trim()) {
      setError('Enter the IFSC code.')
      return
    }

    setLinking(true)
    try {
      const body = formToPayoutMethodBody(bankForm)
      const res = await earningsService.savePayoutMethod(body)
      const saved = unwrapEarningsResponse(res)
      const methodId = saved?._id ?? saved?.id
      setBankForm({ ...EMPTY_BANK_FORM })
      setSuccess('Bank account linked successfully.')
      await fetchPayoutDetails(false)
      if (methodId) setSelectedMethodId(methodId)
      onUpdated?.()
      debugLog('[Earnings] payout method linked', saved)
    } catch (err) {
      setError(getEarningsErrorMessage(err, 'Could not link bank account.'))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    const methodId = linkedMethod?._id ?? linkedMethod?.id
    if (!methodId || unlinking) return
    const ok = window.confirm('Unlink this bank account? You can add another one after.')
    if (!ok) return

    setUnlinking(true)
    setError('')
    setSuccess('')
    try {
      await earningsService.deletePayoutMethod(methodId)
      setSelectedMethodId(null)
      setSuccess('Bank account removed.')
      await fetchPayoutDetails(false)
      onUpdated?.()
    } catch (err) {
      setError(getEarningsErrorMessage(err, 'Could not unlink bank account.'))
    } finally {
      setUnlinking(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const methodId = linkedMethod?._id ?? linkedMethod?.id
    const value = Number(amount)

    if (!methodId) {
      setError('Link a bank account before withdrawing.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid withdrawal amount.')
      return
    }
    if (value < minPayout) {
      setError(`Minimum payout is ${formatEarningsInr(minPayout)}.`)
      return
    }
    if (value > availableBalance) {
      setError('Amount exceeds available balance.')
      return
    }

    const ok = window.confirm(
      `Withdraw ${formatEarningsInr(value)} to ${linkedMethod.bankName || 'your bank account'}?`,
    )
    if (!ok) return

    setWithdrawing(true)
    try {
      const res = await earningsService.createPayout({ amount: value, methodId })
      const created = unwrapEarningsResponse(res)
      setAmount('')
      setSuccess('Withdrawal request submitted.')
      await fetchPayoutDetails(false)
      onUpdated?.()
      debugLog('[Earnings] payout created', created)
    } catch (err) {
      setError(getEarningsErrorMessage(err, 'Could not submit withdrawal.'))
    } finally {
      setWithdrawing(false)
    }
  }

  const setMaxAmount = () => {
    if (availableBalance <= 0) return
    setAmount(String(Math.floor(availableBalance * 100) / 100))
  }

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close withdrawal"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[420px] flex-col bg-white shadow-[-16px_0_42px_rgba(0,0,0,0.12)] animate-[community-projects-in_300ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 id={titleId} className="font-inter text-base font-bold text-black">
              Request Withdrawal
            </h2>
            <p className="font-inter text-[11px] text-neutral-500">
              {mode === 'designer' ? 'Designer' : 'Creator'} payout · {ratePct}% rate
            </p>
          </div>
        </header>

        <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="py-10 text-center font-inter text-sm text-neutral-500">
              Loading payout details…
            </p>
          ) : (
            <>
              <div className="rounded-2xl bg-[#EFEFEF] p-4">
                <p className="font-inter text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  {mode === 'designer' ? 'Designer' : 'Creator'} wallet
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 font-inter text-xs font-semibold text-emerald-800">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                      Available
                    </span>
                    <span>{formatEarningsInr(availableBalance)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 font-inter text-xs font-semibold text-amber-800">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                      Pending
                    </span>
                    <span>{formatEarningsInr(pendingBalance)}</span>
                  </span>
                  {paidOutBalance > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200/90 px-3.5 py-1.5 font-inter text-xs font-semibold text-neutral-700">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                        Paid
                      </span>
                      <span>{formatEarningsInr(paidOutBalance)}</span>
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-inter text-[11px] text-neutral-500">
                  Min payout{' '}
                  <span className="font-semibold text-black">
                    {formatEarningsInr(minPayout)}
                  </span>
                </p>
              </div>

              {error ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 font-inter text-xs text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 font-inter text-xs text-emerald-700" role="status">
                  {success}
                </p>
              ) : null}

              {!linkedMethod ? (
                <form onSubmit={handleLinkBank} className="mt-6 space-y-3">
                  <h3 className="font-inter text-sm font-bold text-black">Link Bank Account</h3>
                  <p className="font-inter text-xs text-neutral-500">
                    Add your bank details to withdraw earnings.
                  </p>
                  {[
                    { key: 'bankName', label: 'Bank Name', placeholder: 'e.g. HDFC Bank' },
                    {
                      key: 'accountHolderName',
                      label: 'Account Holder Name',
                      placeholder: 'Name as on passbook',
                    },
                    {
                      key: 'accountNumber',
                      label: 'Account Number',
                      placeholder: 'Account number',
                    },
                    {
                      key: 'confirmAccountNumber',
                      label: 'Confirm Account Number',
                      placeholder: 'Re-enter account number',
                    },
                    { key: 'ifsc', label: 'IFSC', placeholder: 'e.g. HDFC0001234' },
                  ].map((field) => (
                    <label key={field.key} className="block">
                      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.08em] text-black">
                        {field.label}
                      </span>
                      <input
                        type="text"
                        value={bankForm[field.key]}
                        onChange={(e) => updateBankField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={linking}
                        autoComplete="off"
                        className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 font-inter text-sm text-black outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-60"
                      />
                    </label>
                  ))}
                  <button
                    type="submit"
                    disabled={linking}
                    className="mt-2 w-full cursor-pointer rounded-xl bg-black py-3.5 font-inter text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {linking ? 'Linking…' : 'Link Bank Account'}
                  </button>
                </form>
              ) : (
                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-inter text-sm font-bold text-black">Linked account</h3>
                      <button
                        type="button"
                        onClick={handleUnlink}
                        disabled={unlinking}
                        className="cursor-pointer font-inter text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                      >
                        {unlinking ? 'Removing…' : 'Unlink'}
                      </button>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                      <p className="font-inter text-sm font-semibold text-black">
                        {linkedMethod.bankName || 'Bank account'}
                      </p>
                      <p className="mt-1 font-inter text-xs text-neutral-500">
                        {maskAccountNumber(linkedMethod)}
                      </p>
                      <p className="mt-0.5 font-inter text-xs text-neutral-500">
                        {linkedMethod.accountHolderName || linkedMethod.name || '—'}
                      </p>
                      <p className="mt-0.5 font-inter text-[11px] uppercase tracking-wide text-neutral-400">
                        IFSC {linkedMethod.ifsc || '—'}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-3">
                    <h3 className="font-inter text-sm font-bold text-black">Request payout</h3>
                    <label className="block">
                      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.08em] text-black">
                        Amount
                      </span>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={minPayout}
                          max={availableBalance}
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Min ${formatEarningsInr(minPayout)}`}
                          disabled={withdrawing}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 font-inter text-sm text-black outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={setMaxAmount}
                          disabled={withdrawing || availableBalance <= 0}
                          className="shrink-0 cursor-pointer rounded-xl border border-neutral-200 px-3.5 font-inter text-xs font-bold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                        >
                          MAX
                        </button>
                      </div>
                    </label>
                    <button
                      type="submit"
                      disabled={withdrawing || availableBalance < minPayout}
                      className="w-full cursor-pointer rounded-xl bg-[#8B5CF6] py-3.5 font-inter text-sm font-bold text-white transition hover:bg-[#7C4DEF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {withdrawing ? 'Submitting…' : 'Withdraw to Account'}
                    </button>
                    {availableBalance < minPayout ? (
                      <p className="font-inter text-[11px] text-neutral-500">
                        You need at least {formatEarningsInr(minPayout)} available to withdraw.
                      </p>
                    ) : null}
                  </form>
                </div>
              )}

              <section className="mt-8">
                <h3 className="font-inter text-sm font-bold text-black">Payout history</h3>
                {payouts.length === 0 ? (
                  <p className="mt-3 font-inter text-xs text-neutral-500">
                    No withdrawal requests yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-neutral-100">
                    {payouts.map((payout, index) => {
                      const meta = payoutStatusMeta(payout.status)
                      const when = payout.createdAt || payout.updatedAt
                      return (
                        <li
                          key={String(payout._id ?? payout.id ?? `p-${index}`)}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-inter text-sm font-semibold text-black">
                              {formatEarningsInr(payout.amount)}
                            </p>
                            <p className="font-inter text-[11px] text-neutral-400">
                              {when
                                ? new Date(when).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 font-inter text-[10px] font-semibold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
