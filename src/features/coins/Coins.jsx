import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { walletService } from '../../services/wallet.service.js'

function CoinsBadgeIcon() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black text-white text-xs">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M10 3c-3.31 0-6 1.12-6 2.5S6.69 8 10 8s6-1.12 6-2.5S13.31 3 10 3Z" />
        <path d="M4 8.75v2.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-2.5c-1.18 1.04-3.38 1.75-6 1.75s-4.82-.71-6-1.75Z" />
        <path d="M4 13.25v1.25C4 15.88 6.69 17 10 17s6-1.12 6-2.5v-1.25C14.82 14.29 12.62 15 10 15s-4.82-.71-6-1.75Z" />
      </svg>
    </span>
  )
}

function HistoryCoinIcon() {
  return (
    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#f4f4f4]">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current text-black" aria-hidden="true">
        <path d="M10 3c-3.31 0-6 1.12-6 2.5S6.69 8 10 8s6-1.12 6-2.5S13.31 3 10 3Z" />
        <path d="M4 8.75v2.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-2.5c-1.18 1.04-3.38 1.75-6 1.75s-4.82-.71-6-1.75Z" />
        <path d="M4 13.25v1.25C4 15.88 6.69 17 10 17s6-1.12 6-2.5v-1.25C14.82 14.29 12.62 15 10 15s-4.82-.71-6-1.75Z" />
      </svg>
    </span>
  )
}

function SuccessTickIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-black" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" />
      <path d="M23 32l7 7 12-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20l2 2M48 16l2 2M14 30l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRewardTxTitle(type) {
  const map = {
    EARN: 'Reward Earned',
    REDEEM: 'Coins Redeemed',
    EXPIRE: 'Points Expired',
    BONUS: 'Bonus Coins',
  }
  return map[type] || 'Reward Transaction'
}

