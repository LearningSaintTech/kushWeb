import { useRef, useState } from 'react'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import { useCommunityRole } from '../../hooks/useCommunityRole'
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
 * Creator profile card — live /community/profile/me data.
 */
export default function CreatorProfileCard({ onOpenMedia, onEditProfile }) {
  const [tab, setTab] = useState('Posts')
  const avatarInputRef = useRef(null)
  const role = useCommunityRole()
  const { profile: onboarding } = useCommunityProfile()
  const { profile: social, loading } = useCommunitySocialProfile()

  const profile = {
    name: social?.name || onboarding?.name || 'Member',
    handle: social?.handle || onboarding?.username || '',
    bio:
      social?.bio ||
      onboarding?.creatorBio ||
      onboarding?.designerBio ||
      onboarding?.shortBio ||
      '',
    avatar: social?.avatar || onboarding?.profileImage || '',
    stats: {
      posts: social?.stats?.posts ?? '0',
      followers: social?.stats?.followers ?? '0',
      following: social?.stats?.following ?? '0',
    },
  }
  const roleBadge = role === 'designer' ? 'DESIGNER' : 'CREATOR'
  const media = social?.mediaByTab?.[tab] ?? []

  return (
    <div className="relative w-full max-w-[380px]">
      <button
        type="button"
        onClick={onEditProfile}
        aria-label="Edit profile"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-md transition hover:bg-neutral-800"
      >
        <PencilIcon className="h-4 w-4" />
      </button>

      <section className="rounded-[1.75rem] bg-white px-6 py-8 text-center shadow-[0_8px_28px_rgba(0,0,0,0.05)] sm:px-8">
        <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
          <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#ff5b67] bg-neutral-100 p-0.5">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-md ring-1 ring-black/5 transition hover:bg-neutral-100"
          >
            <CameraIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => onEditProfile?.()}
          />
        </div>

        <p className="mt-4 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          {roleBadge}
        </p>

        <h1 className="mt-2 font-inter text-2xl font-bold tracking-tight text-black sm:text-[1.75rem]">
          {loading && !social ? '…' : profile.name}
        </h1>
        <p className="mt-1 font-inter text-sm text-neutral-500">
          @{profile.handle || 'username'}
        </p>

        {profile.bio ? (
          <p className="mx-auto mt-4 max-w-[20rem] whitespace-pre-line font-inter text-sm leading-relaxed text-neutral-500">
            {profile.bio}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-3">
          {[
            [profile.stats.posts, 'Posts'],
            [profile.stats.followers, 'Followers'],
            [profile.stats.following, 'Following'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-inter text-base font-bold text-black sm:text-lg">{value}</p>
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
            onClick={onEditProfile}
            className="cursor-pointer rounded-xl border-2 border-black bg-white py-3 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
          >
            Edit Profile
          </button>
        </div>
      </section>

      <div className="mt-3 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-3 border-b border-neutral-100 px-1">
          {TABS.map((name) => {
            const active = tab === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={`cursor-pointer py-3.5 font-inter text-sm transition ${
                  active
                    ? 'border-b-2 border-black font-semibold text-black'
                    : 'font-medium text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-0.5 bg-neutral-100">
          {loading && media.length === 0 ? (
            <p className="col-span-3 bg-white py-10 text-center font-inter text-xs text-neutral-400">
              Loading…
            </p>
          ) : media.length === 0 ? (
            <p className="col-span-3 bg-white py-10 text-center font-inter text-xs text-neutral-400">
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
                className="aspect-square cursor-pointer overflow-hidden bg-neutral-200"
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
    </div>
  )
}
