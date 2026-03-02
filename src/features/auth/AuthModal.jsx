import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../app/context/AuthContext'

const DEFAULT_COUNTRY_CODE = '+91'
const OTP_LENGTH = 6
const RESEND_COOLDOWN_SEC = 45

// Subtle geometric pattern for modal header (interlocking diamonds/squares)
function PatternHeader({ children, className = '' }) {
  const pattern = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 0L14 6L12 12L10 6L12 0zM0 12L6 14L12 12L6 10L0 12zM12 24L10 18L12 12L14 18L12 24zM24 12L18 10L12 12L18 14L24 12z' fill='%23e5e7eb' fill-opacity='0.5'/%3E%3C/svg%3E"
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `url("${pattern}")` }}
    >
      {children}
    </div>
  )
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function AuthModal() {
  const {
    login,
    register,
    verifyOtp,
    resendOtp,
    isAuthenticated,
    authModalOpen,
    closeAuthModal,
  } = useAuth()

  const [step, setStep] = useState('form')
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [userId, setUserId] = useState(null)
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpInputRefs = useRef([])
  const resendTimerRef = useRef(null)

  const maskedPhone = phoneNumber.length >= 3
    ? `${countryCode} ******${phoneNumber.slice(-3)}`
    : `${countryCode} ******`

  // When user becomes authenticated, close modal and keep user on same page (no redirect)
  useEffect(() => {
    if (authModalOpen && isAuthenticated) {
      closeAuthModal()
    }
  }, [authModalOpen, isAuthenticated, closeAuthModal])

  // Reset form when modal opens
  useEffect(() => {
    if (authModalOpen) {
      setStep('form')
      setMode('login')
      setError('')
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setUserId(null)
      setResendCooldown(0)
      if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    }
  }, [authModalOpen])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    resendTimerRef.current = id
    return () => clearInterval(id)
  }, [resendCooldown])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { countryCode: countryCode || undefined, phoneNumber: phoneNumber.trim() }
      const data = mode === 'register'
        ? await register({ ...payload, name: name.trim(), role: 'user' })
        : await login(payload)
      const id = data?.userId ?? data?.userId
      if (id) {
        setUserId(id)
        setStep('otp')
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        setResendCooldown(RESEND_COOLDOWN_SEC)
        otpInputRefs.current[0]?.focus()
      } else {
        setError('Could not send OTP. Please try again.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const otpValue = otpDigits.join('')
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!userId || otpValue.length < 4) {
      setError('Please enter the OTP you received')
      return
    }
    setError('')
    setLoading(true)
    try {
      await verifyOtp({ userId, otp: otpValue.trim() })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await resendOtp({ userId })
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setResendCooldown(RESEND_COOLDOWN_SEC)
      otpInputRefs.current[0]?.focus()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not resend OTP')
    } finally {
      setLoading(false)
    }
  }, [userId, resendOtp, resendCooldown])

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)
    if (digit && index < OTP_LENGTH - 1) otpInputRefs.current[index + 1]?.focus()
  }
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeAuthModal()
  }

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`
  }

  if (!authModalOpen) return null

  const inputBaseClass =
    'w-full border border-black bg-white px-3 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black font-inter text-sm uppercase'
  const btnOutlineClass =
    'w-full border border-black bg-white py-3 text-black font-semibold uppercase text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 font-inter'
  const btnPrimaryClass =
    'w-full bg-black py-3 text-white font-semibold uppercase text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-inter'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 font-inter"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - top right */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-10 p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ——— LOG IN ——— */}
        {step === 'form' && mode === 'login' && (
          <>
            <PatternHeader className="pt-8 pb-6 px-6 text-center">
              <h1 id="auth-modal-title" className="text-2xl font-bold text-black uppercase tracking-wide">
                LOG IN
              </h1>
            </PatternHeader>
            <form onSubmit={handleSendOtp} className="px-6 pb-8 space-y-4">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="ENTER MOBILE NUMBER"
                className={inputBaseClass}
                required
              />
              <p className="text-gray-500 text-xs">
                We will be sending OTP will be shared on your registered mobile number.
              </p>
              <button type="submit" disabled={loading} className={btnOutlineClass}>
                {loading ? 'Sending…' : 'LOG IN'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={btnPrimaryClass}
              >
                CREATE ACCOUNT
              </button>
            </form>
          </>
        )}

        {/* ——— SIGN UP ——— */}
        {step === 'form' && mode === 'register' && (
          <>
            <PatternHeader className="pt-8 pb-6 px-6 text-center">
              <h1 id="auth-modal-title" className="text-2xl font-bold text-black uppercase tracking-wide">
                SIGN UP
              </h1>
            </PatternHeader>
            <form onSubmit={handleSendOtp} className="px-6 pb-8 space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="FULL NAME"
                className={inputBaseClass}
                required
                minLength={2}
              />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="MOBILE NO."
                className={inputBaseClass}
                required
              />
              <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-black font-semibold underline hover:no-underline"
                >
                  LOGIN
                </button>
              </p>
              <button type="submit" disabled={loading} className={btnPrimaryClass}>
                {loading ? 'Sending…' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </>
        )}

        {/* ——— VERIFY OTP ——— */}
        {step === 'otp' && (
          <>
            <PatternHeader className="pt-8 pb-4 px-6 text-center">
              <h1 id="auth-modal-title" className="text-2xl font-bold text-black uppercase tracking-wide">
                VERIFY OTP
              </h1>
            </PatternHeader>
            <form onSubmit={handleVerifyOtp} className="px-6 pb-8">
              <p className="text-center text-gray-700 text-sm mb-6">
                Enter the OTP sent to {maskedPhone}
              </p>
              <div className="flex justify-center gap-2 mb-4">
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[i]}
                    onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-11 text-center text-lg font-medium border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mb-1">
                Didn&apos;t you receive the OTP?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="text-black font-semibold underline hover:no-underline disabled:opacity-50 disabled:no-underline"
                >
                  Resend OTP
                </button>
              </p>
              <p className="text-center text-sm text-gray-700 flex items-center justify-center gap-1.5 mb-6">
                <ClockIcon className="w-4 h-4" />
                {formatTimer(resendCooldown)}
              </p>
              <button
                type="submit"
                disabled={loading || otpValue.length < 4}
                className={btnPrimaryClass}
              >
                {loading ? 'Verifying…' : 'VERIFY OTP'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
