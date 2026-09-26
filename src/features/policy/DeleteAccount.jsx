import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PolicyPageLayout from './PolicyPageLayout'
import { useAuth } from '../../app/context/AuthContext'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../utils/constants'
import { getFriendlyAuthErrorMessage } from '../../services/axiosClient.js'

export default function DeleteAccountPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    setError('')
    if (!isAuthenticated) {
      openAuthModal(ROUTES.DELETE_ACCOUNT)
      return
    }
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.')
      return
    }
    const ok = window.confirm(
      'This permanently deletes your Khush account, orders history access, addresses, and community profile. Continue?',
    )
    if (!ok) return

    setBusy(true)
    try {
      await authService.deleteAccount()
      setDone(true)
      await logout()
      window.setTimeout(() => navigate(ROUTES.HOME, { replace: true }), 1200)
    } catch (err) {
      setError(
        getFriendlyAuthErrorMessage(
          err,
          err?.response?.data?.message || 'Could not delete account. Please try again.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <PolicyPageLayout title="Delete Your Account">
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          We’re sorry to see you go! At <span className="font-semibold text-black">KHUSH</span>, your privacy and
          personal data are important to us.
        </p>

        <p>
          Deleting your account permanently removes your profile, saved addresses, and personal preferences.
          This cannot be undone.
        </p>

        {done ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Account deleted successfully. Redirecting you home…
          </p>
        ) : (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
            {!authChecked ? (
              <p className="text-sm text-gray-500">Checking session…</p>
            ) : !isAuthenticated ? (
              <>
                <p className="text-sm text-gray-600">Sign in to delete your account.</p>
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.DELETE_ACCOUNT)}
                  className="inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-gray-800"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-800">
                  Type DELETE to confirm
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-black focus:border-black focus:outline-none"
                    placeholder="DELETE"
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="inline-flex rounded-full bg-red-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Deleting…' : 'Delete my account'}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Prefer help from our team? Email{' '}
          <a href="mailto:support@khushpehno.com" className="font-medium text-blue-600 hover:underline">
            support@khushpehno.com
          </a>
          .
        </p>
      </div>
    </PolicyPageLayout>
  )
}
