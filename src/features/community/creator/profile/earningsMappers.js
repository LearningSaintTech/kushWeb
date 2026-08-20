/**
 * Map /earnings API payloads into dashboard + payout UI shapes.
 * Spec: availableBalance, pendingBalance, minPayoutAmount, rates, payout-methods, payouts.
 */

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function formatEarningsInr(value) {
  const amount = num(value, 0)
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatChange(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string' && /%/.test(value)) return value
  const n = num(value, NaN)
  if (!Number.isFinite(n)) return String(value)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function pickAmount(obj, keys) {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== '') return num(obj[key])
  }
  return null
}

function rateFromSummary(summary, mode) {
  const rates = summary?.rates || {}
  const pct =
    mode === 'designer'
      ? rates.designerCommissionRatePct ??
        rates.designerRoyaltyRatePct ??
        summary.designerCommissionRatePct
      : rates.creatorCommissionRatePct ?? summary.creatorCommissionRatePct

  if (pct == null && summary.commissionRate != null) return summary.commissionRate
  return pct
}

/**
 * @param {object|null} summary
 * @param {'creator'|'designer'} mode
 */
export function mapSummaryToDashboardEarnings(summary, mode = 'creator') {
  if (!summary || typeof summary !== 'object') return null

  const total = pickAmount(summary, [
    'totalEarnings',
    'total',
    'lifetimeEarnings',
    'grossEarnings',
    'earnedTotal',
  ])

  const creator = pickAmount(summary, [
    'creatorEarnings',
    'creator',
    'contentEarnings',
    'communityEarnings',
  ])

  const royalties = pickAmount(summary, [
    'designRoyalties',
    'designerEarnings',
    'royalties',
    'designEarnings',
  ])

  const available = pickAmount(summary, [
    'availableBalance',
    'payableBalance',
    'available',
    'balance',
  ])

  const pending = pickAmount(summary, [
    'pendingBalance',
    'pendingEarnings',
    'pending',
    'inTransit',
  ])

  const minPayout = pickAmount(summary, ['minPayoutAmount', 'minPayout', 'minimumPayout'])

  const changeRaw =
    summary.changePercent ??
    summary.percentChange ??
    summary.growthPercent ??
    summary.change ??
    null

  const change = formatChange(changeRaw)

  const resolvedTotal =
    total ??
    (creator != null || royalties != null
      ? num(creator) + num(royalties)
      : available != null
        ? available
        : 0)

  const ratePct = rateFromSummary(summary, mode)

  const earnings = {
    total: formatEarningsInr(resolvedTotal),
    change: change ?? '—',
    creator:
      creator != null
        ? formatEarningsInr(creator)
        : mode === 'creator'
          ? formatEarningsInr(resolvedTotal)
          : formatEarningsInr(0),
    royalties:
      royalties != null
        ? formatEarningsInr(royalties)
        : formatEarningsInr(0),
  }

  return {
    earnings,
    summaryChips: null,
    meta: {
      available: available != null ? formatEarningsInr(available) : null,
      pending: pending != null ? formatEarningsInr(pending) : null,
      availableRaw: available,
      pendingRaw: pending,
      minPayoutRaw: minPayout ?? 500,
      minPayout: formatEarningsInr(minPayout ?? 500),
      commissionRate: ratePct != null ? `${Number(ratePct)}%` : null,
      currency: summary.currency || 'INR',
      raw: summary,
    },
  }
}

function commissionList(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.commissions)) return payload.commissions
  if (Array.isArray(payload.data)) return payload.data
  return []
}

export function mapCommissionsToEarningsPerPost(payload, fallbackImage = '') {
  return commissionList(payload).map((row, index) => {
    const amount = pickAmount(row, [
      'amount',
      'commissionAmount',
      'earnings',
      'netAmount',
      'creatorAmount',
    ])
    const title =
      row.title ||
      row.contentTitle ||
      row.postTitle ||
      row.itemName ||
      row.name ||
      row.description ||
      'Commission'
    const status = row.status ? String(row.status) : null
    const viewsLabel =
      row.views != null
        ? `${row.views} views`
        : status ||
          (row.createdAt
            ? new Date(row.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—')

    const signed =
      amount != null
        ? `${amount >= 0 ? '+' : ''}${formatEarningsInr(amount)}`
        : '—'

    return {
      id: String(row._id ?? row.id ?? `c-${index}`),
      rank: index + 1,
      title: String(title),
      views: viewsLabel,
      earnings: signed,
      image: row.thumbnail || row.image || row.coverUrl || fallbackImage,
    }
  })
}

export function normalizePayoutMethods(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.methods)) return payload.methods
  if (payload._id || payload.id || payload.accountNumber || payload.accountNo) {
    return [payload]
  }
  return []
}

export function normalizePayoutItems(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.payouts)) return payload.payouts
  return []
}

export function getDefaultPayoutMethod(methods) {
  const list = normalizePayoutMethods(methods)
  if (!list.length) return null
  return list.find((m) => m.isDefault) || list[0]
}

export function maskAccountNumber(method) {
  if (!method) return '****'
  if (method.accountNumberMasked) return String(method.accountNumberMasked)
  const raw = String(method.accountNumber ?? method.accountNo ?? '')
  if (raw.length <= 4) return raw || '****'
  return `${'*'.repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`
}

export const EMPTY_BANK_FORM = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
}

export function payoutMethodToForm(method) {
  if (!method) return { ...EMPTY_BANK_FORM }
  const accountNumber = String(method.accountNumber ?? method.accountNo ?? '')
  return {
    bankName: String(method.bankName ?? ''),
    accountHolderName: String(
      method.accountHolderName ?? method.name ?? method.holderName ?? '',
    ),
    accountNumber,
    confirmAccountNumber: accountNumber,
    ifsc: String(method.ifsc ?? method.ifscCode ?? ''),
  }
}

/** POST /earnings/payout-methods body */
export function formToPayoutMethodBody(form) {
  return {
    type: 'bank',
    bankName: form.bankName.trim(),
    accountHolderName: form.accountHolderName.trim(),
    accountNumber: form.accountNumber.trim(),
    ifsc: form.ifsc.trim().toUpperCase(),
    isDefault: true,
  }
}

export function payoutStatusMeta(status) {
  const key = String(status || '').toLowerCase()
  if (key === 'pending' || key === 'requested') {
    return { label: 'Requested', className: 'bg-[#F3EEFF] text-[#8B5CF6]' }
  }
  if (key === 'processing') {
    return { label: 'Processing', className: 'bg-amber-50 text-amber-600' }
  }
  if (key === 'paid' || key === 'completed') {
    return { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' }
  }
  if (key === 'rejected' || key === 'failed') {
    return { label: 'Rejected', className: 'bg-red-50 text-red-600' }
  }
  return {
    label: status ? String(status) : '—',
    className: 'bg-neutral-100 text-neutral-600',
  }
}

export function getEarningsErrorMessage(err, fallback = 'Something went wrong.') {
  const msg = err?.response?.data?.message
  if (typeof msg === 'string' && msg.trim()) return msg.trim()
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim()
  return fallback
}
