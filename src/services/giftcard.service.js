/**
 * Gift card API – KhushBackend `/gift-card` and `/gift-card/rules`.
 */

import client from './axiosClient.js'
import publicClient from './publicApiClient.js'
import { getPublicImageUrl } from './config.js'
import { debugLog } from '../utils/debugLog.js'

const GIFT_CARD = '/gift-card'
const RULES = '/gift-card/rules'
const LOG = '[GiftCardService]'

function logReq(label, ...args) {
  debugLog(`${LOG} ${label} REQ`, ...args)
}

function logRes(label, data) {
  debugLog(`${LOG} ${label} RES`, data)
}

function logErr(label, err) {
  debugLog(`${LOG} ${label} ERR`, {
    message: apiMessage(err),
    status: err?.response?.status,
    data: err?.response?.data,
  })
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? {}
}

function unwrapItems(res) {
  const data = unwrap(res)
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : []
  return { items, pagination: data?.pagination ?? null }
}

function logItems(label, items, extra = {}) {
  logRes(label, {
    ...extra,
    count: items.length,
    sample: items[0]
      ? {
          _id: items[0]._id,
          status: items[0].status,
          code: items[0].code,
          balance: items[0].balance,
          redemptionType: items[0].redemptionType,
          redeemedByUserId: items[0].redeemedByUserId,
        }
      : null,
  })
}

function apiMessage(err) {
  return err?.response?.data?.message ?? err?.message ?? 'Request failed'
}

export function splitCodeForDisplay(code) {
  if (!code) return ''
  return String(code).replace(/\s+/g, '').split('').join(' ')
}

export function buildGiftCardShareUrl(code) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return ''
  const origin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : ''
  const url = new URL(`${origin}/giftcard`)
  url.searchParams.set('code', normalized)
  return url.toString()
}

function resolveUserRef(ref) {
  if (!ref) return { name: '—', phone: '' }
  if (typeof ref === 'object') {
    return {
      name: ref.name || '—',
      phone: ref.phoneNumber || ref.phone || '',
    }
  }
  return { name: '—', phone: '' }
}

function rulesImage(raw) {
  return raw?.image ? getPublicImageUrl(raw.image) : ''
}

/** GET /gift-card/my — ACTIVE cards you bought that are still usable */
export function mapCreatedCard(raw) {
  if (!raw) return null
  const status = String(raw.status || '').toUpperCase()
  if (status !== 'ACTIVE') return null

  const giftValue = raw.remainingBalance ?? raw.balance ?? 0

  return {
    _id: raw._id,
    code: raw.code || '',
    status: 'AVAILABLE',
    giftValue,
    paidAmount: raw.paidAmount,
    balance: raw.balance,
    remainingBalance: raw.remainingBalance,
    multiplier: raw.multiplier,
    currency: raw.currency,
    createdAt: raw.createdAt,
    sharedAt: raw.sharedAt,
    isShared: Boolean(raw.isShared ?? raw.sharedAt),
    isClaimedByOther: Boolean(raw.isClaimedByOther),
    image: rulesImage(raw),
    rulesName: raw.rulesName,
  }
}

/** GET /gift-card/my — DEPLETED cards (self-redeemed or redeemed by someone else) */
export function mapCreatedDepletedCard(raw) {
  if (!raw) return null
  const status = String(raw.status || '').toUpperCase()
  if (status !== 'DEPLETED') return null

  const displayStatus = raw.displayRedemptionStatus
  const isSelf =
    displayStatus === 'self-redeemed' ||
    raw.redemptionType === 'SELF'
  const redeemer = resolveUserRef(raw.redeemedBy ?? raw.redeemedByUserId)

  return {
    _id: raw._id,
    code: raw.code || '',
    status: isSelf ? 'SELF_REDEEMED' : 'REDEEMED_BY_OTHER',
    displayRedemptionStatus: displayStatus,
    redemptionType: raw.redemptionType,
    giftValue: raw.balance ?? raw.paidAmount ?? 0,
    paidAmount: raw.paidAmount,
    multiplier: raw.multiplier,
    createdAt: raw.createdAt,
    redeemedAt: raw.redeemedAt,
    image: rulesImage(raw),
    redeemedBy: isSelf
      ? { name: 'You', phone: '' }
      : { name: redeemer.name !== '—' ? redeemer.name : 'Someone', phone: redeemer.phone },
    isShared: Boolean(raw.isShared ?? raw.sharedAt),
    isClaimedByOther: Boolean(raw.isClaimedByOther),
  }
}

