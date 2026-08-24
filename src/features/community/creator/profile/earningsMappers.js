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
        summary.designerCommissionRatePct ??
        1
      : rates.creatorCommissionRatePct ?? summary.creatorCommissionRatePct ?? 2.5

  if (pct == null && summary.commissionRate != null) return summary.commissionRate
  return pct
}

function roleFromSummary(summary) {
  const r = String(summary?.role || '').toLowerCase().trim()
  if (r === 'creator' || r === 'designer') return r
  return null
}

/** @param {'creator'|'designer'} mode */
function roleBucket(summary, mode) {
  const key = mode === 'designer' ? 'designer' : 'creator'
  const bucket = summary?.byRole?.[key]
  return bucket && typeof bucket === 'object' ? bucket : null
}

/** Shared payout wallet (accounts for lifetimePaid). */
export function resolveWalletAvailableBalance(summary) {
  return pickAmount(summary, [
    'availableBalance',
    'payableBalance',
    'available',
    'balance',
  ])
}

/**
 * Withdrawable for the active role.
 * Prefers byRole[role].available, capped by wallet availableBalance
 * (wallet already subtracts lifetimePaid; byRole.available may not).
 *
 * @param {object} summary
 * @param {'creator'|'designer'} mode
 * @param {number} [fallback]
 */
export function resolveRoleAvailableBalance(summary, mode, fallback = 0) {
  const bucket = roleBucket(summary, mode)
  const wallet = resolveWalletAvailableBalance(summary)
  const other = roleBucket(
    summary,
    mode === 'designer' ? 'creator' : 'designer',
  )
  const otherAvailable = other ? num(other.available, 0) : 0

  if (bucket) {
    const roleAvailable = pickAmount(bucket, [
      'available',
      'availableBalance',
      'payable',
    ])
    if (roleAvailable != null) {
      // Other role has no commission balance → this role owns the wallet cash
      if (wallet != null && otherAvailable <= 0) {
        return Math.min(roleAvailable, wallet)
      }
      if (wallet != null) return Math.min(roleAvailable, wallet)
      return roleAvailable
    }
  }

  const legacy = pickAmount(summary, [
    mode === 'designer'
      ? 'designerAvailableBalance'
      : 'creatorAvailableBalance',
    mode === 'designer' ? 'designerAvailable' : 'creatorAvailable',
  ])
  if (legacy != null) {
    if (wallet != null) return Math.min(legacy, wallet)
    return legacy
  }

  // Designer must not inherit creator wallet when byRole says 0
  if (mode === 'designer' && otherAvailable > 0) return fallback
  if (wallet != null) return wallet
  return fallback
}

/**
 * Role earned total for dashboard hero (byRole.earned / lifetimeEarned).
 *
 * @param {object} summary
 * @param {'creator'|'designer'} mode
 * @param {number} [commissionsTotal]
 */
export function resolveRoleDisplayedEarnings(summary, mode, commissionsTotal = 0) {
  const bucket = roleBucket(summary, mode)
  if (bucket) {
    const earned = pickAmount(bucket, ['earned', 'lifetimeEarned', 'total'])
    if (earned != null) return earned
  }

  if (mode === 'creator') {
    const earned = pickAmount(summary, [
      'creatorEarned',
      'creatorEarnings',
      'lifetimeEarned',
      'periodEarned',
      'creator',
      'contentEarnings',
      'communityEarnings',
    ])
    if (earned != null) return earned
  } else {
    const earned = pickAmount(summary, [
      'designerEarned',
      'designRoyalties',
      'designerEarnings',
      'periodEarned',
      'royalties',
      'designEarnings',
    ])
    if (earned != null) return earned
  }

  const summaryRole = roleFromSummary(summary)
  if (summaryRole === mode) {
    const period = pickAmount(summary, [
      'lifetimeEarned',
      'totalEarnings',
      'total',
      'grossEarnings',
    ])
    if (period != null) return period
  }

  return commissionsTotal
}

/**
 * Role pending (return window) from byRole[role].pending.
 *
 * @param {object} summary
 * @param {'creator'|'designer'} mode
 * @param {number} [pendingFromCommissions]
 */
