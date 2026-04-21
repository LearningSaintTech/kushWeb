import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { walletService } from '../../services/wallet.service.js'

function WalletBadgeIcon() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black text-white text-xs">
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M3.5 5.25A2.25 2.25 0 0 1 5.75 3h8.5a2.25 2.25 0 0 1 2.25 2.25V6h-2.75A2.75 2.75 0 0 0 11 8.75v2.5A2.75 2.75 0 0 0 13.75 14h2.75v.75A2.25 2.25 0 0 1 14.25 17h-8.5A2.25 2.25 0 0 1 3.5 14.75v-9.5Z" />
        <path d="M13.75 7.5a1.25 1.25 0 0 0-1.25 1.25v2.5c0 .69.56 1.25 1.25 1.25H17V7.5h-3.25Zm1.75 2.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
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

function formatMoney(value) {
  const amount = Number(value || 0)
  return `Rs ${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`
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

function getWalletTransactionTitle(source) {
  const map = {
    RECHARGE: 'Wallet Recharge',
    ORDER_PAYMENT: 'Order Payment',
    REFUND: 'Order Refund',
    ADMIN_ADJUSTMENT: 'Admin Adjustment',
    REWARD_REDEEM: 'Reward Redeem',
  }
  return map[source] || 'Wallet Transaction'
}

const Wallet = () => {
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState('3500')
  const [inputAmount, setInputAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [lastAddedAmount, setLastAddedAmount] = useState(0)
  const quickAmounts = ['3500', '4750', '5200', '6200']

  const fetchWalletData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [balanceRes, txRes] = await Promise.all([
        walletService.getCashBalance(),
        walletService.getCashTransactions({ page: 1, limit: 10 }),
      ])
      const balanceData = balanceRes?.data?.data ?? {}
      const txData = txRes?.data?.data ?? {}
      const txList = Array.isArray(txData?.transactions) ? txData.transactions : []
      setWalletBalance(Number(balanceData?.balance || 0))
      setTransactions(txList)
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load wallet data')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWalletData()
  }, [fetchWalletData])

  const handleAddBalance = async () => {
    const manualAmount = String(inputAmount || '').trim()
    const amount = Number(manualAmount || selectedAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a valid recharge amount')
      return
    }
    setProcessingPayment(true)
    setPaymentError('')
    try {
      const createRes = await walletService.createRechargeOrder({ rechargeAmount: amount })
      const createData = createRes?.data?.data ?? {}
      const razorpayData = createData?.razorpay
      if (!razorpayData?.orderId || !razorpayData?.keyId) {
        throw new Error('Recharge order payload is invalid')
      }

      await loadRazorpayScript()
      const response = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: razorpayData.keyId,
          amount: Math.round(Number(razorpayData.amount || amount) * 100),
          currency: razorpayData.currency || 'INR',
          order_id: razorpayData.orderId,
          name: 'Khush',
          description: 'Wallet Recharge',
          handler: (paymentResp) => resolve(paymentResp),
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
          theme: { color: '#000000' },
        })
        rzp.on('payment.failed', () => reject(new Error('Payment failed')))
        rzp.open()
      })

      await walletService.verifyRechargePayment({
        razorpay_order_id: response?.razorpay_order_id,
        razorpay_payment_id: response?.razorpay_payment_id,
        razorpay_signature: response?.razorpay_signature,
      })

      setLastAddedAmount(amount)
      setShowAddBalanceModal(false)
      setShowSuccessModal(true)
      await fetchWalletData()
    } catch (err) {
      setPaymentError(err?.response?.data?.message ?? err?.message ?? 'Unable to add balance')
    } finally {
      setProcessingPayment(false)
    }
  }

  const continueAddBalance = () => {
    setShowAddBalanceModal(false)
    setShowSuccessModal(true)
  }

  const closeWalletModals = () => {
    setShowAddBalanceModal(false)
    setShowSuccessModal(false)
  }

  const renderedTransactions = useMemo(() => transactions.slice(0, 6), [transactions])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 mt-20">
      <h1 className="font-inter text-3xl font-semibold text-black">Wallet</h1>

      <section className="relative mt-4 overflow-hidden rounded-lg border border-[#d6d6d6] bg-white p-5">
        <div className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-black/5" />
        <div className="absolute -bottom-8 right-10 h-24 w-24 rounded-full bg-black/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-[#e7e7e7] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <WalletBadgeIcon />
              <p className="font-inter text-3xl font-semibold text-black">AVAILABLE BALANCE</p>
            </div>
            <p className="mt-1 pl-8 font-['Rubik'] text-4xl text-[#5c5c5c]">{formatMoney(walletBalance).toUpperCase()}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ul className="font-inter space-y-1 text-lg text-[#111111]">
            <li>&middot; Pay faster using your wallet balance across all services</li>
            <li>&middot; Use this balance anytime while placing an order</li>
          </ul>
          <button
            type="button"
            onClick={() => setShowAddBalanceModal(true)}
            className="font-inter h-14 w-full bg-black px-8 text-base font-medium uppercase tracking-wide text-white transition-colors hover:bg-[#1d1d1d] md:w-[210px]"
          >
            Add Balance
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-inter text-4xl font-semibold text-black">Last Transaction</h2>
        {error && <p className="mt-3 font-inter text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-3 font-inter text-sm text-gray-500">Loading transactions...</p>}
        {!loading && renderedTransactions.length === 0 && (
          <p className="mt-3 font-inter text-sm text-gray-500">No wallet transactions found.</p>
        )}
        <div className="mt-4 space-y-4">
          {renderedTransactions.map((transaction) => (
            <article
              key={transaction?._id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[#e8e8e8] bg-white px-6 py-5 shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#f4f4f4]">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current text-black" aria-hidden="true">
                    <path d="M3.5 5.25A2.25 2.25 0 0 1 5.75 3h8.5a2.25 2.25 0 0 1 2.25 2.25V6h-2.75A2.75 2.75 0 0 0 11 8.75v2.5A2.75 2.75 0 0 0 13.75 14h2.75v.75A2.25 2.25 0 0 1 14.25 17h-8.5A2.25 2.25 0 0 1 3.5 14.75v-9.5Z" />
                    <path d="M13.75 7.5a1.25 1.25 0 0 0-1.25 1.25v2.5c0 .69.56 1.25 1.25 1.25H17V7.5h-3.25Zm1.75 2.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-inter truncate text-lg font-bold uppercase text-black">
                    {getWalletTransactionTitle(transaction?.transaction_source)}
                  </p>
                  <p className="font-['Poppins'] text-lg text-[#5d5d5d]">
                    {(transaction?.transaction_source || 'TRANSACTION').replaceAll('_', ' ')}
                  </p>
                  <p className="font-['Poppins'] text-sm text-[#101010]">{formatDateTime(transaction?.createdAt)}</p>
                </div>
              </div>
              <p className={`font-['Rubik'] text-4xl font-medium ${transaction?.type === 'CREDIT' ? 'text-[#4f9428]' : 'text-black'}`}>
                {transaction?.type === 'CREDIT' ? '+ ' : '- '}
                {formatMoney(transaction?.amount)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {showAddBalanceModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 px-4" onClick={closeWalletModals}>
          <div
            className="w-full max-w-[560px] rounded-[18px] bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add balance"
          >
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="Enter Amount"
              value={inputAmount}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/[^\d]/g, '')
                setInputAmount(digitsOnly)
                setSelectedAmount('')
                setPaymentError('')
              }}
              className="font-inter h-14 w-full border border-[#8f8f8f] px-4 text-lg outline-none placeholder:text-[#bbbbbb]"
            />
            <p className="mt-2 font-inter text-sm text-[#5f5f5f]">Enter amount manually or choose a quick amount below.</p>
            <div className="mt-4 flex flex-wrap gap-2 border-b border-[#e9e9e9] pb-4">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amount)
                    setInputAmount(amount)
                    setPaymentError('')
                  }}
                  className={`font-['Rubik'] h-10 rounded-full px-5 text-[26px] ${
                    selectedAmount === amount ? 'bg-black text-white' : 'bg-[#efefef] text-[#666666]'
                  }`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddBalance}
              disabled={processingPayment}
              className="font-inter mt-6 h-14 w-full bg-black text-2xl font-medium uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processingPayment ? 'Processing...' : 'Continue'}
            </button>
            {paymentError && <p className="mt-3 font-inter text-sm text-red-600">{paymentError}</p>}
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 px-4" onClick={closeWalletModals}>
          <div
            className="w-full max-w-[560px] bg-white px-8 py-10 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Money added successfully"
          >
            <div className="mx-auto flex w-fit items-center justify-center">
              <SuccessTickIcon />
            </div>
            <h3 className="font-inter mt-6 text-[46px] font-medium uppercase leading-[1.1] tracking-[0.2em] text-black">
              Money Added Successfully
            </h3>
            <p className="font-['Poppins'] mt-6 text-[38px] leading-tight text-[#3c3c3c]">
              ₹{Number(lastAddedAmount || 0).toLocaleString('en-IN')} has been added to your wallet. You can now use it for payments.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet