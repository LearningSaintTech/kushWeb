import { useState } from 'react'
import { CREATOR_MEDIA, CREATOR_PROFILE } from '../../data/mockCreator'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import { useCommunityRole } from '../../hooks/useCommunityRole'

const TABS = ['Posts', 'Reels', 'Tagged']

/**
 * Creator profile card + content tabs/grid (center column).
 */
export default function CreatorProfileCard({ onOpenMedia, onEditProfile }) {
  const [tab, setTab] = useState('Posts')
  const media = CREATOR_MEDIA[tab] ?? []
  const role = useCommunityRole()
  const { profile: communityProfile } = useCommunityProfile()
  const profile = {
    ...CREATOR_PROFILE,
    name: communityProfile?.name || CREATOR_PROFILE.name,
    handle: communityProfile?.username || CREATOR_PROFILE.handle,
    bio:
      communityProfile?.creatorBio ||
      communityProfile?.designerBio ||
      CREATOR_PROFILE.bio,
    avatar: communityProfile?.profileImage || CREATOR_PROFILE.avatar,
  }
  const roleBadge = role === 'designer' ? 'DESIGNER' : 'CREATOR'

  return (
    <div className="w-full max-w-[420px]">
      <section className="rounded-[1.75rem] bg-white px-6 py-8 text-center shadow-[0_8px_28px_rgba(0,0,0,0.05)] sm:px-8">
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-[3px] border-[#ff5b67] bg-neutral-100 p-0.5 sm:h-32 sm:w-32">
          <img
            src={profile.avatar}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        <p className="mt-4 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          {roleBadge}
        </p>

        <h1 className="mt-2 font-inter text-2xl font-bold tracking-tight text-black sm:text-[1.75rem]">
          {profile.name}
        </h1>
        <p className="mt-1 font-inter text-sm text-neutral-500">@{profile.handle}</p>

        <p className="mx-auto mt-4 max-w-[20rem] whitespace-pre-line font-inter text-sm leading-relaxed text-neutral-500">
          {profile.bio}
        </p>

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
          {media.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenMedia?.(item)}
              className={`aspect-square cursor-pointer overflow-hidden ${item.style ?? 'bg-neutral-200'}`}
              aria-label={`Open ${item.type}`}
            >
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
