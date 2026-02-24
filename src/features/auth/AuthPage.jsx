import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { ROUTES } from '../../utils/constants'

const DEFAULT_COUNTRY_CODE = '+91'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ROUTES.HOME
  const { login, register, verifyOtp, resendOtp, isAuthenticated } = useAuth()

  const [step, setStep] = useState('choose')
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [userId, setUserId] = useState(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    navigate(redirectTo, { replace: true })
    return null
  }

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
        setOtp('')
      } else {
        setError('Could not send OTP. Please try again.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!userId || otp.length < 4) {
      setError('Please enter the OTP you received')
      return
    }
    setError('')
    setLoading(true)
    try {
      await verifyOtp({ userId, otp: otp.trim() })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      await resendOtp({ userId })
      setError('')
      setOtp('')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">
          {step === 'otp' ? 'Verify OTP' : step === 'form' ? (mode === 'register' ? 'Sign up' : 'Login') : 'Login / Sign up'}
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'choose' && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setStep('form'); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setStep('form'); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'register' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                  required
                  minLength={2}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+91"
                  className="w-20 rounded-lg border border-gray-300 px-2 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20"
                />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Sending…' : mode === 'register' ? 'Sign up' : 'Get OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 text-center text-lg tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
              />
            </div>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-black disabled:opacity-50"
            >
              Resend OTP
            </button>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setStep('form'); setOtp(''); setUserId(null); setError(''); }}
                className="py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="flex-1 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