/** GET /gift-card/received — cards you redeemed (used by you); show who sent them */
export function mapRedeemedFromReceived(raw) {
  if (!raw) return null

  const sender = resolveUserRef(raw.sharedBy ?? raw.referredBy)

  return {
    _id: raw._id,
    code: raw.code || '',
    status: 'REDEEMED',
    giftValue: raw.redeemAmount ?? raw.balance ?? 0,
    redeemAmount: raw.redeemAmount ?? raw.balance,
    paidAmount: raw.paidAmount,
    multiplier: raw.multiplier,
    createdAt: raw.createdAt,
    redeemedAt: raw.redeemedAt,
    image: rulesImage(raw),
    rowLabel: 'Sent By',
    redeemedBy: { name: sender.name, phone: sender.phone },
  }
}

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'))
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

async function openRazorpayCheckout(razorpayData, { description = 'Khush Gift Card' } = {}) {
  logReq('openRazorpayCheckout', {
    orderId: razorpayData?.orderId,
    keyId: razorpayData?.keyId,
    amount: razorpayData?.amount,
    currency: razorpayData?.currency,
    description,
  })
  if (!razorpayData?.orderId || !razorpayData?.keyId) {
    throw new Error('Payment order is invalid')
  }
  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: razorpayData.keyId,
      amount: Math.round(Number(razorpayData.amount || 0) * 100),
      currency: razorpayData.currency || 'INR',
      order_id: razorpayData.orderId,
      name: 'Khush',
      description,
      handler: (paymentResp) => {
        logRes('openRazorpayCheckout', {
          razorpay_order_id: paymentResp?.razorpay_order_id,
          razorpay_payment_id: paymentResp?.razorpay_payment_id,
          razorpay_signature: paymentResp?.razorpay_signature ? '(present)' : undefined,
        })
        resolve(paymentResp)
      },
      modal: {
        ondismiss: () => {
          debugLog(`${LOG} openRazorpayCheckout dismissed`)
          reject(new Error('Payment cancelled'))
        },
      },
      theme: { color: '#000000' },
    })
    rzp.on('payment.failed', (resp) => {
      debugLog(`${LOG} openRazorpayCheckout payment.failed`, resp)
      reject(new Error('Payment failed'))
    })
    rzp.open()
  })
}