export function resolveRoleDisplayedPending(
  summary,
  mode,
  pendingFromCommissions = 0,
) {
  const bucket = roleBucket(summary, mode)
  if (bucket) {
    const pending = pickAmount(bucket, ['pending', 'pendingBalance'])
    if (pending != null) return pending
  }

  const creatorPending = pickAmount(summary, [
    'creatorPending',
    'creatorPendingBalance',
  ])
  const designerPending = pickAmount(summary, [
    'designerPending',
    'designerPendingBalance',
  ])

  if (mode === 'creator') {
    if (creatorPending != null) return creatorPending
    if (designerPending != null) return pendingFromCommissions
    if (roleFromSummary(summary) === 'creator') {
      const scoped = pickAmount(summary, [
        'pendingBalance',
        'pendingEarnings',
        'pending',
      ])
      if (scoped != null) return scoped
    }
    return pendingFromCommissions
  }

  if (designerPending != null) return designerPending
  if (creatorPending != null) return pendingFromCommissions
  if (roleFromSummary(summary) === 'designer') {
    const scoped = pickAmount(summary, [
      'pendingBalance',
      'pendingEarnings',
      'pending',
    ])
    if (scoped != null) return scoped
  }
  return pendingFromCommissions
}

/** Paid-out total for active role (byRole.paidOut) or wallet lifetimePaid. */
export function resolveRolePaidOut(summary, mode) {
  const bucket = roleBucket(summary, mode)
  if (bucket) {
    const paid = pickAmount(bucket, ['paidOut', 'lifetimePaid', 'paid'])
    // byRole.paidOut may lag; if other role has 0 earned, wallet lifetimePaid applies
    const other = roleBucket(
      summary,
      mode === 'designer' ? 'creator' : 'designer',
    )
    const otherEarned = other ? num(other.earned, 0) : 0
    const lifetimePaid = pickAmount(summary, ['lifetimePaid', 'totalPaid'])
    if (paid != null && paid > 0) return paid
    if (otherEarned <= 0 && lifetimePaid != null) return lifetimePaid
    if (paid != null) return paid
  }
  return pickAmount(summary, ['lifetimePaid', 'totalPaid']) ?? 0
}

function commissionList(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.recentCommissions)) return payload.recentCommissions
  if (Array.isArray(payload.commissions)) return payload.commissions
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function commissionRole(row) {
  const raw =
    row?.role ??
    row?.earningRole ??
    row?.type ??
    row?.commissionType ??
    row?.sourceRole ??
    ''
  const r = String(raw).toLowerCase().trim()
  if (r === 'creator' || r === 'affiliate' || r === 'commission') return 'creator'
  if (r === 'designer' || r === 'royalty' || r === 'design') return 'designer'
  return null
}

/** Keep only rows that match the active role (or untagged rows when API already filtered). */
export function filterCommissionsByRole(payload, mode) {
  const list = commissionList(payload)
  const want = mode === 'designer' ? 'designer' : 'creator'
  const tagged = list.filter((row) => commissionRole(row) != null)
  if (!tagged.length) return list
  return list.filter((row) => {
    const r = commissionRole(row)
    return r == null || r === want
  })
}

export function sumCommissionAmounts(payload, mode) {
  const list =
    mode != null ? filterCommissionsByRole(payload, mode) : commissionList(payload)
  return list.reduce((sum, row) => {
    const amount = pickAmount(row, [
      'amount',
      'commissionAmount',
      'earnings',
      'netAmount',
      'creatorAmount',
      'royaltyAmount',
    ])
    return sum + (amount ?? 0)
  }, 0)
}

export function sumPendingCommissionAmounts(payload, mode) {
  const list =
    mode != null ? filterCommissionsByRole(payload, mode) : commissionList(payload)
  return list.reduce((sum, row) => {
    const status = String(row?.status || '').toLowerCase()
    if (status && status !== 'pending' && status !== 'held' && status !== 'processing') {
      return sum
    }
    if (status || row?.isPending || row?.pending) {
      const amount = pickAmount(row, [
        'amount',
        'commissionAmount',
        'earnings',
        'netAmount',
        'pendingAmount',
      ])
      return sum + (amount ?? 0)
    }
    return sum
  }, 0)
}

/**
 * @param {object|null} summary
 * @param {'creator'|'designer'} mode
 * @param {{ commissionsTotal?: number, pendingFromCommissions?: number }} [opts]
 */
