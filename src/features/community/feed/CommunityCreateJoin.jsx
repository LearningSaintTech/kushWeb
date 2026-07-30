import { useState } from 'react'
import RegistrationWizard from '../registration/RegistrationWizard'
import CreatorWizard from '../creator/CreatorWizard'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { getCommunityProfileErrorMessage } from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'
import { FaChevronRight } from 'react-icons/fa'

const StarIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2.5l2.1 6.5H21l-5.3 3.9 2 6.6L12 15.8l-5.7 3.7 2-6.6L3 9h6.9L12 2.5z" />
  </svg>
)

const FEATURE_ICONS = {
  royalties: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4-8c0-1.1 1.8-2 4-2s4 .9 4 2-1.8 2-4 2-4 .9-4 2 1.8 2 4 2 4-.9 4-2" />
    </svg>
  ),
  sell: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
    </svg>
  ),
  discover: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  earn: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  gifts: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25" />
    </svg>
  ),
  boost: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.055-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  ),
}

const JOIN_OPTIONS = [
  {
    id: 'designer',
    title: 'Join as Designer',
    subtitle: 'Discover what you get when you join Khush as a designer',
    cta: 'Join as Designer',
    features: [
      {
        icon: FEATURE_ICONS.royalties,
        title: 'Lifetime Royalties',
        description: 'Earn royalties every time someone uses your design',
      },
      {
        icon: FEATURE_ICONS.sell,
        title: 'Sell Your Designs',
        description: 'List your designs on the Khush marketplace',
      },
      {
        icon: FEATURE_ICONS.discover,
        title: 'Get Discovered',
        description: 'Khush features top designers to grow your brand',
      },
    ],
  },
  {
    id: 'creator',
    title: 'Join as Creator',
    subtitle: 'Discover what you get when you join Khush as a creator',
    cta: 'Join as Creator',
    features: [
      {
        icon: FEATURE_ICONS.earn,
        title: 'Earn on Posts',
        description: 'Get paid every time your post gets a like or view',
      },
      {
        icon: FEATURE_ICONS.gifts,
        title: 'Receive Gifts',
        description: 'Fans can send you gifts directly from Khush',
      },
      {
        icon: FEATURE_ICONS.boost,
        title: 'Boost Your Reach',
        description: 'Khush promotes creators to grow your audience',
      },
    ],
  },
]

function JoinCard({ option, onJoin, busy }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white px-6 py-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:px-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-black">
        <StarIcon />
      </div>

      <h2 className="mt-5 text-center font-inter text-2xl font-bold tracking-tight text-black">
        {option.title}
      </h2>
      <p className="mx-auto mt-2 max-w-[22rem] text-center font-inter text-[14px] leading-relaxed text-neutral-500">
        {option.subtitle}
      </p>

      <ul className="mt-8 flex-1 space-y-5">
        {option.features.map((feature) => (
          <li key={feature.title} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-black">
              {feature.icon}
            </span>
            <div className="min-w-0">
              <p className="font-inter text-sm font-semibold text-black">{feature.title}</p>
              <p className="mt-0.5 font-inter text-sm leading-snug text-neutral-500">
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onJoin}
        disabled={busy}
        className="mt-8 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-black py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Starting…' : option.cta}
        {!busy ? (
          <span aria-hidden>
            <FaChevronRight />
          </span>
        ) : null}
      </button>
    </article>
  )
}

/**
 * Create join chooser for normal users — cards only (no hero).
 * Distinct from Profile, which includes the hero illustration.
 */
export default function CommunityCreateJoin() {
  const { selectRole } = useCommunityProfile()
  const [showDesigner, setShowDesigner] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [joining, setJoining] = useState(null)
  const [joinError, setJoinError] = useState(null)

  const handleJoin = async (role) => {
    setJoinError(null)
    setJoining(role)
    try {
      debugLog('[CommunityProfile] join from create page', { role })
      await selectRole(role)
      if (role === 'designer') setShowDesigner(true)
      else setShowCreator(true)
    } catch (err) {
      setJoinError(getCommunityProfileErrorMessage(err))
    } finally {
      setJoining(null)
    }
  }

  return (
    <>
      <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col items-center justify-center py-8">
        {joinError ? (
          <p className="mb-4 font-inter text-sm text-red-500" role="alert">
            {joinError}
          </p>
        ) : null}
        <div className="grid w-full gap-5 sm:grid-cols-2 sm:gap-6">
          {JOIN_OPTIONS.map((option) => (
            <JoinCard
              key={option.id}
              option={option}
              busy={joining === option.id}
              onJoin={() => handleJoin(option.id)}
            />
          ))}
        </div>
      </div>

      <RegistrationWizard open={showDesigner} onClose={() => setShowDesigner(false)} />
      <CreatorWizard open={showCreator} onClose={() => setShowCreator(false)} />
    </>
  )
}
