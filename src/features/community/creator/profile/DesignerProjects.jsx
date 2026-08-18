import { useMemo, useState } from 'react'
import { PROJECT_CATEGORY_COLORS } from '../../data/mockCreator'

/**
 * Designer projects gallery — slides in beside the portfolio panel.
 */
export default function DesignerProjects({
  projects = [],
  loading = false,
  error = '',
  onRetry,
  onBack,
  onAddProject,
  onEditProject,
  onOpenProject,
  onDeleteProject,
}) {
  const [range] = useState('Last 30 days')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q),
    )
  }, [projects, query])

  return (
    <div className="scrollbar-hide flex h-full w-full flex-col overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="font-inter text-lg font-bold text-black">Projects</h1>
          <button
            type="button"
            className="ml-0.5 inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-[#F3F3F3] px-2.5 py-1 font-inter text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            {range}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        <div className="relative order-last w-full min-w-0 flex-1 sm:order-none sm:max-w-[200px] lg:max-w-[240px]">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border-0 bg-[#F0F0F0] py-2 pl-8 pr-3 font-inter text-xs text-black outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#7C5CFF]/30"
          />
        </div>

        <button
          type="button"
          onClick={onAddProject}
          className="ml-auto shrink-0 cursor-pointer rounded-xl bg-[#7C5CFF] px-3 py-2 font-inter text-xs font-semibold text-white transition hover:bg-[#6d4ef0] sm:text-sm"
        >
          + Add Project
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center">
          <p className="font-inter text-sm text-red-700">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 cursor-pointer font-inter text-xs font-semibold text-red-800 underline"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center font-inter text-sm text-neutral-500">Loading projects…</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
          {filtered.map((project) => {
            const catClass =
              PROJECT_CATEGORY_COLORS[project.category] || 'text-[#7C5CFF]'
            return (
              <article
                key={project.id}
                role={onOpenProject ? 'button' : undefined}
                tabIndex={onOpenProject ? 0 : undefined}
                onClick={() => onOpenProject?.(project)}
                onKeyDown={(e) => {
                  if (!onOpenProject) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenProject(project)
                  }
                }}
                className={`group relative overflow-hidden rounded-2xl bg-neutral-200 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                  onOpenProject ? 'cursor-pointer' : ''
                }`}
              >
                <div className={`aspect-[4/5] ${project.style || 'bg-neutral-300'}`}>
                  {project.image ? (
                    <img
                      src={project.image}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                {project.status ? (
                  <span className="absolute left-2 top-2 z-10 rounded-lg bg-black/55 px-2 py-1 font-inter text-[10px] font-semibold capitalize text-white backdrop-blur-sm">
                    {project.status}
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-inter text-xs font-bold text-white sm:text-sm">
                        {project.title}
                      </h2>
                      <p
                        className={`mt-0.5 font-inter text-[9px] font-bold uppercase tracking-[0.12em] ${catClass}`}
                      >
                        {project.category}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 font-inter text-[11px] font-medium text-white/90">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {project.views}
                    </span>
                  </div>
                </div>

                {(onEditProject || onDeleteProject) ? (
                  <div className="absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    {onEditProject ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditProject(project)
                        }}
                        className="cursor-pointer rounded-lg bg-black/55 px-2 py-1 font-inter text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/75"
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDeleteProject ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteProject(project)
                        }}
                        className="cursor-pointer rounded-lg bg-black/55 px-2 py-1 font-inter text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-red-600/90"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 ? (
        <p className="mt-16 text-center font-inter text-sm text-neutral-500">
          {projects.length === 0
            ? 'No projects yet. Add your first project.'
            : 'No projects match your search.'}
        </p>
      ) : null}
    </div>
  )
}
