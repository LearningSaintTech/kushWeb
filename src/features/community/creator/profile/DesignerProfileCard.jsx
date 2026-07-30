import { useState } from 'react'
import whiteBg from '../../../../assets/images/community/whitebg.png'
import { CREATOR_MEDIA, DESIGNER_PROFILE } from '../../data/mockCreator'
import { useCommunityProfile } from '../../context/CommunityProfileContext'

const TABS = ['Posts', 'Reels', 'Tagged']

/**
 * Dark designer profile card — View Portfolio opens portfolio panel.
 */
export default function DesignerProfileCard({ onOpenMedia, onViewPortfolio }) {
  const [tab, setTab] = useState('Posts')
  const media = CREATOR_MEDIA[tab] ?? []
  const { profile: communityProfile } = useCommunityProfile()

  const profile = {
    ...DESIGNER_PROFILE,
    name: communityProfile?.name || DESIGNER_PROFILE.name,
    handle: communityProfile?.username || DESIGNER_PROFILE.handle,
    avatar: communityProfile?.profileImage || DESIGNER_PROFILE.avatar,
    tagline:
      communityProfile?.designerTagline ||
      communityProfile?.designerBio ||
      DESIGNER_PROFILE.tagline,
    cover: communityProfile?.designerCoverImage || whiteBg,
    badge: communityProfile?.designerTagline ? 'DESIGNER' : DESIGNER_PROFILE.badge,
  }

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-xl bg-black text-white shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
      <div className="relative  w-full h-full sm:h-32">
        <img src={profile.cover} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative -mt-12 px-5 pb-6 text-center sm:px-7">
        <div className="mx-auto h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full border-[3px] border-black bg-neutral-800 sm:h-24 sm:w-24">
          <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
        </div>

        <h1 className="mt-4 font-refer-display text-[1.85rem] font-normal tracking-tight text-white">
          {profile.name}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          <p className="font-inter text-sm text-white/50">@{profile.handle}</p>
          <span className="rounded-md border border-[#8B5CF6]/60 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.08em] text-[#c4b5fd]">
            {profile.badge}
          </span>
        </div>

        {profile.openToWork ? (
          <p className="mt-2 inline-flex items-center gap-1.5 font-inter text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Open to Work
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
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

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-dashed border-[#60a5fa] py-2.5 font-inter text-sm font-semibold text-[#60a5fa] transition hover:bg-white/5"
          >
            Follow
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
        {media.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenMedia?.(item)}
            className={`aspect-square cursor-pointer overflow-hidden ${item.style ?? 'bg-neutral-800'}`}
            aria-label={`Open ${item.type}`}
          >
            {item.image ? (
              <img src={item.image} alt="" className="h-full w-full object-cover opacity-90" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
