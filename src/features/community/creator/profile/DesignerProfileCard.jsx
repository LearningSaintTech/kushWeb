import { useRef, useState } from 'react'
import whiteBg from '../../../../assets/images/community/whitebg.png'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import { useCommunitySocialProfile } from '../../hooks/useCommunitySocialProfile'
import { playlistFromGrid } from '../../utils/openReel'

const TABS = ['Posts', 'Reels', 'Tagged']

function CameraIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.055-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  )
}

function PencilIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  )
}

/**
 * Dark designer profile card — live /community/profile/me data.
 */
export default function DesignerProfileCard({
  onOpenMedia,
  onViewPortfolio,
  onEditProfile,
  onAvatarChange,
}) {
  const [tab, setTab] = useState('Posts')
  const avatarInputRef = useRef(null)
  const { profile: onboarding } = useCommunityProfile()
  const { profile: social, loading } = useCommunitySocialProfile()

  const profile = {
    name: social?.name || onboarding?.name || 'Member',
    handle: social?.handle || onboarding?.username || '',
    avatar: social?.avatar || onboarding?.profileImage || '',
    tagline:
      social?.bio ||
      onboarding?.designerTagline ||
      onboarding?.designerBio ||
      onboarding?.shortBio ||
      '',
    cover: onboarding?.designerCoverImage || whiteBg,
    badge: social?.isDesigner || onboarding?.isDesigner ? 'DESIGNER' : 'CREATOR',
    openToWork: Boolean(onboarding?.openToWork),
    stats: {
      followers: social?.stats?.followers ?? '0',
      following: social?.stats?.following ?? '0',
      posts: social?.stats?.posts ?? '0',
    },
  }

  const media = social?.mediaByTab?.[tab] ?? []

  const handleAvatarPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (onAvatarChange) {
      onAvatarChange(file)
      return
    }
    onEditProfile?.()
  }

  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-[#111111] text-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <div className="relative h-28 w-full sm:h-32">
        <img src={profile.cover} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#111111] to-transparent" />
      </div>

      <div className="relative -mt-14 px-5 pb-5 text-center sm:px-6">
        <div className="relative mx-auto h-[5.75rem] w-[5.75rem] sm:h-24 sm:w-24">
          <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#111111] bg-neutral-800">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute bottom-0.5 right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-md transition hover:bg-neutral-100"
          >
            <CameraIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>

        <button
          type="button"
          onClick={onEditProfile}
          aria-label="Edit profile"
          className="absolute right-4 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black text-white ring-1 ring-white/15 transition hover:bg-neutral-900 sm:right-5"
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        <h1 className="mt-4 font-refer-display text-[1.85rem] font-normal tracking-tight text-white">
          {loading && !social ? '…' : profile.name}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          <p className="font-inter text-sm text-white/50">
            @{profile.handle || 'username'}
          </p>
          <span className="rounded-md border border-[#8B5CF6]/60 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.08em] text-[#c4b5fd]">
            {profile.badge}
          </span>
        </div>

        {profile.tagline ? (
          <p className="mx-auto mt-3 max-w-[18rem] font-inter text-xs leading-relaxed text-white/55">
            {profile.tagline}
          </p>
        ) : null}

        {profile.openToWork ? (
          <p className="mt-2 inline-flex items-center gap-1.5 font-inter text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Open to Work
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#1c1c1c] px-2 py-3.5">
          {[
            [profile.stats.followers, 'Followers'],
            [profile.stats.following, 'Following'],
            [profile.stats.posts, 'Post'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-inter text-base font-bold text-white">{value}</p>
              <p className="font-inter text-[11px] text-white/40">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="cursor-pointer rounded-xl bg-[#2a2a2a] py-2.5 font-inter text-sm font-semibold text-white transition hover:bg-[#333]"
          >
            Share Profile
          </button>
          <button
            type="button"
            onClick={onViewPortfolio}
            className="cursor-pointer rounded-xl bg-[#8B5CF6] py-2.5 font-inter text-sm font-semibold text-white transition hover:bg-[#7c4feb]"
          >
            View Portfolio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/10 px-1">
        {TABS.map((name) => {
          const active = tab === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={`cursor-pointer py-3.5 font-inter text-sm transition ${
                active
                  ? 'border-b-2 border-white font-semibold text-white'
                  : 'font-medium text-white/40 hover:text-white/70'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-0.5 bg-white">
        {loading && media.length === 0 ? (
          <p className="col-span-3 py-10 text-center font-inter text-xs text-neutral-400">
            Loading…
          </p>
        ) : media.length === 0 ? (
          <p className="col-span-3 py-10 text-center font-inter text-xs text-neutral-400">
            No {tab.toLowerCase()} yet
          </p>
        ) : (
          media.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onOpenMedia?.(item, {
                  tab,
                  playlist: playlistFromGrid(social?.mediaByTab?.Reels || []),
                })
              }
              className="aspect-square cursor-pointer overflow-hidden bg-neutral-800"
              aria-label={`Open ${item.type}`}
            >
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover opacity-90" />
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
