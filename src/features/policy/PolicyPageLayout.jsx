import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import PageTitle from '../../shared/ui/PageTitle'
import { PAGE_CONTAINER, PAGE_SHELL } from '../../shared/ui/pageLayout'

export default function PolicyPageLayout({ title, children }) {
  return (
    <div className={PAGE_SHELL}>
      <div className={PAGE_CONTAINER}>
        <Link to={ROUTES.HOME} className="mb-6 inline-block text-sm uppercase tracking-wider text-gray-500 hover:text-black">
          ← Back to home
        </Link>
        <PageTitle className="mb-6">{title}</PageTitle>
        <div className="max-w-none text-gray-700">
          {children}
        </div>
      </div>
    </div>
  )
}
