import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommunitySocial } from '../context/CommunitySocialContext'
import { useCommunitySocialProfile } from '../hooks/useCommunitySocialProfile'
import { debugError } from '../../../utils/debugLog.js'
import { isReelGridItem, navigateToReel, playlistFromGrid } from '../utils/openReel'

const TABS = ['Posts', 'Reels', 'Tagged']

export default function ProfileSidePanel({ profile: seed, onClose, onOpenPost }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Posts')
  const social = useCommunitySocial()
  const userId = seed?.id || seed?.userId || null
  const { profile, loading } = useCommunitySocialProfile({
    userId,
    enabled: Boolean(userId),
  })

  const display = profile || {
    id: userId,
    name: seed?.name || 'Member',
    handle: seed?.handle || '',
    bio: seed?.bio || '',
    avatar: seed?.avatar || '',
    isFollowing: Boolean(seed?.isFollowing),
    isOwnProfile: false,
    stats: { posts: '—', followers: '—', following: '—' },
    mediaByTab: { Posts: [], Reels: [], Tagged: [] },
  }

  useEffect(() => {
    if (!seed) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [seed, onClose])

  useEffect(() => {
    if (seed) setActiveTab('Posts')
  }, [seed])

  if (!seed) return null

  const following = social.isFollowingUser(display.id, display.isFollowing)
  const media = display.mediaByTab?.[activeTab] ?? []

  const handleFollow = async () => {
    if (!display.id || display.isOwnProfile) return
    try {
      await social.toggleFollow(display.id, following)
    } catch (err) {
      debugError('[Community] side panel follow failed', err?.message)
    }
  }

  const handleOpenMedia = (item) => {
    if (!item) return
    if (isReelGridItem(item, activeTab)) {
      const reelSeed = item.post
        ? { ...item.post, type: 'reel' }
        : { id: item.id, type: 'reel', image: item.image || '', poster: item.image || '' }
      onClose?.()
      navigateToReel(navigate, {
        reelId: item.id || item.post?.id,
        seed: reelSeed,
        playlist: playlistFromGrid(display.mediaByTab?.Reels || []),
        source: 'profile',
      })
      return
    }
    if (item.post) onOpenPost?.(item.post)
  }

  return (
    <aside
      className="scrollbar-hide fixed inset-y-0 right-0 z-[70] w-full max-w-[380px] overflow-y-auto bg-[#f4f4f4] p-3 shadow-[-16px_0_42px_rgba(0,0,0,0.12)] animate-[community-profile-in_280ms_cubic-bezier(0.22,1,0.36,1)] sm:p-4 pointer-events-auto"
      role="dialog"
      aria-modal="false"
      aria-label={`${display.name} profile`}
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
            {display.avatar ? (
              <img
                src={display.avatar}
                alt={`${display.name} profile`}
                className="h-full w-full rounded-full object-cover"
              />
            ) : null}
          </div>

          <h2 className="mt-4 font-inter text-2xl font-bold tracking-tight text-black">
            {loading && !profile ? '…' : display.name}
          </h2>
          <p className="mt-0.5 font-inter text-sm text-neutral-500">
            @{display.handle || 'username'}
          </p>

          {display.bio ? (
            <p className="mx-auto mt-4 max-w-[18rem] font-inter text-sm leading-relaxed text-neutral-500">
              {display.bio}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-3">
            {[
              [display.stats?.posts ?? '0', 'Posts'],
              [display.stats?.followers ?? '0', 'Followers'],
              [display.stats?.following ?? '0', 'Following'],
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
            {display.isOwnProfile ? (
              <button
                type="button"
                className="cursor-pointer rounded-xl border-2 border-black bg-white py-3 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFollow}
                className="cursor-pointer rounded-xl border-2 border-black bg-white py-3 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
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
          {loading && media.length === 0 ? (
            <p className="col-span-3 py-12 text-center font-inter text-xs text-neutral-400">
              Loading…
            </p>
          ) : media.length === 0 ? (
            <p className="col-span-3 py-12 text-center font-inter text-xs text-neutral-400">
              No {activeTab.toLowerCase()} yet
            </p>
          ) : (
            media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenMedia(item)}
                className="aspect-square cursor-pointer overflow-hidden bg-neutral-100"
                aria-label={`Open ${item.type}`}
              >
                {item.image ? (
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