const Coins = () => {
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [showConvertedModal, setShowConvertedModal] = useState(false)
  const [coins, setCoins] = useState(0)
  const [coinsWorth, setCoinsWorth] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemResult, setRedeemResult] = useState(null)

  const fetchRewardsData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [coinsRes, historyRes] = await Promise.all([
        walletService.getRewardCoins(),
        walletService.getRewardTransactions({ page: 1, limit: 10 }),
      ])
      const coinData = coinsRes?.data?.data ?? {}
      const txData = historyRes?.data?.data ?? {}
      const availableCoins = Number(
        coinData?.coins ??
          coinData?.pointsBalance ??
          coinData?.rewardWallet?.pointsBalance ??
          0,
      )
      const worthFromApi = coinData?.worth ??
        coinData?.cashValue ??
        coinData?.rupeeValue ??
        coinData?.coinsWorth ??
        null

      setCoins(availableCoins)
      setCoinsWorth(
        worthFromApi != null && !Number.isNaN(Number(worthFromApi))
          ? Number(worthFromApi)
          : availableCoins,
      )
      setHistoryItems(Array.isArray(txData?.transactions) ? txData.transactions : [])
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load reward data')
      setHistoryItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const coinsWorthPreview = useMemo(() => {
    if (coinsWorth != null && !Number.isNaN(Number(coinsWorth))) {
      return Number(coinsWorth)
    }
    return Number(coins || 0)
  }, [coins, coinsWorth])

  const formatRupee = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`

  useEffect(() => {
    fetchRewardsData()
  }, [fetchRewardsData])

  const proceedConvert = async () => {
    if (!Number.isInteger(coins) || coins <= 0) {
      setRedeemError('No reward coins available for redeem')
      return
    }
    setRedeeming(true)
    setRedeemError('')
    try {
      const res = await walletService.redeemPoints({ points: coins })
      const data = res?.data?.data ?? {}
      setRedeemResult({
        redeemedPoints: Number(data?.redeemedPoints ?? coins ?? 0),
        cashCredited: Number(data?.cashCredited ?? 0),
        pointsBalance: Number(
          data?.rewardWallet?.pointsBalance ??
            data?.pointsBalance ??
            0,
        ),
        cashWalletBalance: Number(data?.cashWallet?.balance ?? 0),
      })
      setShowRedeemModal(false)
      setShowConvertedModal(true)
      await fetchRewardsData()
    } catch (err) {
      setRedeemError(err?.response?.data?.message ?? err?.message ?? 'Unable to redeem coins')
    } finally {
      setRedeeming(false)
    }
  }

  const closeCoinModals = () => {
    setShowRedeemModal(false)
    setShowConvertedModal(false)
    setRedeemError('')
    setRedeemResult(null)
  }

  const openRedeemModal = () => {
    setRedeemError('')
    setRedeemResult(null)
    setShowRedeemModal(true)
  }

  const renderedHistory = useMemo(() => historyItems.slice(0, 6), [historyItems])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 mt-20">
      <h1 className="font-inter text-3xl uppercase font-normal text-black">Redeem Coins</h1>

      <section className="relative mt-4 overflow-hidden rounded-lg border border-[#d6d6d6] bg-white p-5">
        <div className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-black/5" />
        <div className="absolute -bottom-8 right-10 h-24 w-24 rounded-full bg-black/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-[#e7e7e7] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CoinsBadgeIcon />
              <p className="font-inter text-3xl font-normal text-black">AVAILABLE COINS</p>
            </div>
            <p className="mt-1 pl-8 font-['Rubik'] text-4xl text-[#5c5c5c]">{Number(coins || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ul className="font-inter space-y-1 text-lg text-[#111111]">
            <li>&middot; Convert your coins into wallet balance anytime</li>
            <li>&middot; Use converted balance to pay across all services</li>
          </ul>
          <button
            type="button"
            onClick={openRedeemModal}
            className="font-inter h-14 w-full bg-black px-8 text-base font-medium uppercase tracking-wide text-white transition-colors hover:bg-[#1d1d1d] md:w-[210px]"
          >
            Redeem Coins
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-inter text-4xl font-semibold text-black">Coins History</h2>
        {error && <p className="mt-3 font-inter text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-3 font-inter text-sm text-gray-500">Loading coin history...</p>}
        {!loading && renderedHistory.length === 0 && (
          <p className="mt-3 font-inter text-sm text-gray-500">No coin transactions found.</p>
        )}
        <div className="mt-4 space-y-4">
          {renderedHistory.map((item) => (
            <article
              key={item?._id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[#e8e8e8] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <HistoryCoinIcon />
                <div className="min-w-0">
                  <p className="font-inter truncate text-lg font-bold uppercase text-black">{getRewardTxTitle(item?.type)}</p>
                  <p className="font-['Poppins'] text-lg text-[#5d5d5d]">{(item?.type || 'TRANSACTION').toUpperCase()}</p>
                  <p className="font-['Poppins'] text-sm text-[#101010]">{formatDateTime(item?.createdAt)}</p>
                </div>
              </div>
              <p className={`font-['Rubik'] text-4xl font-medium ${item?.type === 'REDEEM' ? 'text-black' : 'text-[#2d2d2d]'}`}>
                {item?.type === 'REDEEM' ? '-' : '+'}
                {Number(item?.points || 0).toLocaleString('en-IN')} coins
              </p>
            </article>
          ))}
        </div>
      </section>

      {showRedeemModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 px-4" onClick={closeCoinModals}>
          <div
            className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Redeem reward coins"
          >
            <h3 className="font-inter text-[33px] font-medium uppercase tracking-[0.18em] text-black">Redeem Reward Coins</h3>
            <p className="font-inter mt-3 text-sm uppercase tracking-[0.14em] text-[#4d4d4d]">
              Convert coins into wallet cash instantly
            </p>
            <div className="mt-3 border-b border-[#ececec]" />

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-md bg-[#f3f3f3] px-5 py-3.5">
                <span className="font-inter text-[18px] uppercase text-black">Total Rewards Points</span>
                <span className="font-['Rubik'] text-[36px] text-black">{Number(coins || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[#f3f3f3] px-5 py-3.5">
                <span className="font-inter text-[18px] uppercase text-black">Coins Worth</span>
                <span className="font-['Rubik'] text-[36px] text-black">
                  {formatRupee(coinsWorthPreview)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={proceedConvert}
              disabled={redeeming}
              className="font-inter mt-6 h-12 w-full rounded-md bg-black text-[15px] font-medium uppercase tracking-[0.06em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {redeeming ? 'Converting...' : 'Proceed to Convert'}
            </button>
            {redeemError && <p className="mt-3 font-inter text-sm text-red-600">{redeemError}</p>}
          </div>
        </div>
      )}

      {showConvertedModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 px-4" onClick={closeCoinModals}>
          <div
            className="relative w-full max-w-[420px] bg-white px-8 pt-7 pb-8 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Coins converted successfully"
          >
            <button
              type="button"
              onClick={closeCoinModals}
              className="absolute right-4 top-3 text-3xl leading-none text-[#454545]"
              aria-label="Close"
            >
              ×
            </button>
            <div className="mx-auto mt-1 flex w-fit items-center justify-center">
              <SuccessTickIcon />
            </div>
            <h3 className="font-inter mt-5 text-[14px] font-medium uppercase leading-[1.28] tracking-[0.34em] text-black">
              Coins Converted Successfully
            </h3>
            {redeemResult ? (
              <div className="font-['Poppins'] mx-auto mt-5 max-w-[320px] space-y-2 text-[16px] leading-tight text-[#3c3c3c]">
                <p>
                  <span className="font-semibold text-black">
                    {formatRupee(redeemResult.cashCredited)}
                  </span>{' '}
                  added to your wallet balance.
                </p>
                <p>
                  Coins redeemed:{' '}
                  <span className="font-semibold text-black">
                    {Number(redeemResult.redeemedPoints || 0).toLocaleString('en-IN')}
                  </span>
                </p>
                <p>
                  Remaining coins:{' '}
                  <span className="font-semibold text-black">
                    {Number(redeemResult.pointsBalance || 0).toLocaleString('en-IN')}
                  </span>
                </p>
                <p>
                  Wallet balance:{' '}
                  <span className="font-semibold text-black">
                    {formatRupee(redeemResult.cashWalletBalance)}
                  </span>
                </p>
              </div>
            ) : (
              <p className="font-['Poppins'] mx-auto mt-5 max-w-[320px] text-[16px] leading-tight text-[#3c3c3c]">
                Your coins have been added to your wallet balance. You can now use it for payments across all services.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Coins
