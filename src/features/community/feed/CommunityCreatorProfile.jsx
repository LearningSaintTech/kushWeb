import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommunityFeedUi } from '../context/CommunityFeedUiContext'
import CreatorProfileCard from '../creator/profile/CreatorProfileCard'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'
import DesignerDashboard from '../creator/profile/DesignerDashboard'
import { openCommunityMedia, playlistFromGrid } from '../utils/openReel'

/**
 * Creator profile — profile or edit form (left) + dashboard (right).
 */
export default function CommunityCreatorProfile(props) {
  const navigate = useNavigate()
  const outletCtx = useCommunityFeedUi()
  const openPost = props.openPost || outletCtx.openPost
  const [editing, setEditing] = useState(false)
  const [dashMode, setDashMode] = useState('creator')

  const handleOpenMedia = (item, meta = {}) => {
    openCommunityMedia({
      item,
      tab: meta.tab,
      playlist: meta.playlist?.length
        ? meta.playlist
        : playlistFromGrid([item]),
      navigate,
      openPost,
      source: 'profile',
    })
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-6 py-1 lg:flex-row lg:items-start lg:gap-8 xl:gap-10 2xl:gap-12">
      <div className="w-full min-w-0 max-w-[440px] mx-auto lg:mx-0 lg:w-[360px] xl:w-[410px] 2xl:w-[460px] lg:max-w-none shrink-0">
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
      <div className="min-w-0 flex-1 w-full lg:sticky lg:top-2">
        <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
      </div>
    </div>
  )
}
