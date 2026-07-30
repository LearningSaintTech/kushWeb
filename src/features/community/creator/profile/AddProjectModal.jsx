import { useEffect, useId, useRef, useState } from 'react'
import { PROJECT_CATEGORIES } from '../../data/mockCreator'

const STATUSES = [
  { id: 'published', label: 'Published' },
  { id: 'pending', label: 'Pending' },
  { id: 'draft', label: 'Draft' },
]

const DEFAULT_TOOLS = ['Figma', 'After Effects', 'Spline']

/**
 * Add / edit project modal.
 */
export default function AddProjectModal({ open, onClose, onSave }) {
  const titleId = useId()
  const fileRef = useRef(null)
  const [title, setTitle] = useState('EcoFlow Dashboard')
  const [category, setCategory] = useState('UI/UX Design')
  const [description, setDescription] = useState(
    'A comprehensive redesign of a renewable energy monitoring platform. Focusing on accessibility and real-time data visualization through intuitive 3D components...',
  )
  const [tools, setTools] = useState(DEFAULT_TOOLS)
  const [status, setStatus] = useState('published')
  const [heroPreview, setHeroPreview] = useState(null)
  const [toolDraft, setToolDraft] = useState('')
  const [addingTool, setAddingTool] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      if (heroPreview) URL.revokeObjectURL(heroPreview)
    }
  }, [heroPreview])

  if (!open) return null

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (heroPreview) URL.revokeObjectURL(heroPreview)
    setHeroPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const addTool = () => {
    const next = toolDraft.trim()
    if (!next) {
      setAddingTool(false)
      return
    }
    if (!tools.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setTools((prev) => [...prev, next])
    }
    setToolDraft('')
    setAddingTool(false)
  }

  const handleSave = () => {
    onSave?.({
      title: title.trim() || 'Untitled Project',
      category,
      description: description.trim(),
      tools,
      status,
      image: heroPreview,
    })
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 transition-opacity"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="scrollbar-hide absolute inset-y-0 left-0 z-10 flex w-full max-w-[420px] flex-col overflow-y-auto bg-white p-5 shadow-[16px_0_42px_rgba(0,0,0,0.12)] animate-[community-notifications-in_300ms_cubic-bezier(0.22,1,0.36,1)] sm:p-6"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-xl bg-[#7C5CFF] px-3.5 py-2 font-inter text-sm font-semibold text-white transition hover:bg-[#6d4ef0]"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3.5 py-2 font-inter text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2 id={titleId} className="sr-only">
          Add project
        </h2>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative mt-5 flex min-h-[168px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-[#FAFAFA] px-4 py-8 text-center"
        >
          {heroPreview ? (
            <img src={heroPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className={`relative z-10 ${heroPreview ? 'rounded-xl bg-black/45 px-4 py-3 text-white' : ''}`}>
            <span
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${
                heroPreview ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
              </svg>
            </span>
            <p className={`mt-3 font-inter text-sm font-semibold ${heroPreview ? 'text-white' : 'text-neutral-800'}`}>
              Drag and drop your hero image
            </p>
            <p className={`mt-1 font-inter text-xs ${heroPreview ? 'text-white/75' : 'text-neutral-400'}`}>
              High resolution PNG or JPG (min 1200x800)
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`mt-3 cursor-pointer rounded-lg border px-3.5 py-1.5 font-inter text-xs font-semibold transition ${
                heroPreview
                  ? 'border-white/40 bg-white/15 text-white hover:bg-white/25'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Select File
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <label className="mt-5 block">
          <span className="font-inter text-sm font-semibold text-black">Project Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 font-inter text-sm text-black outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
          />
        </label>

        <label className="mt-4 block">
          <span className="font-inter text-sm font-semibold text-black">Category</span>
          <div className="relative mt-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 pr-9 font-inter text-sm text-black outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
            >
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </label>

        <label className="mt-4 block">
          <span className="font-inter text-sm font-semibold text-black">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 font-inter text-sm leading-relaxed text-black outline-none focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/20"
          />
        </label>

        <div className="mt-4">
          <p className="font-inter text-sm font-semibold text-black">Tools Used</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {tools.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setTools((prev) => prev.filter((t) => t !== tool))}
                className="cursor-pointer rounded-full border border-neutral-200 bg-[#F5F5F5] px-3 py-1.5 font-inter text-[11px] font-bold uppercase tracking-wide text-neutral-700 transition hover:border-neutral-300"
                title="Remove"
              >
                {tool}
              </button>
            ))}
            {addingTool ? (
              <input
                autoFocus
                value={toolDraft}
                onChange={(e) => setToolDraft(e.target.value)}
                onBlur={addTool}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTool()
                  }
                  if (e.key === 'Escape') {
                    setToolDraft('')
                    setAddingTool(false)
                  }
                }}
                placeholder="Tool name"
                className="w-28 rounded-full border border-[#7C5CFF] px-3 py-1.5 font-inter text-xs outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTool(true)}
                className="cursor-pointer rounded-full border border-dashed border-neutral-300 bg-white px-3 py-1.5 font-inter text-[11px] font-semibold text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
              >
                + Add
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="font-inter text-sm font-semibold text-black">Visibility</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {STATUSES.map((item) => {
              const active = status === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id)}
                  className={`cursor-pointer rounded-xl border px-3.5 py-2 font-inter text-sm font-medium transition ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
