import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import DesignerProfileCard from '../creator/profile/DesignerProfileCard'
import DesignerPortfolio from '../creator/profile/DesignerPortfolio'
import DesignerDashboard from '../creator/profile/DesignerDashboard'
import DesignerProjects from '../creator/profile/DesignerProjects'
import AddProjectModal from '../creator/profile/AddProjectModal'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'
import { isReelGridItem, navigateToReel, playlistFromGrid } from '../utils/openReel'
import {
  communityService,
  extractProjectsList,
  getCommunityErrorMessage,
  unwrapProject,
} from '../../../services/community.service.js'
import { uploadCommunityFile } from '../../../services/communityUpload.service.js'

/**
 * Build POST/PATCH body per FRONTEND_INTEGRATION §13:
 * categories[], tools[], cover { key, mimeType }, optional images[]
 */
function buildProjectBody(payload, cover) {
  const categories = Array.isArray(payload.categories)
    ? payload.categories.filter(Boolean)
    : payload.category
      ? [payload.category]
      : []

  const body = {
    title: payload.title,
    description: payload.description || '',
    categories: categories.slice(0, 10),
    tools: (Array.isArray(payload.tools) ? payload.tools : []).slice(0, 20),
  }

  if (cover?.key) {
    body.cover = {
      key: cover.key,
      mimeType: cover.mimeType || 'image/jpeg',
    }
  }

  if (Array.isArray(payload.images) && payload.images.length) {
    body.images = payload.images
      .filter((img) => img?.key)
      .slice(0, 20)
      .map((img) => ({
        key: img.key,
        mimeType: img.mimeType || 'image/jpeg',
      }))
  }

  return body
}

/**
 * Designer profile — portfolio stays; View Projects slides in from the right.
 */
export default function CommunityDesignerProfile() {
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editing, setEditing] = useState(false)
  const [dashMode, setDashMode] = useState('designer')
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError('')
    try {
      const data = await communityService.getMyProjects({ status: 'all', limit: 20 })
      setProjects(extractProjectsList(data))
    } catch (err) {
      setProjectsError(getCommunityErrorMessage(err, 'Could not load projects.'))
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showPortfolio && showProjects) {
      loadProjects()
    }
  }, [showPortfolio, showProjects, loadProjects])

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

  const handleSaveProject = async (payload, { onProgress } = {}) => {
    let cover = payload.existingCover || null
    let uploadedPublicUrl = null

    if (payload.file) {
      const uploaded = await uploadCommunityFile(payload.file, {
        purpose: 'project',
        onProgress,
      })
      cover = {
        key: uploaded.key,
        mimeType: uploaded.mimeType || payload.file.type || 'image/jpeg',
      }
      uploadedPublicUrl = uploaded.publicUrl || null
    }

    if (!payload.id && !cover?.key) {
      throw new Error('Add a cover image.')
    }

    const body = buildProjectBody(payload, cover)
    let mapped

    if (payload.id) {
      const data = await communityService.updateMyProject(payload.id, body)
      mapped = unwrapProject(data)
    } else {
      const data = await communityService.createProject(body)
      mapped = unwrapProject(data)
    }

    if (!mapped) {
      const category =
        (Array.isArray(payload.categories) && payload.categories[0]) ||
        payload.category ||
        'Fashion'
      mapped = {
        id: payload.id || `proj-${Date.now()}`,
        title: payload.title,
        category,
        categories: body.categories,
        description: payload.description,
        tools: payload.tools,
        status: 'pending',
        image: uploadedPublicUrl || payload.imagePreview || payload.existingImage || '',
        heroImageKey: cover?.key || null,
        views: '0',
        viewCount: 0,
        style:
          'bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]',
      }
    } else if (!mapped.image && (uploadedPublicUrl || payload.imagePreview || payload.existingImage)) {
      mapped = {
        ...mapped,
        image: uploadedPublicUrl || payload.imagePreview || payload.existingImage,
      }
    }

    setProjects((prev) => {
      const without = prev.filter((p) => p.id !== mapped.id)
      return [mapped, ...without]
    })
  }

  const handleDeleteProject = async (project) => {
    if (!project?.id) return
    const ok = window.confirm(`Delete “${project.title}”? This cannot be undone.`)
    if (!ok) return
    try {
      await communityService.deleteMyProject(project.id)
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      window.alert(getCommunityErrorMessage(err, 'Could not delete project.'))
    }
  }

  const handleClosePortfolio = () => {
    setShowProjects(false)
    setShowPortfolio(false)
    setAddOpen(false)
    setEditingProject(null)
  }

  const openAdd = () => {
    setEditingProject(null)
    setAddOpen(true)
  }

  /** GET /community/projects/me/:projectId then open edit modal */
  const openEdit = async (project) => {
    if (!project?.id) return
    setEditingProject(project)
    setAddOpen(true)
    try {
      const data = await communityService.getMyProject(project.id)
      const mapped = unwrapProject(data)
      if (mapped) {
        setEditingProject(mapped)
        setProjects((prev) =>
          prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p)),
        )
      }
    } catch {
      // Keep list row data so the modal still works if detail fetch fails
    }
  }

  if (showPortfolio) {
    return (
      <>
        <div className="flex w-full flex-col items-stretch gap-4 lg:min-h-[640px] lg:flex-row lg:gap-5">
          <div className="w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-black shadow-[0_8px_32px_rgba(0,0,0,0.12)] lg:w-[360px]">
            <DesignerPortfolio
              onBack={handleClosePortfolio}
              onViewProjects={() => setShowProjects(true)}
            />
          </div>

          <div className="relative min-h-[520px] min-w-0 flex-1 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <div
              className={`scrollbar-hide absolute inset-0 overflow-y-auto px-4 py-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 lg:px-6 lg:py-6 ${
                showProjects
                  ? 'pointer-events-none -translate-x-8 opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}
            >
              <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
            </div>

            <div
              className={`scrollbar-hide absolute inset-0 overflow-y-auto bg-white px-3 py-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 lg:px-5 lg:py-5 ${
                showProjects
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-full opacity-0'
              }`}
            >
              <DesignerProjects
                projects={projects}
                loading={projectsLoading}
                error={projectsError}
                onRetry={loadProjects}
                onBack={() => setShowProjects(false)}
                onAddProject={openAdd}
                onEditProject={openEdit}
                onOpenProject={openEdit}
                onDeleteProject={handleDeleteProject}
              />
            </div>
          </div>
        </div>

        <AddProjectModal
          open={addOpen}
          project={editingProject}
          onClose={() => {
            setAddOpen(false)
            setEditingProject(null)
          }}
          onSave={handleSaveProject}
        />
      </>
    )
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
          <DesignerProfileCard
            onOpenMedia={handleOpenMedia}
            onViewPortfolio={() => setShowPortfolio(true)}
            onEditProfile={() => setEditing(true)}
            onAvatarChange={() => setEditing(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1 lg:sticky lg:top-2 lg:max-w-[520px]">
        <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
      </div>
    </div>
  )
}
