import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { DESIGNER_PROJECTS } from '../data/mockCreator'
import DesignerProfileCard from '../creator/profile/DesignerProfileCard'
import DesignerPortfolio from '../creator/profile/DesignerPortfolio'
import DesignerDashboard from '../creator/profile/DesignerDashboard'
import DesignerProjects from '../creator/profile/DesignerProjects'
import AddProjectModal from '../creator/profile/AddProjectModal'
import CreatorEditProfile from '../creator/profile/CreatorEditProfile'

/**
 * Designer profile — portfolio stays; View Projects slides in from the right.
 * Layout hugs the sidebar on large screens (matches mock).
 */
export default function CommunityDesignerProfile() {
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [dashMode, setDashMode] = useState('designer')
  const [projects, setProjects] = useState(DESIGNER_PROJECTS)

  const handleOpenMedia = (item) => {
    if (item?.type === 'reel') {
      navigate(ROUTES.COMMUNITY_REELS)
      return
    }
    if (item?.post) openPost?.(item.post)
  }

  const handleSaveProject = (payload) => {
    const id = `proj-${Date.now()}`
    setProjects((prev) => [
      {
        id,
        title: payload.title,
        category: payload.category,
        views: '0',
        image: payload.image,
        style:
          'bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]',
        description: payload.description,
        tools: payload.tools,
        status: payload.status,
      },
      ...prev,
    ])
  }

  const handleClosePortfolio = () => {
    setShowProjects(false)
    setShowPortfolio(false)
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
                onBack={() => setShowProjects(false)}
                onAddProject={() => setAddOpen(true)}
              />
            </div>
          </div>
        </div>

        <AddProjectModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
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
