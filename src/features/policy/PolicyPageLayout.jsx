import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'

export default function PolicyPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 xl:max-w-6xl 2xl:max-w-7xl xl:px-10">
        <Link to={ROUTES.HOME} className="mb-6 inline-block text-sm uppercase tracking-wider text-gray-500 hover:text-black">
          ← Back to home
        </Link>
        <h1 className="mb-8 font-inter text-2xl font-bold uppercase tracking-wider text-black sm:text-3xl xl:text-4xl">
          {title}
        </h1>
        <div className="max-w-none text-gray-700">
          {children}
        </div>
      </div>
    </div>
  )
}
