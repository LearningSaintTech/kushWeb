import { Link, NavLink } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import whiteKhush from '../../../assets/images/community/whitekhush.svg'
import createCardBg from '../../../assets/images/community/black rectangle.png'
import { getCapabilities } from '../capabilities'
import { IoSettingsOutline } from 'react-icons/io5'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    to: ROUTES.COMMUNITY_FEED,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    to: ROUTES.COMMUNITY_SEARCH,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    id: 'reels',
    label: 'Reels',
    to: ROUTES.COMMUNITY_REELS,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    to: ROUTES.COMMUNITY_FEED,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: 'create',
    label: 'Create',
    to: ROUTES.COMMUNITY_CREATE_JOIN,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    to: ROUTES.COMMUNITY_PROFILE,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: 'saved',
    label: 'Saved',
    to: ROUTES.COMMUNITY_SAVED,
    icon: (
      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
]

export default function CommunitySidebar({
  role = 'user',
  activeId = 'home',
  userName = 'Rhea Kapoor',
  userAvatar = null,
  onCreateClick,
  onNotificationsClick,
}) {
  const caps = getCapabilities(role)
  const items = NAV_ITEMS.filter((item) => caps.sidebar.includes(item.id))

  const handleNavClick = (item, event) => {
    if (item.id === 'create' && onCreateClick) {
      event.preventDefault()
      onCreateClick()
      return
    }
    if (item.id === 'notifications' && onNotificationsClick) {
      event.preventDefault()
      onNotificationsClick()
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-white px-3 py-4">
      <div className="shrink-0">
        <p className="px-2 font-inter text-base font-bold tracking-[0.12em] text-black">
          COMMUNITY
        </p>

        <nav className="mt-4 flex flex-col gap-0.5" aria-label="Community">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.id === 'home'}
                onClick={(e) => handleNavClick(item, e)}
                className={`flex items-center gap-3 rounded-full px-3 py-[7px] font-inter text-sm transition ${
                  isActive
                    ? 'bg-neutral-100 font-semibold text-black'
                    : 'font-medium text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className="text-black">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto flex shrink-0 flex-col gap-3 pt-4">
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-2 px-2 font-inter text-sm font-semibold text-black transition hover:opacity-70"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Khush
        </Link>

        {caps.showCreateCard ? (
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={createCardBg}
              alt=""
              className="block h-[110px] w-[214px] object-cover"
              aria-hidden
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
              <img
                src={whiteKhush}
                alt=""
                className="h-6 w-6 animate-spin text-white "
                aria-hidden
              />
              <p className="mt-2 font-inter text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                Create your first post
              </p>
              <button
                type="button"
                onClick={onCreateClick}
                className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/40 px-3 py-1 font-inter text-[11px] font-semibold text-white transition hover:bg-white/10"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Upload
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2.5 border-t border-neutral-100 px-1 pt-3">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-200">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <p className="min-w-0 flex-1 truncate font-inter text-sm font-semibold text-black">
            {userName}
          </p>
          <button
            type="button"
            aria-label="Settings"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
          >
            <IoSettingsOutline className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
