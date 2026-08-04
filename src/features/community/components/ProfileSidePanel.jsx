import { useEffect, useState } from 'react'
import { useCommunitySocial } from '../context/CommunitySocialContext'
import { debugError } from '../../../utils/debugLog.js'

const TABS = ['Posts', 'Reels', 'Tagged']

export default function ProfileSidePanel({ profile, onClose }) {
  const [activeTab, setActiveTab] = useState('Posts')
  const social = useCommunitySocial()

  useEffect(() => {
    if (!profile) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [profile, onClose])

  useEffect(() => {
    if (profile) setActiveTab('Posts')
  }, [profile])

  if (!profile) return null

  const userId = profile.id
  const following = social.isFollowingUser(userId, profile.isFollowing)

  const handleFollow = async () => {
    if (!userId) return
    try {
      await social.toggleFollow(userId, following)
    } catch (err) {
      debugError('[Community] side panel follow failed', err?.message)
    }
  }

  return (
    <aside
      className="scrollbar-hide fixed inset-y-0 right-0 z-[70] w-full max-w-[380px] overflow-y-auto bg-[#f4f4f4] p-3 shadow-[-16px_0_42px_rgba(0,0,0,0.12)] animate-[community-profile-in_280ms_cubic-bezier(0.22,1,0.36,1)] sm:p-4 pointer-events-auto"
      role="dialog"
      aria-modal="false"
      aria-label={`${profile.name} profile`}
    >
      <div className="flex min-h-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to feed"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 text-center sm:px-6">
          <div className="mx-auto mt-2 h-24 w-24 overflow-hidden rounded-full border-[3px] border-[#ff5b67] bg-neutral-100 p-0.5">
            <img
              src={profile.avatar}
              alt={`${profile.name} profile`}
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          <h2 className="mt-4 font-inter text-2xl font-bold tracking-tight text-black">
            {profile.name}
          </h2>
          <p className="mt-0.5 font-inter text-sm text-neutral-500">
            @{profile.handle}
          </p>

          <p className="mx-auto mt-4 max-w-[18rem] font-inter text-sm leading-relaxed text-neutral-500">
            Exploring the intersection of art and tech. 🎨
            <br />
            New video every Sunday! ✨
          </p>

          <div className="mt-6 grid grid-cols-3">
            {[
              ['482', 'Posts'],
              ['124k', 'Followers'],
              ['854', 'Following'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-inter text-base font-bold text-black">{value}</p>
                <p className="font-inter text-xs text-neutral-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-xl bg-black py-3 font-inter text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Share Profile
            </button>
            <button
              type="button"
              onClick={handleFollow}
              className="cursor-pointer rounded-xl border-2 border-black bg-white py-3 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <div className="mt-1 grid grid-cols-3 border-b border-neutral-200 px-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative cursor-pointer py-3 font-inter text-sm font-semibold transition ${
                activeTab === tab ? 'text-black' : 'text-neutral-400'
              }`}
            >
              {tab}
              {activeTab === tab ? (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-black" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3">
          <div className="aspect-square overflow-hidden bg-[#dcebf2]">
            <img
              src={profile.avatar}
              alt=""
              className="h-full w-full object-cover opacity-75 mix-blend-multiply"
            />
          </div>
          <div className="aspect-square bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]" />
          <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,#ffffff_0_13%,transparent_14%),radial-gradient(circle_at_68%_62%,#ffffff_0_14%,transparent_15%),linear-gradient(135deg,#f4f4f4,#d7d7d7)]" />
          <div className="aspect-square bg-[linear-gradient(135deg,#dde7eb_0%,#f7fbfc_45%,#b8d7e4_100%)]" />
          <div className="aspect-square bg-[linear-gradient(155deg,#1b7cc1_0%,#2ad3d1_45%,#7356e8_100%)]" />
          <div className="aspect-square overflow-hidden bg-neutral-100">
            <img
              src={profile.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
