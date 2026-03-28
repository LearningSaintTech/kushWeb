import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'

export default function PolicyPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 max-sm:pt-6">
        <Link to={ROUTES.HOME} className="text-sm text-gray-500 hover:text-black uppercase tracking-wider mb-6 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-black mb-8">
          {title}
        </h1>
        <div className="prose prose-gray max-w-none text-gray-700 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
