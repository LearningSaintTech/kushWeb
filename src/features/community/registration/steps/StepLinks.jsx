import { useState } from 'react'
import Field, { TextInput } from '../ui/Field'
import Toggle from '../ui/Toggle'

const HUB_META = [
  { key: 'dribbble', label: 'Dribbble' },
  { key: 'behance', label: 'Behance' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'website', label: 'Website' },
]

function GlobeIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </svg>
  )
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function EditLinkModal({
  heading = 'Add Link',
  initialTitle = '',
  initialUrl = '',
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState(initialTitle)
  const [url, setUrl] = useState(initialUrl)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/5 bg-[#1a1a1a] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-link-title"
      >
        <h3 id="edit-link-title" className="font-refer-display text-xl font-semibold text-white">
          {heading}
        </h3>

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Title">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Write Here..."
            />
          </Field>
          <Field label="Link">
            <TextInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </Field>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/15 py-3 font-inter text-sm text-white/70 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!title.trim() || !url.trim()) return
              onSave({ title: title.trim(), url: url.trim() })
            }}
            className="cursor-pointer rounded-xl bg-[#8B5CF6] py-3 font-inter text-sm font-semibold text-white transition hover:bg-[#7c4feb]"
          >
            Save Link
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StepLinks({ data, onChange }) {
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [editingHub, setEditingHub] = useState(null)

  const setHub = (key, patch) => {
    onChange({
      hubs: {
        ...data.hubs,
        [key]: { ...data.hubs[key], ...patch },
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {HUB_META.map(({ key, label }) => {
        const hub = data.hubs[key]
        const displayTitle = hub.title || label
        return (
          <div
            key={key}
            className="flex items-center gap-3 rounded-xl bg-[#1e1e1e] px-3.5 py-3"
          >
            <button
              type="button"
              onClick={() => setEditingHub({ key, label })}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left transition hover:opacity-90"
            >
              <GlobeIcon />
              <div className="min-w-0 flex-1">
                <p className="font-inter text-sm font-medium text-white">{displayTitle}</p>
                <p className="truncate font-inter text-xs text-white/40">
                  {hub.url || 'Add your link'}
                </p>
              </div>
            </button>
            <Toggle
              checked={hub.enabled}
              onChange={(v) => setHub(key, { enabled: v })}
              label={`Enable ${label}`}
            />
          </div>
        )
      })}

      {data.customLinks.map((link) => (
        <div
          key={link.id}
          className="flex items-center gap-3 rounded-xl bg-[#1e1e1e] px-3.5 py-3"
        >
          <GlobeIcon />
          <div className="min-w-0 flex-1">
            <p className="font-inter text-sm font-medium text-white">{link.title}</p>
            <p className="truncate font-inter text-xs text-white/40">{link.url}</p>
          </div>
          <button
            type="button"
            aria-label={`Remove ${link.title}`}
            onClick={() =>
              onChange({
                customLinks: data.customLinks.filter((l) => l.id !== link.id),
              })
            }
            className="cursor-pointer px-2 font-inter text-xs text-white/40 hover:text-white"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setCustomModalOpen(true)}
        className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3.5 font-inter text-sm text-white/55 transition hover:border-white/35 hover:text-white/80"
      >
        <span aria-hidden>+</span> Add custom link
      </button>

      {editingHub ? (
        <EditLinkModal
          heading={`Add ${editingHub.label} Link`}
          initialTitle={data.hubs[editingHub.key]?.title || editingHub.label}
          initialUrl={data.hubs[editingHub.key]?.url || ''}
          onClose={() => setEditingHub(null)}
          onSave={({ title, url }) => {
            setHub(editingHub.key, { title, url, enabled: true })
            setEditingHub(null)
          }}
        />
      ) : null}

      {customModalOpen ? (
        <EditLinkModal
          heading="Add Custom Link"
          onClose={() => setCustomModalOpen(false)}
          onSave={({ title, url }) => {
            onChange({
              customLinks: [...data.customLinks, { id: uid(), title, url }],
            })
            setCustomModalOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