export const giftcardService = {
  async getActiveRules() {
    logReq('getActiveRules')
    try {
      const res = await publicClient.get(`${RULES}/active`)
      const data = unwrap(res)
      if (data?.image) data.image = getPublicImageUrl(data.image)
      logRes('getActiveRules', data)
      return data
    } catch (err) {
      logErr('getActiveRules', err)
      throw err
    }
  },

  async previewBuy(amount) {
    const params = { amount: Number(amount) || 500 }
    logReq('previewBuy', params)
    try {
      const res = await client.get(`${GIFT_CARD}/buy/preview`, { params })
      const data = unwrap(res)
      if (data?.image) data.image = getPublicImageUrl(data.image)
      logRes('previewBuy', data)
      return data
    } catch (err) {
      logErr('previewBuy', err)
      throw err
    }
  },

  async createBuyOrder(amount) {
    const body = { amount: Number(amount) }
    logReq('createBuyOrder', body)
    try {
      const res = await client.post(`${GIFT_CARD}/buy`, body)
      const data = unwrap(res)
      if (data?.image) data.image = getPublicImageUrl(data.image)
      logRes('createBuyOrder', {
        giftCardId: data?.giftCardId,
        payAmount: data?.payAmount,
        cardValue: data?.cardValue,
        razorpay: data?.razorpay,
      })
      return data
    } catch (err) {
      logErr('createBuyOrder', err)
      throw err
    }
  },

  async verifyBuyPayment(payload) {
    logReq('verifyBuyPayment', {
      razorpay_order_id: payload?.razorpay_order_id,
      razorpay_payment_id: payload?.razorpay_payment_id,
      razorpay_signature: payload?.razorpay_signature ? '(redacted)' : undefined,
    })
    try {
      const res = await client.post(`${GIFT_CARD}/buy/verify`, payload)
      const data = unwrap(res)
      logRes('verifyBuyPayment', data)
      return data
    } catch (err) {
      logErr('verifyBuyPayment', err)
      throw err
    }
  },

  async purchase({ amount }) {
    logReq('purchase', { amount })
    try {
      const orderData = await this.createBuyOrder(amount)
      const payment = await openRazorpayCheckout(orderData.razorpay, {
        description: `Gift card ₹${orderData.payAmount ?? amount}`,
      })
      const verified = await this.verifyBuyPayment({
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      })
      const card = verified?.giftCard ?? verified
      let shareUrl = buildGiftCardShareUrl(card?.code)
      try {
        const shared = await this.shareGiftCard(card?.code)
        if (shared?.shareUrl) shareUrl = shared.shareUrl
      } catch {
        /* fallback to client-built URL */
      }
      const result = {
        ...card,
        giftValue: card?.balance ?? orderData?.cardValue ?? 0,
        paidAmount: card?.paidAmount ?? orderData?.payAmount ?? amount,
        shareUrl,
      }
      logRes('purchase', {
        giftCardId: card?._id,
        code: card?.code,
        status: card?.status,
        shareUrl,
      })
      return result
    } catch (err) {
      logErr('purchase', err)
      throw err
    }
  },

  async shareGiftCard(code) {
    const normalized = String(code || '').trim().toUpperCase()
    logReq('shareGiftCard', { code: normalized })
    try {
      const res = await client.post(`${GIFT_CARD}/share`, { code: normalized })
      const data = unwrap(res)
      logRes('shareGiftCard', data)
      return data
    } catch (err) {
      logErr('shareGiftCard', err)
      throw err
    }
  },

  async redeem({ code }) {
    const normalized = String(code || '').trim().toUpperCase()
    logReq('redeem', { code: normalized })
    try {
      const res = await client.post(`${GIFT_CARD}/redeem`, { code: normalized })
      const data = unwrap(res)
      if (data?.isDuplicate && res?.data?.message) {
        data.message = res.data.message
      }
      logRes('redeem', data)
      return data
    } catch (err) {
      logErr('redeem', err)
      throw err
    }
  },

  async previewRedeem(code) {
    const normalized = String(code).trim().toUpperCase()
    logReq('previewRedeem', { code: normalized })
    try {
      const res = await client.get(`${GIFT_CARD}/redeem/preview`, { params: { code: normalized } })
      const data = unwrap(res)
      logRes('previewRedeem', data)
      return data
    } catch (err) {
      logErr('previewRedeem', err)
      throw err
    }
  },

  /** GET /gift-card/my — purchased cards; optional status filter */
  async listMyGiftCards(page = 1, limit = 50, status) {
    const params = { page, limit }
    if (status) params.status = status
    logReq('listMyGiftCards', params)
    try {
      const res = await client.get(`${GIFT_CARD}/my`, { params })
      const { items, pagination } = unwrapItems(res)
      logItems('listMyGiftCards', items, { status, pagination })
      return { items, pagination }
    } catch (err) {
      logErr('listMyGiftCards', err)
      throw err
    }
  },

  /** GET /gift-card/received — cards you redeemed (sent by others) */
  async listReceivedGiftCards(page = 1, limit = 50) {
    logReq('listReceivedGiftCards', { page, limit })
    try {
      const res = await client.get(`${GIFT_CARD}/received`, { params: { page, limit } })
      const { items, pagination } = unwrapItems(res)
      logItems('listReceivedGiftCards', items, { pagination })
      return { items, pagination }
    } catch (err) {
      logErr('listReceivedGiftCards', err)
      throw err
    }
  },

  /** Created tab: purchased gift cards (active + depleted with redemption info) */
  async listCreatedGiftCards() {
    const { items } = await this.listMyGiftCards(1, 50)
    const mapped = items
      .map((raw) => mapCreatedCard(raw) ?? mapCreatedDepletedCard(raw))
      .filter(Boolean)

    mapped.sort((a, b) => {
      const ta = new Date(b.createdAt || 0).getTime()
      const tb = new Date(a.createdAt || 0).getTime()
      return ta - tb
    })

    debugLog('[GiftCard] Created — raw API data:', items)
    debugLog('[GiftCard] Created — mapped data:', mapped)
    return mapped
  },

  /** Redeemed tab: cards you redeemed (/received), with sender info */
  async listRedeemedGiftCards() {
    const { items: received } = await this.listReceivedGiftCards(1, 50)
    const mapped = received.map(mapRedeemedFromReceived).filter(Boolean)

    mapped.sort((a, b) => {
      const ta = new Date(b.redeemedAt || b.createdAt || 0).getTime()
      const tb = new Date(a.redeemedAt || a.createdAt || 0).getTime()
      return ta - tb
    })

    debugLog('[GiftCard] Redeemed — raw API (received):', received)
    debugLog('[GiftCard] Redeemed — mapped data:', mapped)

    logRes('listRedeemedGiftCards', { total: mapped.length })
    return mapped
  },

  /** Load both list columns in parallel */
  async getHistory() {
    logReq('getHistory')
    try {
      const [created, redeemed] = await Promise.all([
        this.listCreatedGiftCards(),
        this.listRedeemedGiftCards(),
      ])
      logRes('getHistory', { created: created.length, redeemed: redeemed.length })
      return { created, redeemed }
    } catch (err) {
      logErr('getHistory', err)
      throw err
    }
  },

  async share(code) {
    const normalized = String(code).trim().toUpperCase()
    logReq('share', { code: normalized })
    try {
      const res = await client.post(`${GIFT_CARD}/share`, { code: normalized })
      const data = unwrap(res)
      logRes('share', data)
      return data
    } catch (err) {
      logErr('share', err)
      throw err
    }
  },
}

export { apiMessage as giftcardApiMessage }
