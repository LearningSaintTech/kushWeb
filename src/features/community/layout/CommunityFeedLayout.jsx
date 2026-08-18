import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/context/AuthContext'
import { getCommunityReelsPath, ROUTES } from '../../../utils/constants'
import { navigateToReel } from '../utils/openReel'
import girlImg from '../../../assets/images/community/communitygirl.jpg'
import { can } from '../capabilities'
import { useCommunityRole } from '../hooks/useCommunityRole'
import {
  requestCommunityProfileRefresh,
  useCommunitySocialProfile,
} from '../hooks/useCommunitySocialProfile'
import CommunitySidebar from '../components/CommunitySidebar'
import SuggestedCreators from '../components/SuggestedCreators'
import TrendingHashtags from '../components/TrendingHashtags'
import ProfileSidePanel from '../components/ProfileSidePanel'
import PostDetailModal from '../components/PostDetailModal'
import NotificationsPanel from '../components/NotificationsPanel'
import CreateTypeModal from '../components/create/CreateTypeModal'
import AddMediaSheet from '../components/create/AddMediaSheet'
import CreatePostComposer from '../components/create/CreatePostComposer'
import { CommunitySocialProvider } from '../context/CommunitySocialContext'
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
  const { user, isAuthenticated, authChecked, openAuthModal } = useAuth()
  const askedLoginRef = useRef(false)

  // Community feed needs a session — open login when access token is missing
  useEffect(() => {
    if (!authChecked) return
    if (isAuthenticated) {
      askedLoginRef.current = false
      return
    }
    if (askedLoginRef.current) return
    askedLoginRef.current = true
    openAuthModal(`${location.pathname}${location.search || ''}`)
  }, [authChecked, isAuthenticated, openAuthModal, location.pathname, location.search])

  const canPost = can(role, 'canPost')
  const { profile: socialProfile } = useCommunitySocialProfile({
    enabled: Boolean(isAuthenticated && canPost),
  })
  const hasPosts =
    (socialProfile?.statsRaw?.posts ?? 0) > 0 ||
    (socialProfile?.mediaByTab?.Posts?.length ?? 0) > 0 ||
    (socialProfile?.mediaByTab?.Reels?.length ?? 0) > 0

  const [selectedProfile, setSelectedProfile] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [reelsSidebarOpen, setReelsSidebarOpen] = useState(false)
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [createKind, setCreateKind] = useState('reel')
  const [createMediaFile, setCreateMediaFile] = useState(null)

  useEffect(() => {
    if (!isReels) setReelsSidebarOpen(false)
  }, [isReels])

  useEffect(() => {
    setReelsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!reelsSidebarOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setReelsSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reelsSidebarOpen])

  const closeProfile = useCallback(() => setSelectedProfile(null), [])
  const closePost = useCallback(() => setSelectedPost(null), [])
  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])
  const openReelsSidebar = useCallback(() => setReelsSidebarOpen(true), [])
  const closeReelsSidebar = useCallback(() => setReelsSidebarOpen(false), [])

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

  const openProfile = useCallback((profile) => {
    setSelectedPost(null)
    setNotificationsOpen(false)
    setCreateTypeOpen(false)
    setMediaSheetOpen(false)
    setComposerOpen(false)
    setCreateMediaFile(null)
    setSelectedProfile(profile)
  }, [])

  const openPost = useCallback(
    (post, options = {}) => {
      // Reels open fullscreen Shorts feed — not the post modal (unless comments)
      if (post?.type === 'reel' && !options.forceModal) {
        const id = post.id || post._id
        if (id) {
          setSelectedProfile(null)
          setSelectedPost(null)
          navigateToReel(navigate, {
            reelId: id,
            seed: { ...post, type: 'reel' },
            playlist: options.playlist || [{ ...post, type: 'reel' }],
            source: options.source || 'feed',
          })
          return
        }
      }
      setSelectedProfile(null)
      setNotificationsOpen(false)
      setCreateTypeOpen(false)
      setMediaSheetOpen(false)
      setComposerOpen(false)
      setCreateMediaFile(null)
      setSelectedPost(post)
    },
    [navigate],
  )

  const openReelComments = useCallback((reel) => {
    openPost(reel, { forceModal: true })
  }, [openPost])

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

  const handlePosted = useCallback(
    (payload) => {
      closeCreateFlow()
      requestCommunityProfileRefresh()
      const content = payload?.content
      const id = content?._id || content?.id
      const kind = content?.type || payload?.kind || 'post'

      if (kind === 'reel' && id) {
        navigate(getCommunityReelsPath(id))
        return
      }

      navigate(ROUTES.COMMUNITY_PROFILE)
      if (id) {
        window.setTimeout(() => {
          openPost({
            id,
            image:
              content.media?.[0]?.url ||
              content.thumbnailUrl ||
              content.imageUrl ||
              '',
            images: (content.media || [])
              .map((m) => m?.url)
              .filter(Boolean),
            videoUrl:
              content.media?.find((m) => m.kind === 'video')?.url || null,
            caption: content.caption || payload?.caption || '',
            hashtags: content.hashtags || payload?.hashtags || [],
            type: kind,
            likes: '0',
            likeCount: 0,
            comments: '0',
            commentCount: 0,
            author: {
              id: content.authorId,
              name: content.authorName || userName,
              handle: content.authorUsername || '',
              avatar: content.authorAvatar || userAvatar,
            },
            status: content.status,
            raw: content,
          })
        }, 400)
      }
    },
    [closeCreateFlow, navigate, openPost, userAvatar, userName],
  )

  const shellRole = role === 'guest' ? 'user' : role
  const showRightRail = rightRail && !selectedProfile && !isSaved && !isJoinCanvas && !isReels
  const sidebarActiveId =
    createTypeOpen || mediaSheetOpen || composerOpen
      ? 'create'
      : notificationsOpen
        ? 'notifications'
        : activeNav

  return (
    <CommunitySocialProvider>
    <div className={`relative flex h-dvh min-h-0 w-full flex-col overflow-hidden lg:flex-row ${isReels ? 'bg-black' : 'bg-white'}`}>
      <header
        className={`flex shrink-0 items-center justify-between px-4 py-3 lg:hidden ${
          isReels ? 'bg-black text-white' : 'bg-white text-black'
        }`}
      >
        <div className="flex items-center gap-2">
          {isReels ? (
            <button
              type="button"
              onClick={openReelsSidebar}
              aria-label="Open menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-sm transition hover:bg-neutral-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" />
                <path strokeLinecap="round" d="M9 5v14" />
              </svg>
            </button>
          ) : null}
          <p
            className={`font-inter text-base font-bold tracking-[0.12em] ${
              isReels ? 'text-white' : 'text-black'
            }`}
          >
            COMMUNITY
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNotifications}
            aria-label="Notifications"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition ${
              isReels ? 'text-white hover:bg-white/10' : 'text-black hover:bg-neutral-100'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>
          <Link
            to={ROUTES.COMMUNITY}
            className={`font-inter text-sm font-medium transition ${
              isReels
                ? 'text-white/70 hover:text-white'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Back
          </Link>
        </div>
      </header>

      {/* Desktop: always-on sidebar, except Reels (collapsed until opened) */}
      {!isReels ? (
        <div className="hidden h-full min-h-0 shrink-0 overflow-hidden lg:block">
          <CommunitySidebar
            role={shellRole}
            activeId={sidebarActiveId}
            userName={userName}
            userAvatar={userAvatar}
            hasPosts={hasPosts}
            onCreateClick={openCreate}
            onNotificationsClick={openNotifications}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openReelsSidebar}
          aria-label="Open menu"
          className="absolute left-3 top-3 z-40 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white text-black shadow-md transition hover:bg-neutral-100 lg:flex"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" />
            <path strokeLinecap="round" d="M9 5v14" />
          </svg>
        </button>
      )}

      {/* Reels collapsible sidebar drawer */}
      {isReels && reelsSidebarOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeReelsSidebar}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 z-10 flex animate-[community-notifications-in_280ms_cubic-bezier(0.22,1,0.36,1)] shadow-[16px_0_42px_rgba(0,0,0,0.25)]">
            <CommunitySidebar
              role={shellRole}
              activeId={sidebarActiveId}
              userName={userName}
              userAvatar={userAvatar}
              hasPosts={hasPosts}
              onCreateClick={() => {
                closeReelsSidebar()
                openCreate()
              }}
              onNotificationsClick={() => {
                closeReelsSidebar()
                openNotifications()
              }}
            />
            <button
              type="button"
              onClick={closeReelsSidebar}
              aria-label="Close sidebar"
              className="absolute right-2 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
          isSaved || isJoinCanvas
            ? ''
            : isReels
              ? 'items-stretch justify-center bg-black px-0 sm:px-2 lg:px-4'
              : 'justify-center px-4 lg:px-8 xl:px-10'
        } ${isJoinCanvas ? 'bg-[#f5f5f5]' : isReels ? 'bg-black' : 'bg-white'}`}
      >
        {isReels ? (
          /* Fullscreen Shorts stage — one reel fills the column */
          <main className="h-full min-h-0 w-full max-w-[460px] overflow-hidden">
            <Outlet context={{ openProfile, openPost, openReelComments }} />
          </main>
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
                <Outlet context={{ openProfile, openPost, openReelComments }} />
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
    </CommunitySocialProvider>
  )
}
