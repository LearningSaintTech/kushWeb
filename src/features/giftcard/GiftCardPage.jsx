import React, { useCallback, useEffect, useRef, useState } from 'react'
import { debugLog } from '../../utils/debugLog.js';
import { useSearchParams, useNavigate } from 'react-router-dom'
import frameBanner from '../../assets/temporary/Frame 2147225414.png'
import { useAuth } from '../../app/context/AuthContext'
import { ROUTES } from '../../utils/constants'
import {
  giftcardService,
  giftcardApiMessage,
  splitCodeForDisplay,
  buildGiftCardShareUrl,
  resolveGiftCardValue,
  resolveRulesBonusPercent,
  resolveGiftCardRulesList,
  computeGiftCardPreviewFromRules,
  normalizeGiftCardImageUrl,
} from '../../services/giftcard.service.js'
import GiftCardPurchasedModal from './GiftCardPurchasedModal.jsx'
import GiftCardCreatedShareModal from './GiftCardCreatedShareModal.jsx'
import GiftCardPromoBanner from './GiftCardPromoBanner.jsx'
import GiftCardPageHeader from './GiftCardPageHeader.jsx'
import GiftCardWalletSuccessModal from './GiftCardWalletSuccessModal.jsx'
import GiftCardAlreadyRedeemedModal from './GiftCardAlreadyRedeemedModal.jsx'

const PRESET_AMOUNTS = [500, 1000, 2000, 3000]

const INFO_POINTS = [
  'Bonus value is applied per active gifting slab rules on your purchase amount.',
  'Khush Gift Cards can be purchased instantly by entering your preferred amount.',
  'Redeem gift card balance easily during checkout on eligible products.',
  'Gift cards and wallet transactions are secured with encrypted payment and account protection systems.',
]

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function formatGiftDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()}${MONTHS[d.getMonth()]},${d.getFullYear()}`
}

function formatValue(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  const hasFraction = Math.abs(n % 1) > 0.001
  return `₹${n.toLocaleString('en-IN', {
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: 0,
  })}`
}

function isAlreadyRedeemedResult(result) {
  return Boolean(result?.isDuplicate)
}

function isAlreadyRedeemedError(err) {
  const status = err?.response?.status
  const msg = String(giftcardApiMessage(err) || '').toLowerCase()
  return (
    status === 409 ||
    status === 410 ||
    msg.includes('already redeemed') ||
    msg.includes('already used') ||
    (msg.includes('already') && msg.includes('redeem')) ||
    msg.includes('gift card already')
  )
}

const ALREADY_REDEEMED_MESSAGE = 'This gift card has already been redeemed.'

function GiftCardThumb({ imageUrl, onClick, clickable }) {
  const fallback = frameBanner
  const [src, setSrc] = useState(() => normalizeGiftCardImageUrl(imageUrl) || fallback)

  useEffect(() => {
    setSrc(normalizeGiftCardImageUrl(imageUrl) || fallback)
  }, [imageUrl])

  const frameClass =
    'relative aspect-[4/3] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-neutral-900 sm:w-20'

  const img = (
    <img
      src={src}
      alt="Khush Gift Card"
      className="h-full w-full object-contain object-left-top"
      draggable={false}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        setSrc((current) => (current !== fallback ? fallback : current))
      }}
    />
  )

  if (!clickable) {
    return <div className={frameClass}>{img}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${frameClass} transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30`}
      aria-label="View Khush gift card details"
    >
      {img}
    </button>
  )
}

function StatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE'
  const label =
    status === 'SELF_REDEEMED'
      ? 'SELF REDEEMED'
      : status === 'REDEEMED_BY_OTHER'
        ? 'REDEEMED'
        : status === 'REDEEMED'
          ? 'REDEEMED'
          : 'AVAILABLE'

  return (
    <span
      className={`mt-1 inline-block rounded px-1.5 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide ${isAvailable ? 'bg-[#E8F5E9] text-[#34A853]' : 'bg-[#E3F2FD] text-[#068FBD]'
        }`}
    >
      {label}
    </span>
  )
}

