import Field, { TextInput } from '../ui/Field'
import Toggle from '../ui/Toggle'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyEducation() {
  return {
    id: uid(),
    degree: '',
    institution: '',
    field: '',
    dateRange: '',
    currentlyStudying: false,
  }
}

export default function StepEducation({ data, onChange }) {
  const items = data.education

  const updateItem = (id, patch) => {
    onChange({
      education: items.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {items.map((item, index) => (
        <div key={item.id} className={index > 0 ? 'border-t border-white/10 pt-5' : ''}>
          {index > 0 ? (
            <p className="mb-3 font-inter text-xs uppercase tracking-wide text-white/35">
              Education {index + 1}
            </p>
          ) : null}

          <div className="flex flex-col gap-3.5">
            <Field label="Degree / Qualification">
              <TextInput
                value={item.degree}
                onChange={(e) => updateItem(item.id, { degree: e.target.value })}
                placeholder="Bachelor of Science"
              />
            </Field>

            <Field label="Institution / University">
              <TextInput
                value={item.institution}
                onChange={(e) => updateItem(item.id, { institution: e.target.value })}
                placeholder="Harvard University"
              />
            </Field>

            <Field label="Field of Study">
              <TextInput
                value={item.field}
                onChange={(e) => updateItem(item.id, { field: e.target.value })}
                placeholder="Computer Science"
              />
            </Field>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <Field label="Date Range" className="flex-1">
                <TextInput
                  value={item.dateRange}
                  onChange={(e) => updateItem(item.id, { dateRange: e.target.value })}
                  placeholder="2020 — 2024"
                />
              </Field>
              <div className="flex items-center gap-2.5 pb-1">
                <Toggle
                  checked={item.currentlyStudying}
                  onChange={(v) => updateItem(item.id, { currentlyStudying: v })}
                  label="I currently study here"
                />
                <span className="font-inter text-xs text-white/50">I currently study here</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange({ education: [...items, emptyEducation()] })}
        className="inline-flex cursor-pointer items-center gap-1.5 self-start font-inter text-sm font-medium text-[#8B5CF6] transition hover:text-[#a78bfa]"
      >
        <span aria-hidden>+</span> Add another education
      </button>
    </div>
  )
}
