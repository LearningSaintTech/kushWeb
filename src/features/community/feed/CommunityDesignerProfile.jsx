import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { MOCK_POSTS } from '../data/mockFeed'
import { DESIGNER_PROJECTS } from '../data/mockCreator'
import DesignerProfileCard from '../creator/profile/DesignerProfileCard'
import DesignerPortfolio from '../creator/profile/DesignerPortfolio'
import DesignerDashboard from '../creator/profile/DesignerDashboard'
import DesignerProjects from '../creator/profile/DesignerProjects'
import AddProjectModal from '../creator/profile/AddProjectModal'

/**
 * Designer profile — portfolio stays; View Projects slides in from the right.
 * Add Project opens a left→right slide panel.
 */
export default function CommunityDesignerProfile() {
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [dashMode, setDashMode] = useState('designer')
  const [projects, setProjects] = useState(DESIGNER_PROJECTS)

  const handleOpenMedia = (item) => {
    if (item.type === 'reel') {
      navigate(ROUTES.COMMUNITY_REELS)
      return
    }
    openPost?.(MOCK_POSTS[0])
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
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-stretch gap-4 lg:min-h-[640px] lg:flex-row lg:gap-5">
          <div className="w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-black shadow-[0_8px_32px_rgba(0,0,0,0.12)] lg:w-[360px]">
            <DesignerPortfolio
              onBack={handleClosePortfolio}
              onViewProjects={() => setShowProjects(true)}
            />
          </div>

          <div className="relative min-h-[520px] min-w-0 flex-1 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            {/* Dashboard — slides out left when projects open */}
            <div
              className={`scrollbar-hide absolute inset-0 overflow-y-auto px-4 py-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 lg:px-6 lg:py-6 ${
                showProjects
                  ? 'pointer-events-none -translate-x-8 opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}
            >
              <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
            </div>

            {/* Projects — slides in from the right */}
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
    <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8 py-2 lg:flex-row lg:items-start lg:justify-center lg:gap-8 xl:max-w-[1040px]">
      <div className="mx-auto w-full min-w-0 max-w-[420px] lg:mx-0">
        <DesignerProfileCard
          onOpenMedia={handleOpenMedia}
          onViewPortfolio={() => setShowPortfolio(true)}
        />
      </div>
      <div className="mx-auto w-full max-w-[420px] shrink-0 lg:mx-0 lg:sticky lg:top-2">
        <DesignerDashboard mode={dashMode} onModeChange={setDashMode} />
      </div>
    </div>
  )
}
