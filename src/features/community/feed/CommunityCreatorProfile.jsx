import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import CreatorProfileCard from '../creator/profile/CreatorProfileCard'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'
import DesignerDashboard from '../creator/profile/DesignerDashboard'
import { isReelGridItem, navigateToReel, playlistFromGrid } from '../utils/openReel'

/**
 * Creator profile — profile or edit form (left) + dashboard (right).
 */
export default function CommunityCreatorProfile() {
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const [editing, setEditing] = useState(false)
  const [dashMode, setDashMode] = useState('creator')

  const handleOpenMedia = (item, meta = {}) => {
    if (!item) return
    if (isReelGridItem(item, meta.tab)) {
      const seed = item.post
        ? { ...item.post, type: 'reel' }
        : {
            id: item.id,
            type: 'reel',
            image: item.image || '',
            poster: item.image || '',
            video: item.post?.video || item.post?.videoUrl || '',
            videoUrl: item.post?.videoUrl || item.post?.video || '',
          }
      navigateToReel(navigate, {
        reelId: item.id || item.post?.id,
        seed,
        playlist: meta.playlist?.length
          ? meta.playlist
          : playlistFromGrid([item]),
        source: 'profile',
      })
      return
    }
    const detail =
      item.post ||
      (item.id
        ? {
            id: item.id,
            image: item.image || '',
            images: item.image ? [item.image] : [],
            type: item.type || 'post',
            likes: '0',
            likeCount: 0,
            comments: '0',
            commentCount: 0,
            caption: '',
            author: {},
          }
        : null)
    if (detail) openPost?.(detail)
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-6 py-1 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
      <div className="w-full min-w-0 max-w-[440px] mx-auto lg:mx-0 lg:w-[360px] xl:w-[400px] 2xl:w-[430px] lg:max-w-none shrink-0">
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
