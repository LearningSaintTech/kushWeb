import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { MOCK_POSTS } from '../data/mockFeed'
import CreatorProfileCard from '../creator/profile/CreatorProfileCard'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'
import DesignerDashboard from '../creator/profile/DesignerDashboard'

/**
 * Creator profile screen — profile or edit form (center) + dashboard (right).
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
    <div className="mx-auto flex min-h-full w-full max-w-[980px] flex-col items-center justify-start gap-8 py-2 lg:flex-row lg:items-start lg:justify-center lg:gap-8 xl:max-w-[1040px]">
      <div className="mx-auto w-full min-w-0 max-w-[420px] lg:mx-0">
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
      <div className="mx-auto w-full max-w-[420px] shrink-0 lg:mx-0 lg:sticky lg:top-2">
        <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
      </div>
    </div>
  )
}
