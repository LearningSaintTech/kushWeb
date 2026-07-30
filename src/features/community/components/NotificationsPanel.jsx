import { useEffect, useState } from 'react'
import girlImg from '../../../assets/images/community/communitygirl.jpg'
import { IoSettingsOutline } from "react-icons/io5";
const TABS = ['All', 'Mentions', 'Activity']

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    name: 'Sarah Jenkins',
    avatar: girlImg,
    action: 'started following you',
    time: '2m',
    type: 'follow',
    unread: true,
    group: 'today',
  },
  {
    id: 'n2',
    name: 'Marcus Chen',
    avatar: girlImg,
    action: 'liked your post',
    time: '1h',
    type: 'like',
    thumb: girlImg,
    unread: true,
    group: 'today',
  },
  {
    id: 'n3',
    name: 'Elena Voss',
    avatar: girlImg,
    action: 'commented:',
    preview: 'Minimalist black linen...',
    time: '1d',
    type: 'comment',
    thumb: girlImg,
    unread: false,
    group: 'earlier',
  },
]

function NotificationRow({ item, onFollowBack }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        item.unread ? 'bg-[#eef6ff]' : 'bg-white'
      }`}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-200">
        <img src={item.avatar} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-inter text-[13px] leading-snug text-neutral-800">
          <span className="font-semibold text-black">{item.name}</span>{' '}
          {item.action}
          {item.preview ? (
            <>
              {' '}
              <span className="text-neutral-500">{item.preview}</span>
            </>
          ) : null}
        </p>
        <p className="mt-0.5 font-inter text-xs text-neutral-400">{item.time}</p>
      </div>

      {item.type === 'follow' ? (
        <button
          type="button"
          onClick={() => onFollowBack?.(item.id)}
          className="shrink-0 cursor-pointer rounded-lg bg-black px-3 py-1.5 font-inter text-xs font-semibold text-white transition hover:bg-neutral-800"
        >
          Follow Back
        </button>
      ) : item.type === 'following' ? (
        <span className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 font-inter text-xs font-semibold text-neutral-500">
          Following
        </span>
      ) : item.thumb ? (
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-100">
          <img src={item.thumb} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </div>
  )
}

function Section({ label, showRule, children }) {
  return (
    <section>
      {showRule && (
        <div className="mx-4 mb-3 mt-4 h-px bg-neutral-200" />
      )}

      <p className="px-4 text-left font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </p>

      <div className="mt-1">{children}</div>
    </section>
  )
}

export default function NotificationsPanel({ open, onClose }) {
  const [tab, setTab] = useState('Activity')
  const [items, setItems] = useState(MOCK_NOTIFICATIONS)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) setTab('Activity')
  }, [open])

  if (!open) return null

  const unreadCount = items.filter((n) => n.unread).length
  const today = items.filter((n) => n.group === 'today')
  const earlier = items.filter((n) => n.group === 'earlier')

  const handleFollowBack = (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, type: 'following' } : n)),
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="fixed inset-0 z-[65] cursor-default bg-black/10 lg:bg-transparent"
      />

      <aside
        className="scrollbar-hide fixed inset-y-0 left-0 z-[70] flex w-full max-w-[400px] flex-col overflow-hidden bg-white shadow-[16px_0_42px_rgba(0,0,0,0.10)] animate-[community-notifications-in_280ms_cubic-bezier(0.22,1,0.36,1)]"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between bg-[#f7f7f7] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-inter text-xl font-bold tracking-tight text-black">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f07a3a] px-1.5 font-inter text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200 hover:text-black"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {TABS.map((name) => {
              const active = tab === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 font-inter text-sm transition ${
                    active
                      ? 'bg-transparent border-2 border-black font-semibold text-black'
                      : 'font-medium text-neutral-500 hover:text-black'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            aria-label="Notification settings"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-black transition hover:bg-neutral-100 hover:text-black"
          >
            <IoSettingsOutline className="h-5 w-5 " />
          </button>
        </div>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pb-6">
          {today.length > 0 ? (
            <Section label="Today">
              {today.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onFollowBack={handleFollowBack}
                />
              ))}
            </Section>
          ) : null}

          {earlier.length > 0 ? (
            <Section label="Earlier" showRule >
              {earlier.map((item) => (
                <NotificationRow key={item.id} item={item} onFollowBack={handleFollowBack} />
              ))}
            </Section>
          ) : null}

          {items.length === 0 ? (
            <p className="px-5 py-10 text-center font-inter text-sm text-neutral-400">
              No notifications yet
            </p>
          ) : null}
        </div>
      </aside>
    </>
  )
}
