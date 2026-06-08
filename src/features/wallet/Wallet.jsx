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
    <svg xmlns="http://www.w3.org/2000/svg" width="139" height="119" viewBox="0 0 139 119" fill="none">
  <rect width="138.174" height="118.592" fill="white"/>
  <path d="M70.0509 30.5952C45.7985 30.5952 26.0703 50.3233 26.0703 74.5757C26.0703 98.8281 45.7985 118.556 70.0509 118.556C94.3033 118.556 114.031 98.8281 114.031 74.5757C114.031 65.8561 111.47 57.728 107.077 50.8861L104.459 53.9785C108.083 60.0096 110.207 67.0417 110.207 74.5757C110.207 96.7171 92.1922 114.732 70.0509 114.732C47.9095 114.732 29.8947 96.7171 29.8947 74.5757C29.8947 52.4344 47.9095 34.4196 70.0509 34.4196C80.459 34.4196 89.9261 38.4347 97.0681 44.9553L99.5704 42.0011C91.7591 34.9164 81.3998 30.5952 70.0509 30.5952ZM104.922 41.5978L67.9743 85.1974L52.4228 70.6916L49.8159 73.4889L68.2993 90.7286L107.843 44.0702L104.922 41.5978Z" fill="black"/>
  <path d="M113.072 15.9112C111.068 16.9648 106.117 17.4331 106.117 17.4331V19.3061C106.117 19.3061 111.068 19.7744 113.072 20.828C114.958 21.8816 116.609 23.2864 117.787 25.1595C119.084 27.0326 119.909 29.1398 120.499 31.5982C121.088 34.0566 121.324 36.1755 121.324 36.1755H122.974C122.974 36.1755 123.556 32.8148 123.799 31.5982C124.389 29.1398 125.332 27.0326 126.511 25.1595C127.689 23.2864 129.222 21.8816 131.226 20.828C133.23 19.7744 138.181 19.3061 138.181 19.3061V17.4331C138.181 17.4331 133.23 16.9648 131.226 15.9112C129.34 14.8576 127.689 13.4528 126.511 11.5797C125.214 9.70663 124.389 7.59943 123.799 5.14102C123.529 3.69193 122.974 0 122.974 0H121.324C121.324 0 120.776 4.20475 120.499 5.14102C119.909 7.59943 118.966 9.70663 117.787 11.5797C116.609 13.4528 115.076 14.8576 113.072 15.9112Z" fill="#555555"/>
  <path d="M4.12626 42.6268C2.93734 43.2519 0 43.5297 0 43.5297V44.641C0 44.641 2.93734 44.9188 4.12626 45.5439C5.24524 46.169 6.22435 47.0024 6.92371 48.1137C7.69302 49.2249 8.18258 50.4751 8.53226 51.9336C8.88194 53.3921 9.02181 54.6493 9.02181 54.6493H10.0009C10.0009 54.6493 10.3461 52.6554 10.4905 51.9336C10.8402 50.4751 11.3996 49.2249 12.099 48.1137C12.7984 47.0024 13.7076 46.169 14.8965 45.5439C16.0854 44.9188 19.0227 44.641 19.0227 44.641V43.5297C19.0227 43.5297 16.0854 43.2519 14.8965 42.6268C13.7775 42.0018 12.7984 41.1683 12.099 40.0571C11.3297 38.9458 10.8402 37.6957 10.4905 36.2371C10.33 35.3774 10.0009 33.1871 10.0009 33.1871H9.02181C9.02181 33.1871 8.69673 35.6817 8.53226 36.2371C8.18258 37.6957 7.62308 38.9458 6.92371 40.0571C6.22435 41.1683 5.31518 42.0018 4.12626 42.6268Z" fill="#555555"/>
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
    <div className="mx-auto mt-16 w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:mt-20 md:px-6">
      <h1 className="font-inter text-2xl font-semibold text-black sm:text-3xl">
        Wallet
      </h1>
      <section className="relative mt-4 overflow-hidden rounded-lg border border-[#d6d6d6] bg-white p-5">
        <div className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-black/5" />
        <div className="absolute -bottom-8 right-10 h-24 w-24 rounded-full bg-black/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-[#e7e7e7] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <WalletBadgeIcon />
              <p className="font-inter text-lg font-semibold text-black sm:text-2xl md:text-3xl">
                AVAILABLE BALANCE
              </p>
            </div>
            <p className="mt-1 pl-8 font-['Rubik'] text-2xl text-[#5c5c5c] sm:text-3xl md:text-4xl">
              {formatMoney(walletBalance).toUpperCase()}
            </p>
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
        <h2 className="font-inter text-2xl font-semibold text-black sm:text-3xl md:text-4xl">
          Last Transaction
        </h2>
        {error && <p className="mt-3 font-inter text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-3 font-inter text-sm text-gray-500">Loading transactions...</p>}
        {!loading && renderedTransactions.length === 0 && (
          <p className="mt-3 font-inter text-sm text-gray-500">No wallet transactions found.</p>
        )}
        <div className="mt-4 space-y-4">
          {renderedTransactions.map((transaction) => (
            <article
              key={transaction?._id}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-[#e8e8e8] bg-white px-3 py-4 shadow-[0_1px_6px_rgba(0,0,0,0.06)] sm:items-center sm:gap-4 sm:px-5 md:px-6"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#f4f4f4]">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current text-black" aria-hidden="true">
                    <path d="M3.5 5.25A2.25 2.25 0 0 1 5.75 3h8.5a2.25 2.25 0 0 1 2.25 2.25V6h-2.75A2.75 2.75 0 0 0 11 8.75v2.5A2.75 2.75 0 0 0 13.75 14h2.75v.75A2.25 2.25 0 0 1 14.25 17h-8.5A2.25 2.25 0 0 1 3.5 14.75v-9.5Z" />
                    <path d="M13.75 7.5a1.25 1.25 0 0 0-1.25 1.25v2.5c0 .69.56 1.25 1.25 1.25H17V7.5h-3.25Zm1.75 2.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-inter max-w-[150px] truncate text-base font-bold uppercase text-black sm:max-w-none sm:text-lg md:text-xl">
                    {getWalletTransactionTitle(transaction?.transaction_source)}
                  </p>
                  <p className="font-['Poppins'] text-base text-[#5d5d5d] sm:text-lg md:text-xl">
                    {(transaction?.transaction_source || 'TRANSACTION').replaceAll('_', ' ')}
                  </p>
                  <p className="font-['Poppins'] text-xs text-[#101010] sm:text-sm md:text-base">
                    {formatDateTime(transaction?.createdAt)}
                  </p>

                </div>
              </div>
              <p
                className={`shrink-0 whitespace-nowrap text-right font-['Rubik'] text-2xl font-medium sm:text-3xl md:text-4xl ${transaction?.type === 'CREDIT' ? 'text-[#4f9428]' : 'text-black'
                  }`}
              >
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
                  className={`font-['Rubik'] h-10 rounded-full px-5 text-[26px] ${selectedAmount === amount ? 'bg-black text-white' : 'bg-[#efefef] text-[#666666]'
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
            <h3 className="font-inter mt-6 text-[36px] font-medium uppercase leading-[1.1] tracking-[0.2em] text-black">
              Success
            </h3>
            <p className="font-['Poppins'] mt-6 text-[28px] leading-tight text-[#3c3c3c]">
              {/* ₹{Number(lastAddedAmount || 0).toLocaleString('en-IN')}  */}
              Wallet Balance added successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet