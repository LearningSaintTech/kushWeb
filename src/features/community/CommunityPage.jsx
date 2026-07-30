import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import { useAuth } from '../../app/context/AuthContext'
import RegistrationWizard from './registration/RegistrationWizard'
import CreatorWizard from './creator/CreatorWizard'
import { useCommunityProfile } from './context/CommunityProfileContext'
import { getCommunityProfileErrorMessage } from '../../services/communityProfile.service'
import { debugLog } from '../../utils/debugLog'

const FEATURES = [
  {
    title: 'Follow Creators',
    description: 'Stay updated with your favourite fashion creators and their latest edits.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 018.835-2.535m0 0A23.74 23.74 0 0121.75 12c0 .974-.054 1.935-.16 2.879m0 0a23.75 23.75 0 01-2.586 9.81M10.34 6.66c.253-.962.584-1.892.985-2.783.247-.55.06-1.21-.463-1.511l-.657-.38c-.551-.318-1.26-.117-1.527.461a20.842 20.842 0 00-1.44 4.282" />
      </svg>
    ),
  },
  {
    title: 'Shop their Style',
    description: 'Buy products tagged in any post instantly with curated designer picks.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'Share Your Vibe',
    description: 'Upload posts and reels as a creator and inspire the community.',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.641-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
]

export default function CommunityPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const { selectRole } = useCommunityProfile()
  const [showRegister, setShowRegister] = useState(false)
  const [showCreatorJoin, setShowCreatorJoin] = useState(false)
  const [joining, setJoining] = useState(null)
  const [joinError, setJoinError] = useState(null)

  const handleExploreCommunity = () => {
    if (!authChecked) return
    if (!isAuthenticated) {
      openAuthModal(ROUTES.COMMUNITY_ENTER)
      return
    }
    navigate(ROUTES.COMMUNITY_ENTER)
  }

  const handleJoinRole = async (role) => {
    setJoinError(null)
    if (!authChecked) return
    if (!isAuthenticated) {
      openAuthModal(ROUTES.COMMUNITY)
      return
    }
    setJoining(role)
    try {
      debugLog('[CommunityProfile] landing join', { role })
      await selectRole(role)
      if (role === 'designer') setShowRegister(true)
      else setShowCreatorJoin(true)
    } catch (err) {
      setJoinError(getCommunityProfileErrorMessage(err))
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 sm:pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="font-Lexend text-[11px] font-bold uppercase tracking-[0.22em] text-gray-900 sm:text-xs">
            Community
          </p>
          <h1 className="mx-auto mt-4 max-w-lg font-inter text-2xl font-bold leading-snug tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
            Where fashion meets creators and connoisseurs
          </h1>
          <p className="mx-auto mt-3 max-w-xl font-inter text-sm leading-relaxed text-neutral-500 sm:mt-4 sm:text-base">
            Discover styles, follow your favourite creators, and shop straight from editorial posts.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl bg-[#F9FAFB] px-5 py-6 text-left sm:px-6 sm:py-7">
              <div className="text-neutral-900">{feature.icon}</div>
              <h2 className="mt-4 font-inter text-base font-bold text-neutral-900 sm:text-lg">{feature.title}</h2>
              <p className="mt-2 font-inter text-sm leading-relaxed text-neutral-500">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-4 rounded-2xl bg-[#1b261e] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-7">
            <div className="sm:max-w-[18rem]">
              <h3 className="font-inter text-[20px] font-bold text-white">Are You a Designer?</h3>
              <p className="font-inter text-[15px] text-white/70">Partner with us to feature your collections.</p>
            </div>
            <button
              type="button"
              disabled={joining === 'designer'}
              onClick={() => handleJoinRole('designer')}
              className="shrink-0 self-start rounded-full border border-white px-5 py-2 font-inter text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60 sm:self-center"
            >
              {joining === 'designer' ? 'Starting…' : 'Register'}
            </button>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[#f1e8dc] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-7">
            <div className="sm:max-w-[18rem]">
              <h3 className="font-inter text-[20px] font-bold text-[#111827]">Join as Creator</h3>
              <p className="font-inter text-[12px] text-[#6B7280]">Start sharing your unique style today.</p>
            </div>
            <button
              type="button"
              disabled={joining === 'creator'}
              onClick={() => handleJoinRole('creator')}
              className="shrink-0 self-start rounded-full bg-[#1b261e] px-5 py-2 font-inter text-sm font-medium text-white transition hover:bg-[#243029] disabled:opacity-60 sm:self-center"
            >
              {joining === 'creator' ? 'Starting…' : 'Join Now'}
            </button>
          </div>
        </section>

        {joinError ? (
          <p className="mt-4 text-center font-inter text-sm text-red-500" role="alert">{joinError}</p>
        ) : null}

        <div className="mt-10 flex justify-center sm:mt-12">
          <button
            type="button"
            onClick={handleExploreCommunity}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1b261e] px-8 py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-[#243029] sm:px-10 sm:py-4"
          >
            Explore Community
            <span aria-hidden className="text-base leading-none">→</span>
          </button>
        </div>
      </div>

      <RegistrationWizard open={showRegister} onClose={() => setShowRegister(false)} />
      <CreatorWizard open={showCreatorJoin} onClose={() => setShowCreatorJoin(false)} />
    </div>
  )
}
