import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import PageTitle from '../../shared/ui/PageTitle'

export default function PolicyPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 xl:max-w-6xl 2xl:max-w-7xl xl:px-10">
        <Link to={ROUTES.HOME} className="mb-6 inline-block text-sm uppercase tracking-wider text-gray-500 hover:text-black">
          ← Back to home
        </Link>
        <PageTitle className="mb-8">{title}</PageTitle>
        <div className="max-w-none text-gray-700">
          {children}
        </div>
      </div>
    </div>
  )
}
