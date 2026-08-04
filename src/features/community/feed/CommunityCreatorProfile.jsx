import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { MOCK_POSTS } from '../data/mockFeed'
import CreatorProfileCard from '../creator/profile/CreatorProfileCard'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'
import DesignerDashboard from '../creator/profile/DesignerDashboard'

/**
 * Creator profile — profile or edit form (left) + dashboard (right).
 * Hugs the sidebar on large screens (matches mock spacing).
 */
export default function CommunityCreatorProfile() {
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const [editing, setEditing] = useState(false)
  const [dashMode, setDashMode] = useState('creator')

  const handleOpenMedia = (item) => {
    if (item.type === 'reel') {
      navigate(ROUTES.COMMUNITY_REELS)
      return
    }
    openPost?.(MOCK_POSTS[0])
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-5 py-1 lg:flex-row lg:items-start lg:gap-6 xl:gap-7">
      <div className="w-full min-w-0 max-w-[380px] shrink-0">
        {editing ? (
          <CreatorEditProfile
            onBack={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        ) : (
          <CreatorProfileCard
            onOpenMedia={handleOpenMedia}
            onEditProfile={() => setEditing(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 lg:sticky lg:top-2 lg:max-w-[520px]">
        <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
      </div>
    </div>
  )
}
