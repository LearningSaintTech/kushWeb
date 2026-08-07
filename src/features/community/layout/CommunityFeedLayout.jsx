import { useCallback, useMemo, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/context/AuthContext'
import { ROUTES } from '../../../utils/constants'
import girlImg from '../../../assets/images/community/communitygirl.jpg'
import { can } from '../capabilities'
import { useCommunityRole } from '../hooks/useCommunityRole'
import CommunitySidebar from '../components/CommunitySidebar'
import SuggestedCreators from '../components/SuggestedCreators'
import TrendingHashtags from '../components/TrendingHashtags'
import ProfileSidePanel from '../components/ProfileSidePanel'
import PostDetailModal from '../components/PostDetailModal'
import NotificationsPanel from '../components/NotificationsPanel'
import CreateTypeModal from '../components/create/CreateTypeModal'
import AddMediaSheet from '../components/create/AddMediaSheet'
import CreatePostComposer from '../components/create/CreatePostComposer'
import { SUGGESTED_CREATORS, TRENDING_HASHTAGS } from '../data/mockFeed'
import { debugLog } from '../../../utils/debugLog'

function resolveActiveNav(pathname) {
  if (pathname.includes('/saved')) return 'saved'
  if (pathname.includes('/search')) return 'search'
  if (pathname.includes('/reels')) return 'reels'
  if (pathname.includes('/create')) return 'create'
  if (pathname.includes('/profile')) return 'profile'
  return 'home'
}

/**
 * Shared community shell — same layout for user / creator / designer.
 * Home: narrow feed + right rail
 * Search: wider masonry + right rail
 * Reels: snap-scroll player + right rail (main overflow owned by feed)
 * Profile: join chooser on soft gray canvas
 * Saved: full-width dense mosaic
 */
export default function CommunityFeedLayout({
  onCreateClick,
  rightRail = true,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeNav = useMemo(
    () => resolveActiveNav(location.pathname),
    [location.pathname],
  )
  const isSaved = activeNav === 'saved'
  const isSearch = activeNav === 'search'
  const isReels = activeNav === 'reels'
  const isProfile = activeNav === 'profile'
  const isCreateJoin = activeNav === 'create'
  /** Soft gray canvas: join chooser + own profile (dashboard layout) */
  const isJoinCanvas = isProfile || isCreateJoin
  /** Profile with card+dashboard — hug sidebar, no huge centered gap */
  const isProfileShell = isProfile

  const role = useCommunityRole()
  const { user } = useAuth()
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [createKind, setCreateKind] = useState('reel')
  const [createMediaFile, setCreateMediaFile] = useState(null)

  const closeProfile = useCallback(() => setSelectedProfile(null), [])
  const closePost = useCallback(() => setSelectedPost(null), [])
  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])

  const openCreate = useCallback(() => {
    setSelectedProfile(null)
    setSelectedPost(null)
    setNotificationsOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
    setCreateTypeOpen(false)
    onCreateClick?.()

    // Normal users / guests cannot post — send them to join chooser (same as Profile)
    if (!can(role, 'canPost')) {
      navigate(ROUTES.COMMUNITY_CREATE_JOIN)
      return
    }

    // Creators / designers get Reel / Post picker
    setCreateTypeOpen(true)
  }, [navigate, onCreateClick, role])

  const closeCreateFlow = useCallback(() => {
    setCreateTypeOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
  }, [])

  const handleCreateTypeSelect = useCallback((kind) => {
    setCreateKind(kind)
    setCreateTypeOpen(false)
    setMediaSheetOpen(true)
  }, [])

  const handleMediaPicked = useCallback((file) => {
    debugLog('[Community] media picked for create', {
      kind: createKind,
      name: file?.name,
      type: file?.type,
    })
    setCreateMediaFile(file || null)
    setMediaSheetOpen(false)
    setCreateTypeOpen(false)
    setComposerOpen(true)
  }, [createKind])

  const handlePosted = useCallback(() => {
    closeCreateFlow()
    if (createKind === 'reel') {
      navigate(ROUTES.COMMUNITY_REELS)
    } else {
      navigate(ROUTES.COMMUNITY_FEED)
    }
  }, [closeCreateFlow, createKind, navigate])

  const openProfile = useCallback((profile) => {
    setSelectedPost(null)
    setNotificationsOpen(false)
    setCreateTypeOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
    setSelectedProfile(profile)
  }, [])

  const openPost = useCallback((post) => {
    setSelectedProfile(null)
    setNotificationsOpen(false)
    setCreateTypeOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
    setSelectedPost(post)
  }, [])

  const openNotifications = useCallback(() => {
    setSelectedProfile(null)
    setSelectedPost(null)
    setCreateTypeOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
    setNotificationsOpen(true)
  }, [])

  const userName =
    user?.name ??
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ??
    'Rhea Kapoor'
  const userAvatar = user?.profileImage ?? user?.avatar ?? girlImg
  const shellRole = role === 'guest' ? 'user' : role
  const showRightRail = rightRail && !selectedProfile && !isSaved && !isJoinCanvas
  const sidebarActiveId =
    createTypeOpen || mediaSheetOpen || composerOpen
      ? 'create'
      : notificationsOpen
        ? 'notifications'
        : activeNav

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white lg:flex-row">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 lg:hidden">
        <p className="font-inter text-base font-bold tracking-[0.12em] text-black">
          COMMUNITY
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNotifications}
            aria-label="Notifications"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-black transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>
          <Link
            to={ROUTES.COMMUNITY}
            className="font-inter text-sm font-medium text-neutral-500 transition hover:text-black"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="hidden h-full min-h-0 shrink-0 overflow-hidden lg:block">
        <CommunitySidebar
          role={shellRole}
          activeId={sidebarActiveId}
          userName={userName}
          userAvatar={userAvatar}
          onCreateClick={openCreate}
          onNotificationsClick={openNotifications}
        />
      </div>

      <div
        className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
          isSaved || isJoinCanvas
            ? ''
            : isReels
              ? 'items-stretch justify-center px-3 sm:px-4 lg:px-6 xl:px-10'
              : 'justify-center px-4 lg:px-8 xl:px-10'
        } ${isJoinCanvas ? 'bg-[#f5f5f5]' : 'bg-white'}`}
      >
        {isReels ? (
          /* Centered reels cluster: large player + actions + right rail */
          <div className="flex h-full max-w-full shrink-0 items-stretch gap-4 sm:gap-5 lg:gap-8 xl:gap-10">
            <main className="h-full min-h-0 w-[min(100vw-4rem,600px)] shrink-0 overflow-hidden sm:w-[min(100%,540px)] lg:w-[min(100%,580px)]">
              <div className="flex h-full min-h-0 w-full flex-col items-center justify-center">
                <Outlet context={{ openProfile, openPost }} />
              </div>
            </main>

            {showRightRail ? (
              <aside className="scrollbar-hide hidden h-full w-[220px] shrink-0 overflow-y-auto py-6 lg:block xl:w-[240px]">
                <SuggestedCreators creators={SUGGESTED_CREATORS} />
                <div className="mt-8">
                  <TrendingHashtags hashtags={TRENDING_HASHTAGS} />
                </div>
              </aside>
            ) : null}
          </div>
        ) : (
          <div
            className={`flex h-full min-w-0 ${
              isSaved || isJoinCanvas
                ? 'w-full'
                : isSearch
                  ? 'w-full max-w-[1100px] gap-8 xl:gap-10'
                  : 'w-full max-w-[920px] gap-8 xl:max-w-[980px] xl:gap-10'
            }`}
          >
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-hide">
              <div
                className={
                  isSaved
                    ? 'w-full px-6 py-6 sm:px-8 lg:px-10'
                    : isProfileShell
                      ? // Profile + dashboard: tight to sidebar (matches mock on lg/xl)
                        'w-full px-3 py-4 sm:px-4 lg:px-5 lg:py-5 xl:px-6'
                      : isCreateJoin
                        ? 'flex min-h-full w-full items-stretch px-4 py-6 sm:px-8 lg:px-12'
                        : isSearch
                          ? 'w-full py-6 pr-1'
                          : 'mx-auto w-full max-w-[520px] py-6'
                }
              >
                <Outlet context={{ openProfile, openPost }} />
              </div>
            </main>

            {showRightRail ? (
              <aside className="scrollbar-hide hidden h-full w-[250px] shrink-0 overflow-y-auto py-6 xl:block xl:w-[260px]">
                <SuggestedCreators creators={SUGGESTED_CREATORS} />
                <div className="mt-8">
                  <TrendingHashtags hashtags={TRENDING_HASHTAGS} />
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>

      <ProfileSidePanel
        profile={selectedProfile}
        onClose={closeProfile}
        onOpenPost={openPost}
      />
      <PostDetailModal
        post={selectedPost}
        onClose={closePost}
        onProfileClick={(author) => {
          closePost()
          openProfile(author)
        }}
      />
      <NotificationsPanel open={notificationsOpen} onClose={closeNotifications} />
      <CreateTypeModal
        open={createTypeOpen}
        onClose={closeCreateFlow}
        onSelect={handleCreateTypeSelect}
      />
      <AddMediaSheet
        open={mediaSheetOpen}
        type={createKind}
        onClose={closeCreateFlow}
        onCamera={handleMediaPicked}
        onGallery={handleMediaPicked}
      />
      <CreatePostComposer
        open={composerOpen}
        kind={createKind}
        mediaFile={createMediaFile}
        onClose={closeCreateFlow}
        onPosted={handlePosted}
      />
    </div>
  )
}
