import { useState } from 'react'
import heroIllustration from '../../../assets/images/community/hero-illustration.svg'
import RegistrationWizard from '../registration/RegistrationWizard'
import CreatorWizard from '../creator/CreatorWizard'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { getCommunityProfileErrorMessage } from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'
import { FaChevronRight } from 'react-icons/fa'

const StarIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2.5l2.1 6.5H21l-5.3 3.9 2 6.6L12 15.8l-5.7 3.7 2-6.6L3 9h6.9L12 2.5z" />
  </svg>
)

const FEATURE_ICONS = {
  bag: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
    </svg>
  ),
  megaphone: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.189-4.447m0-9.18c-.253-.962-.584-1.892-.985-2.783-.247-.55-.06-1.21.463-1.511l.657-.38c.551-.318 1.26-.117 1.527.461a20.85 20.85 0 011.189 4.447m6.03 3.25a20.9 20.9 0 010-5.502m0 5.502a20.9 20.9 0 000-5.502m0 5.502l2.76 1.59a1.125 1.125 0 001.59-.59 20.9 20.9 0 000-8.004 1.125 1.125 0 00-1.59-.59l-2.76 1.59" />
    </svg>
  ),
  sparkle: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5l2.1 6.5H21l-5.3 3.9 2 6.6L12 15.8l-5.7 3.7 2-6.6L3 9h6.9L12 2.5z" />
    </svg>
  ),
  gift: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25" />
    </svg>
  ),
  camera: (
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
        icon: FEATURE_ICONS.bag,
        title: 'Lifetime Royalties',
        description: 'Earn royalties every time someone uses your design',
      },
      {
        icon: FEATURE_ICONS.megaphone,
        title: 'Sell Your Designs',
        description: 'List your designs on the Khush marketplace',
      },
      {
        icon: FEATURE_ICONS.sparkle,
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
        icon: FEATURE_ICONS.megaphone,
        title: 'Earn on Posts',
        description: 'Get paid every time your post gets a like or view',
      },
      {
        icon: FEATURE_ICONS.gift,
        title: 'Receive Gifts',
        description: 'Fans can send you gifts directly from Khush',
      },
      {
        icon: FEATURE_ICONS.camera,
        title: 'Boost Your Reach',
        description: 'Khush promotes creators to grow your audience',
      },
    ],
  },
]

function JoinCard({ option, onJoin, busy }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white px-5 py-7 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:px-6 sm:py-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-black">
        <StarIcon />
      </div>

      <h2 className="mt-4 font-inter text-xl font-bold tracking-tight text-black sm:text-2xl">
        {option.title}
      </h2>
      <p className="mt-1.5 font-inter text-sm leading-relaxed text-neutral-500">
        {option.subtitle}
      </p>

      <ul className="mt-6 grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-4">
        {option.features.map((feature) => (
          <li key={feature.title} className="min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-black">
              {feature.icon}
            </span>
            <p className="mt-2 font-inter text-sm font-bold text-black">
              {feature.title}
            </p>
            <p className="mt-1 font-inter text-[10px] leading-snug text-neutral-500 sm:text-[13px]">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onJoin}
        disabled={busy}
        className="mt-7 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-black py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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
 * Profile join chooser — hero illustration + role cards.
 */
export default function CommunityProfileJoin() {
  const { selectRole } = useCommunityProfile()
  const [showDesigner, setShowDesigner] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [joining, setJoining] = useState(null)
  const [joinError, setJoinError] = useState(null)

  const handleJoin = async (role) => {
    setJoinError(null)
    setJoining(role)
    try {
      debugLog('[CommunityProfile] join from profile page', { role })
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
      <div className="mx-auto flex min-h-full w-full max-w-[980px] flex-col items-center px-2 py-8 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <img
            src={heroIllustration}
            alt=""
            className="h-full w-full object-contain sm:h-24 sm:w-24"
          />
          <h1 className="mt-4 font-inter text-2xl font-bold tracking-tight text-black sm:text-3xl">
            For Uploading Content
          </h1>
          <p className="mt-2 font-inter text-sm font-normal text-neutral-500 sm:text-base">
            Select your role to personalize your
            <br /> experience
          </p>
        </div>

        {joinError ? (
          <p className="mt-4 font-inter text-sm text-red-500" role="alert">
            {joinError}
          </p>
        ) : null}

        <div className="mt-8 grid w-full gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">
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
