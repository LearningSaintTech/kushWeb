/**
 * Full-page support help center (replaces legacy AI shopping assistant page).
 * Legacy AI implementation: see ./legacy/ChatbotPage.ai.jsx
 */
import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import SupportChat from './SupportChat'

export default function ChatbotPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-white pb-8 pt-26 sm:pt-30">
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 sm:text-2xl">Help &amp; Support</h1>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Raise a ticket, chat with our team, and track your requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={ROUTES.ORDERS}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700"
            >
              My orders
            </Link>
            <Link to={ROUTES.HOME} className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white">
              Continue shopping
            </Link>
          </div>
        </div>
        <SupportChat variant="page" />
      </div>
    </div>
  )
}