function CreatedRow({ card, selected, onThumbClick }) {
  const canOpen = card.status === 'AVAILABLE' && Boolean(onThumbClick)
  const isDepleted = card.status === 'SELF_REDEEMED' || card.status === 'REDEEMED_BY_OTHER'
  const redeemerName = card.redeemedBy?.name ?? ''
  const redeemerPhone = card.redeemedBy?.phone ?? ''

  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-200 px-3 py-3 sm:px-4 sm:gap-4 ${selected ? 'bg-gray-50' : 'bg-white'
        }`}
    >
      <div className="flex shrink-0 flex-col items-center">
        <GiftCardThumb
          imageUrl={card.image}
          clickable={canOpen}
          onClick={canOpen ? () => onThumbClick(card) : undefined}
        />
        <StatusBadge status={card.status} />
      </div>

      <div className="min-w-0">
        {isDepleted ? (
          <>
            <p className="flex items-center gap-1.5 font-inter text-[11px] font-medium whitespace-nowrap text-gray-400">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              Redeemed By
            </p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-inter text-sm whitespace-nowrap">
              {card.status === 'SELF_REDEEMED' ? (
                <span className="font-semibold uppercase text-black">You</span>
              ) : (
                <>
                  <span className="font-semibold uppercase text-black">{redeemerName}</span>
                  {redeemerPhone ? (
                    <span className="font-medium text-gray-500">{redeemerPhone}</span>
                  ) : null}
                </>
              )}
            </p>
            {card.redeemedAt ? (
              <p className="mt-0.5 flex items-center gap-1.5 font-inter text-[10px] font-medium whitespace-nowrap text-gray-400">
                <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                Redeemed On {formatGiftDate(card.redeemedAt)}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-inter text-[11px] font-medium whitespace-nowrap text-gray-400">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              Created On
            </p>
            <p className="font-inter text-sm font-semibold uppercase whitespace-nowrap text-black">
              {formatGiftDate(card.createdAt)}
            </p>
          </>
        )}
        <p className="mt-0.5 font-inter text-lg font-semibold leading-tight text-[#E65100] sm:text-xl">
          {formatValue(card.giftValue)}
        </p>
        <p className="font-inter text-[9px] font-medium uppercase leading-snug tracking-wide text-gray-500">
          <span className="whitespace-nowrap">
            Gift Card Value
            {card.paidAmount != null ? ` · Paid ${formatValue(card.paidAmount)}` : ''}
            {card.multiplier ? ` · ${card.multiplier}×` : ''}
          </span>
        </p>
      </div>

      <p className="shrink-0 whitespace-nowrap text-right font-['Poltawski_Now'] text-[11px] tracking-[0.14em] text-black sm:text-sm sm:tracking-[0.08em]">
        {splitCodeForDisplay(card.code)}
      </p>
    </div>
  )
}

function RedeemedRow({ card }) {
  const name = card.redeemedBy?.name ?? '—'
  const phone = card.redeemedBy?.phone ?? ''
  const rowLabel = card.rowLabel ?? 'Sent By'
  const dateLabel = card.redeemedAt ? 'Redeemed On' : 'Created On'
  const dateValue = card.redeemedAt || card.createdAt

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 sm:px-4 sm:gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <GiftCardThumb imageUrl={card.image} />
        <StatusBadge status={card.status} />
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-inter text-[11px] font-medium whitespace-nowrap text-gray-400">
          <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-gray-400" />
          {rowLabel}
        </p>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-inter text-sm whitespace-nowrap">
          <span className="font-semibold uppercase text-black">{name}</span>
          {phone ? <span className="font-medium text-gray-500">{phone}</span> : null}
        </p>
        <p className="mt-0.5 font-inter text-lg font-semibold leading-tight text-[#E65100] sm:text-xl">
          {formatValue(card.giftValue)}
        </p>
        <p className="font-inter text-[9px] font-medium uppercase leading-snug tracking-wide text-gray-500">
          <span className="whitespace-nowrap">
            Gift Card Value
            {card.redeemAmount != null ? ` · Redeemed ${formatValue(card.redeemAmount)}` : ''}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 font-inter text-[10px] font-medium whitespace-nowrap text-gray-400">
          <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-gray-400" />
          {dateLabel} {formatGiftDate(dateValue)}
        </p>
      </div>

      <p className="shrink-0 whitespace-nowrap text-right font-['Poltawski_Now'] text-[11px] tracking-[0.14em] text-black sm:text-sm sm:tracking-[0.08em]">
        {card.code ? splitCodeForDisplay(card.code) : ''}
      </p>
    </div>
  )
}

function GiftCardColumn({ title, children, emptyMessage }) {
  return (
    <div className="flex h-full w-1/2 flex-col overflow-hidden border-gray-200 first:border-r">
      <h2 className="border-b border-gray-200 px-4 py-3 font-inter text-sm font-medium uppercase tracking-[3.307px] text-black">
        {title}
      </h2>
      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {children}
        {React.Children.count(children) === 0 && (
          <p className="px-4 py-8 text-center font-inter text-xs text-gray-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}

const TAB_CREATED = 'created'
const TAB_REDEEMED = 'redeemed'

function GiftCardListTabs({
  activeTab,
  onTabChange,
  created,
  redeemed,
  listLoading,
  onCreatedThumbClick,
}) {
  const tabs = [
    { id: TAB_CREATED, label: 'CREATED' },
    { id: TAB_REDEEMED, label: 'REDEEMED GIFT' },
  ]

  const isCreated = activeTab === TAB_CREATED
  const items = isCreated ? created : redeemed
  const emptyMessage = isCreated
    ? 'No gift cards yet. Buy a gift card to see it here.'
    : 'No redeemed gift cards yet. Redeem a code shared with you.'

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-gray-200 bg-white lg:hidden">
      <div className="flex gap-2 border-b border-gray-200 px-3 py-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 rounded-md px-3 py-2.5 font-inter text-xs font-medium uppercase tracking-wide transition-colors ${isActive
                  ? 'bg-[#E8E8E8] font-bold text-black'
                  : 'bg-[#F2F2F2] text-gray-500'
                }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="scrollbar-hide min-h-[200px] max-h-[min(520px,55vh)] overflow-y-auto">
        {listLoading ? (
          <p className="px-4 py-8 text-center font-inter text-sm text-gray-500">Loading gift cards…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center font-inter text-xs text-gray-500">{emptyMessage}</p>
        ) : isCreated ? (
          items.map((card, i) => (
            <CreatedRow
              key={card._id ?? i}
              card={card}
              selected={i === 0}
              onThumbClick={onCreatedThumbClick}
            />
          ))
        ) : (
          items.map((card, i) => <RedeemedRow key={card._id ?? i} card={card} />)
        )}
      </div>
    </div>
  )
}

function GiftCardDesktopLists({ created, redeemed, listLoading, onCreatedThumbClick }) {
  return (
    <div className="hidden h-[1000px] w-full flex-row overflow-hidden rounded border border-gray-200 lg:flex lg:w-[70%]">
      {listLoading ? (
        <p className="w-full px-4 py-8 text-center font-inter text-sm text-gray-500">Loading gift cards…</p>
      ) : (
        <>
          <GiftCardColumn title="Created" emptyMessage="No gift cards yet. Buy a gift card to see it here.">
            {created.map((card, i) => (
              <CreatedRow
                key={card._id ?? i}
                card={card}
                selected={i === 0}
                onThumbClick={onCreatedThumbClick}
              />
            ))}
          </GiftCardColumn>
          <GiftCardColumn
            title="Redeemed"
            emptyMessage="No redeemed gift cards yet. Redeem a code shared with you."
          >
            {redeemed.map((card, i) => (
              <RedeemedRow key={card._id ?? i} card={card} />
            ))}
          </GiftCardColumn>
        </>
      )}
    </div>
  )
}

function GiftCardPurchasePanel({
  payAmount,
  onPayAmountChange,
  onBuy,
  buying,
  onRedeem,
  redeeming,
  theyGet,
  previewBonusAmount,
  previewPercent,
  infoPoints,
  bannerImage,
  rulesReady,
  initialRedeemCode,
  previewLoading,
  redeemInputResetKey = 0,
}) {
  const [redeemCode, setRedeemCode] = useState(initialRedeemCode || '')
  const lastUrlCode = useRef(initialRedeemCode || '')

  useEffect(() => {
    if (!initialRedeemCode || initialRedeemCode === lastUrlCode.current) return
    lastUrlCode.current = initialRedeemCode
    setRedeemCode(initialRedeemCode)
  }, [initialRedeemCode])

  useEffect(() => {
    if (redeemInputResetKey > 0) {
      setRedeemCode('')
      lastUrlCode.current = initialRedeemCode || ''
    }
  }, [redeemInputResetKey, initialRedeemCode])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-md sm:p-5">
      <GiftCardPromoBanner
        className="px-1 pb-4 sm:pb-5"
        imageUrl={bannerImage}
      />

      <div className="space-y-5 px-1 pb-1 sm:px-2">
        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
          <div>
            <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-gray-500">You Pay</p>
            <p className="font-inter text-xl font-bold text-black">
              {previewLoading || !rulesReady ? '…' : formatValue(payAmount)}
            </p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 33 33" fill="none">
              <rect x="0.335333" y="0.335333" width="31.5213" height="31.5213" rx="15.7607" fill="#F2F2F2" />
              <rect
                x="0.335333"
                y="0.335333"
                width="31.5213"
                height="31.5213"
                rx="15.7607"
                stroke="black"
                strokeWidth="0.670667"
              />
              <path
                d="M8.35596 15.6096L22.0487 15.6096L16.1804 9.48611L16.9181 8.61133L24.1837 16.1928L16.9181 23.7742L16.1804 22.8994L22.0487 16.776H8.35596V15.6096Z"
                fill="black"
              />
            </svg>
          </span>
          <div className="text-center">
            <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-gray-500">
              They Get
            </p>
            <p className="font-inter text-xl font-bold text-[#E65100]">
              {previewLoading || !rulesReady ? '…' : formatValue(theyGet)}
            </p>
            {!previewLoading && rulesReady && previewBonusAmount != null && Number(previewBonusAmount) > 0 ? (
              <p className="mt-0.5 font-inter text-[10px] font-medium text-[#E65100]">
                +{formatValue(previewBonusAmount)} bonus
                {previewPercent != null ? ` (${previewPercent}%)` : ''}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="font-inter text-xs font-bold uppercase tracking-wide text-black">
            Choose Gift Card Amount(You Pay)
          </p>
          <input
            type="number"
            min={1}
            placeholder="Enter Amount"
            value={payAmount || ''}
            onChange={(e) => onPayAmountChange(Number(e.target.value) || 0)}
            className="mt-2 w-full border-0 border-b border-gray-300 bg-transparent py-2 font-inter text-sm text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onPayAmountChange(amt)}
                className={`rounded-full px-4 py-1.5 font-inter text-xs font-semibold transition-colors ${payAmount === amt
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={buying || payAmount < 1 || previewLoading}
          onClick={onBuy}
          className="w-full rounded-md bg-black py-3 font-inter text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buying ? 'Processing…' : 'Buy Gift'}
        </button>

        <ul className="space-y-2 rounded-lg border border-gray-200 px-4 py-3">
          {infoPoints.map((point) => (
            <li key={point} className="flex gap-2 font-inter text-[10px] leading-snug text-gray-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              {point}
            </li>
          ))}
        </ul>

        <div className="rounded-lg  text-center border border-gray-100 px-4 py-4">
          <p className="font-inter text-xs font-bold uppercase tracking-wide text-black">Redeem Gift Card</p>
          <input
            type="text"
            placeholder="Enter Unique Gift Number"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
            className="mt-3 w-full border-0 border-b border-gray-300 bg-transparent py-2 font-inter text-2xl tracking-[0.35em] text-black text-center placeholder:font-inter placeholder:text-sm placeholder:tracking-normal placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            disabled={redeeming || !redeemCode.trim()}
            onClick={() => onRedeem(redeemCode.trim())}
            className="mt-4 w-full rounded-md bg-black py-3 font-inter text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {redeeming ? 'Processing…' : 'Redeem'}
          </button>
        </div>
      </div>
    </div>
  )
}

const GiftCardPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()

  const [created, setCreated] = useState([])
  const [redeemed, setRedeemed] = useState([])
  const [payAmount, setPayAmount] = useState(500)
  const [theyGet, setTheyGet] = useState(0)
  const [previewData, setPreviewData] = useState(null)
  const [infoPoints, setInfoPoints] = useState(INFO_POINTS)
  const [bonusPercent, setBonusPercent] = useState(null)
  const [bannerImage, setBannerImage] = useState('')
  const [rulesReady, setRulesReady] = useState(false)
  const [buying, setBuying] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [listTab, setListTab] = useState(TAB_CREATED)
  const [purchasedModal, setPurchasedModal] = useState(null)
  const [selfRedeeming, setSelfRedeeming] = useState(false)
  const [createdModalCard, setCreatedModalCard] = useState(null)
  const [createdModalShareUrl, setCreatedModalShareUrl] = useState('')
  const [createdModalRedeeming, setCreatedModalRedeeming] = useState(false)
  const [walletSuccessAmount, setWalletSuccessAmount] = useState(null)
  const [alreadyRedeemedOpen, setAlreadyRedeemedOpen] = useState(false)
  const [alreadyRedeemedMessage, setAlreadyRedeemedMessage] = useState('')
  const [redeemInputResetKey, setRedeemInputResetKey] = useState(0)

  const urlRedeemCode =
    searchParams.get('code')?.trim().toUpperCase() ||
    searchParams.get('redeem')?.trim().toUpperCase() ||
    ''

  const bonusPercentRef = useRef(bonusPercent)
  const activeRulesRef = useRef(null)
  const payAmountRef = useRef(payAmount)
  const historyRequestId = useRef(0)

  bonusPercentRef.current = bonusPercent
  payAmountRef.current = payAmount

  const applyRulesPreview = useCallback((rules, amount) => {
    if (!rules) return null
    const data = computeGiftCardPreviewFromRules(rules, amount)
    setPreviewData(data)
    setTheyGet(data.cardValue)
    if (data.percent != null) {
      setBonusPercent(data.percent)
      bonusPercentRef.current = data.percent
    }
    if (data.rules?.length) setInfoPoints(data.rules)
    if (data.image) setBannerImage(data.image)
    return data
  }, [])

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setCreated([])
      setRedeemed([])
      return
    }
    const requestId = ++historyRequestId.current
    setListLoading(true)
    setError('')
    try {
      const [createdList, redeemedList] = await Promise.all([
        giftcardService.listCreatedGiftCards(),
        giftcardService.listRedeemedGiftCards(),
      ])
      if (requestId !== historyRequestId.current) return
      debugLog('[GiftCard] Created gift cards — all data:', createdList)
      debugLog('[GiftCard] Redeemed gift cards — all data:', redeemedList)
      setCreated(createdList)
      setRedeemed(redeemedList)
    } catch (err) {
      if (requestId !== historyRequestId.current) return
      setError(giftcardApiMessage(err))
    } finally {
      if (requestId === historyRequestId.current) setListLoading(false)
    }
  }, [isAuthenticated])

  const loadPreview = useCallback(async (amount) => {
    const pay = Number(amount)
    if (!Number.isFinite(pay) || pay < 1) {
      setPreviewData(null)
      setTheyGet(0)
      return
    }

    if (activeRulesRef.current) {
      applyRulesPreview(activeRulesRef.current, pay)
    }

    if (!isAuthenticated) return

    setPreviewLoading(true)
    try {
      const data = await giftcardService.previewBuy(pay)
      setPreviewData(data)
      setTheyGet(resolveGiftCardValue(data, pay))
      const percent = resolveRulesBonusPercent(data)
      if (percent != null) {
        setBonusPercent(percent)
        bonusPercentRef.current = percent
      }
      const rulesList = resolveGiftCardRulesList(data)
      if (rulesList.length > 0) setInfoPoints(rulesList)
      if (data?.image) setBannerImage(data.image)
    } catch (err) {
      debugLog('[GiftCard] preview failed', giftcardApiMessage(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [isAuthenticated, applyRulesPreview])

  const handlePayAmountChange = useCallback((amount) => {
    const next = Number(amount) || 0
    setPayAmount(next)
    payAmountRef.current = next
    if (next < 1) {
      setTheyGet(0)
      setPreviewData(null)
      return
    }
    if (activeRulesRef.current) {
      applyRulesPreview(activeRulesRef.current, next)
      return
    }
    const percent = bonusPercentRef.current
    if (percent != null) {
      setTheyGet(next + next * (percent / 100))
    } else {
      setTheyGet(next)
    }
  }, [applyRulesPreview])

  useEffect(() => {
    if (!authChecked) return
    if (!isAuthenticated) {
      openAuthModal(ROUTES.GIFTCARD)
      navigate(ROUTES.HOME, { replace: true })
    }
  }, [authChecked, isAuthenticated, navigate, openAuthModal])

  useEffect(() => {
    let cancelled = false
    giftcardService
      .getActiveRules()
      .then((rules) => {
        if (cancelled) return
        activeRulesRef.current = rules
        const percent = resolveRulesBonusPercent(rules)
        if (percent != null) {
          setBonusPercent(percent)
          bonusPercentRef.current = percent
        }
        const rulesList = resolveGiftCardRulesList(rules)
        if (rulesList.length > 0) setInfoPoints(rulesList)
        if (rules?.image) setBannerImage(rules.image)
        applyRulesPreview(rules, payAmountRef.current)
      })
      .catch((err) => {
        debugLog('[GiftCard] rules failed', giftcardApiMessage(err))
      })
      .finally(() => {
        if (!cancelled) setRulesReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [applyRulesPreview])

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return
    loadPreview(payAmountRef.current)
  }, [authChecked, isAuthenticated, loadPreview])

  useEffect(() => {
    const t = setTimeout(() => loadPreview(payAmount), 300)
    return () => clearTimeout(t)
  }, [payAmount, loadPreview])

  useEffect(() => {
    if (!authChecked) return
    loadHistory()
  }, [authChecked, isAuthenticated, loadHistory])

  useEffect(() => {
    if (urlRedeemCode) setListTab(TAB_REDEEMED)
  }, [urlRedeemCode])

  const requireAuth = () => {
    if (isAuthenticated) return true
    openAuthModal?.(ROUTES.GIFTCARD)
    navigate(ROUTES.HOME, { replace: true })
    return false
  }

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-inter text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  const handleBuy = async () => {
    if (payAmount < 1) return
    if (!requireAuth()) return
    setBuying(true)
    setError('')
    setSuccess('')
    try {
      const card = await giftcardService.purchase({ amount: payAmount })
      setPurchasedModal({
        code: card?.code || '',
        giftValue: card?.giftValue ?? card?.balance ?? theyGet,
        paidAmount: card?.paidAmount ?? payAmount,
        shareUrl: card?.shareUrl || '',
      })
      setSuccess('')
      await loadHistory()
      setListTab(TAB_CREATED)
    } catch (err) {
      setError(giftcardApiMessage(err))
    } finally {
      setBuying(false)
    }
  }

  const clearRedeemInput = () => setRedeemInputResetKey((key) => key + 1)

  const closeAlreadyRedeemedModal = () => {
    setAlreadyRedeemedOpen(false)
    setAlreadyRedeemedMessage('')
    clearRedeemInput()
  }

  const showAlreadyRedeemedPopup = (resultOrMessage) => {
    const message =
      typeof resultOrMessage === 'string'
        ? resultOrMessage
        : resultOrMessage?.message || ALREADY_REDEEMED_MESSAGE
    setAlreadyRedeemedMessage(message)
    setAlreadyRedeemedOpen(true)
  }

  const handleRedeem = async (code) => {
    if (!requireAuth()) return
    setRedeeming(true)
    setError('')
    setSuccess('')
    try {
      const result = await giftcardService.redeem({ code })
      if (isAlreadyRedeemedResult(result)) {
        showAlreadyRedeemedPopup(result)
        await loadHistory()
        setListTab(TAB_REDEEMED)
        return
      }
      const amount = result.redeemAmount ?? result.giftCard?.balance
      const redemptionType = result.redemptionType
      // Show wallet success popup (matches design screenshot)
      setWalletSuccessAmount(Number(amount ?? 0))
      setSuccess(
        amount != null
          ? `₹${Number(amount).toLocaleString('en-IN')} credited to your wallet.${redemptionType === 'SELF' ? ' (Self redeemed)' : ''
          }`
          : 'Gift card redeemed to wallet successfully.'
      )
      await loadHistory()
      setListTab(TAB_REDEEMED)
    } catch (err) {
      if (isAlreadyRedeemedError(err)) {
        showAlreadyRedeemedPopup(giftcardApiMessage(err) || ALREADY_REDEEMED_MESSAGE)
      } else {
        setError(giftcardApiMessage(err))
      }
    } finally {
      setRedeeming(false)
    }
  }

  const closePurchasedModal = () => setPurchasedModal(null)

  const closeCreatedModal = () => setCreatedModalCard(null)

  const openCreatedModal = async (card) => {
    if (!card?.code || card.status !== 'AVAILABLE') return
    if (!requireAuth()) return
    setCreatedModalCard(card)
    let shareUrl = buildGiftCardShareUrl(card.code)
    setCreatedModalShareUrl(shareUrl)
    try {
      const shared = await giftcardService.shareGiftCard(card.code)
      if (shared?.shareUrl) {
        shareUrl = shared.shareUrl
        setCreatedModalShareUrl(shareUrl)
      }
    } catch {
      /* use client-built URL */
    }
  }

  const handleCreatedModalRedeem = async (code) => {
    if (!requireAuth()) return
    setCreatedModalRedeeming(true)
    setError('')
    try {
      const result = await giftcardService.redeem({ code })
      if (isAlreadyRedeemedResult(result)) {
        closeCreatedModal()
        showAlreadyRedeemedPopup(result)
        await loadHistory()
        setListTab(TAB_REDEEMED)
        return
      }
      const amount = result.redeemAmount ?? result.giftCard?.balance ?? createdModalCard?.giftValue
      closeCreatedModal()
      setWalletSuccessAmount(amount ?? 0)
      await loadHistory()
      setListTab(TAB_REDEEMED)
    } catch (err) {
      if (isAlreadyRedeemedError(err)) {
        closeCreatedModal()
        showAlreadyRedeemedPopup(giftcardApiMessage(err) || ALREADY_REDEEMED_MESSAGE)
      } else {
        setError(giftcardApiMessage(err))
      }
    } finally {
      setCreatedModalRedeeming(false)
    }
  }

  const closeWalletSuccessModal = () => {
    setWalletSuccessAmount(null)
    clearRedeemInput()
  }

  const handleSelfRedeemFromModal = async () => {
    const code = purchasedModal?.code
    if (!code) return
    setSelfRedeeming(true)
    setError('')
    try {
      const result = await giftcardService.redeem({ code })
      if (isAlreadyRedeemedResult(result)) {
        closePurchasedModal()
        showAlreadyRedeemedPopup(result)
        await loadHistory()
        setListTab(TAB_REDEEMED)
        return
      }
      const amount = result.redeemAmount ?? result.giftCard?.balance
      // Show wallet success popup (matches design screenshot)
      setWalletSuccessAmount(Number(amount ?? 0))
      setSuccess(
        amount != null
          ? `₹${Number(amount).toLocaleString('en-IN')} credited to your wallet. (Self redeemed)`
          : 'Gift card redeemed to wallet successfully.'
      )
      closePurchasedModal()
      await loadHistory()
      setListTab(TAB_REDEEMED)
    } catch (err) {
      if (isAlreadyRedeemedError(err)) {
        closePurchasedModal()
        showAlreadyRedeemedPopup(giftcardApiMessage(err) || ALREADY_REDEEMED_MESSAGE)
      } else {
        setError(giftcardApiMessage(err))
      }
    } finally {
      setSelfRedeeming(false)
    }
  }

  const alerts = (error || success) && (
    <div
      className={`mb-3 rounded-lg px-4 py-2 font-inter text-xs ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
        }`}
    >
      {error || success}
    </div>
  )

  const purchasePanel = (
    <GiftCardPurchasePanel
      payAmount={payAmount}
      onPayAmountChange={handlePayAmountChange}
      onBuy={handleBuy}
      buying={buying}
      onRedeem={handleRedeem}
      redeeming={redeeming}
      theyGet={previewData?.cardValue ?? theyGet}
      previewBonusAmount={previewData?.bonusAmount}
      previewPercent={previewData?.percent ?? bonusPercent}
      infoPoints={infoPoints}
      bannerImage={bannerImage}
      rulesReady={rulesReady}
      initialRedeemCode={urlRedeemCode}
      previewLoading={previewLoading}
      redeemInputResetKey={redeemInputResetKey}
    />
  )

  return (
    <div className="mx-auto w-full bg-white px-4 pb-10 pt-[max(10rem,calc(8.5rem+env(safe-area-inset-top,0px)))] sm:px-6 sm:pb-12 sm:pt-28 md:pt-32 lg:px-8 lg:pb-16 lg:pt-36">
      <GiftCardPageHeader className="mb-6 sm:mb-8 lg:mb-10" />
      <div className="mx-auto w-full max-w-7xl">
        {/* Tablet & mobile: purchase first, then tabbed lists */}
        <div className="flex flex-col gap-6 lg:hidden">
          {alerts}
          {purchasePanel}
          <GiftCardListTabs
            activeTab={listTab}
            onTabChange={setListTab}
            created={created}
            redeemed={redeemed}
            listLoading={listLoading}
            onCreatedThumbClick={openCreatedModal}
          />
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden items-start gap-4 lg:flex">
          <div className="w-[30%] shrink-0">
            {alerts}
            {purchasePanel}
          </div>
          <GiftCardDesktopLists
            created={created}
            redeemed={redeemed}
            listLoading={listLoading}
            onCreatedThumbClick={openCreatedModal}
          />
        </div>

        <GiftCardPurchasedModal
          open={Boolean(purchasedModal)}
          onClose={closePurchasedModal}
          code={purchasedModal?.code}
          giftValue={purchasedModal?.giftValue}
          paidAmount={purchasedModal?.paidAmount}
          shareUrl={purchasedModal?.shareUrl}
          onSelfRedeem={handleSelfRedeemFromModal}
          selfRedeeming={selfRedeeming}
        />

        <GiftCardCreatedShareModal
          open={Boolean(createdModalCard)}
          onClose={closeCreatedModal}
          card={createdModalCard}
          bannerImage={bannerImage}
          shareUrl={createdModalShareUrl}
          onRedeem={handleCreatedModalRedeem}
          redeeming={createdModalRedeeming}
        />

        <GiftCardWalletSuccessModal
          open={walletSuccessAmount != null}
          onClose={closeWalletSuccessModal}
          amount={walletSuccessAmount ?? 0}
        />

        <GiftCardAlreadyRedeemedModal
          open={alreadyRedeemedOpen}
          onClose={closeAlreadyRedeemedModal}
          message={alreadyRedeemedMessage}
        />
      </div>
    </div>
  )
}

export default GiftCardPage