export function mapSummaryToDashboardEarnings(
  summary,
  mode = 'creator',
  opts = {},
) {
  if (!summary || typeof summary !== 'object') return null

  const commissionsTotal = num(opts.commissionsTotal, 0)
  const pendingFromCommissions = num(opts.pendingFromCommissions, 0)

  const displayedRaw = resolveRoleDisplayedEarnings(
    summary,
    mode,
    commissionsTotal,
  )
  const pendingRaw = resolveRoleDisplayedPending(
    summary,
    mode,
    pendingFromCommissions,
  )
  let availableRaw = resolveRoleAvailableBalance(summary, mode, NaN)
  if (!Number.isFinite(availableRaw)) {
    availableRaw = Math.max(0, num(displayedRaw) - num(pendingRaw))
  }
  const paidOutRaw = resolveRolePaidOut(summary, mode)

  const creatorBucket = roleBucket(summary, 'creator')
  const designerBucket = roleBucket(summary, 'designer')
  const creator =
    pickAmount(creatorBucket, ['earned', 'available']) ??
    pickAmount(summary, [
      'creatorEarned',
      'creatorAvailableBalance',
      'creatorEarnings',
      'creator',
      'contentEarnings',
      'communityEarnings',
    ])
  const royalties =
    pickAmount(designerBucket, ['earned', 'available']) ??
    pickAmount(summary, [
      'designerEarned',
      'designerAvailableBalance',
      'designRoyalties',
      'designerEarnings',
      'royalties',
      'designEarnings',
    ])

  const minPayout = pickAmount(summary, [
    'minPayoutAmount',
    'minPayout',
    'minimumPayout',
  ])

  const changeRaw =
    summary.changePercent ??
    summary.percentChange ??
    summary.growthPercent ??
    summary.change ??
    null

  const change = formatChange(changeRaw)
  const ratePct = rateFromSummary(summary, mode)
  const isCreator = mode === 'creator'

  const earnings = {
    total: formatEarningsInr(displayedRaw),
    change: change ?? '—',
    creator:
      creator != null
        ? formatEarningsInr(creator)
        : isCreator
          ? formatEarningsInr(displayedRaw)
          : formatEarningsInr(0),
    royalties:
      royalties != null
        ? formatEarningsInr(royalties)
        : !isCreator
          ? formatEarningsInr(displayedRaw)
          : formatEarningsInr(0),
  }

  return {
    earnings,
    summaryChips: null,
    meta: {
      available: formatEarningsInr(availableRaw),
      pending: formatEarningsInr(pendingRaw),
      paidOut: paidOutRaw > 0 ? formatEarningsInr(paidOutRaw) : null,
      availableRaw,
      pendingRaw,
      paidOutRaw,
      earnedRaw: displayedRaw,
      minPayoutRaw: minPayout ?? 5,
      minPayout: formatEarningsInr(minPayout ?? 5),
      commissionRate: ratePct != null ? `${Number(ratePct)}%` : null,
      rateLabel: isCreator ? 'Affiliate Commission Rate' : 'Designer Royalty Rate',
      sourceLabel: isCreator ? 'Tagged Posts & Reels' : 'Design Catalog Sales',
      earningsLabel: isCreator ? 'Creator Earnings' : 'Designer Earnings',
      listTitle: isCreator
        ? 'Recent Creator Commissions'
        : 'Recent Design Royalties',
      emptyListText: isCreator
        ? 'No commissions earned yet from tagged posts.'
        : 'No royalties earned yet from design sales.',
      currency: summary.currency || 'INR',
      raw: summary,
    },
  }
}

export function mapCommissionsToEarningsPerPost(
  payload,
  fallbackImage = '',
  mode,
) {
  return filterCommissionsByRole(payload, mode || 'creator').map((row, index) => {
    const amount = pickAmount(row, [
      'commissionAmount',
      'amount',
      'earnings',
      'netAmount',
      'creatorAmount',
      'royaltyAmount',
    ])
    const item = row.item && typeof row.item === 'object' ? row.item : null
    const title =
      row.title ||
      item?.name ||
      row.contentTitle ||
      row.postTitle ||
      row.itemName ||
      row.sku ||
      row.name ||
      row.description ||
      'Commission'
    const status = row.status ? String(row.status) : null
    const viewsLabel =
      row.views != null
        ? `${row.views} views`
        : status ||
          (row.availableAt || row.createdAt
            ? new Date(row.availableAt || row.createdAt).toLocaleDateString(
                'en-IN',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                },
              )
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
      image:
        item?.thumbnail ||
        item?.imageUrl ||
        row.thumbnail ||
        row.image ||
        row.coverUrl ||
        fallbackImage,
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
