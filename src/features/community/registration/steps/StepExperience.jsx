import Field, { TextInput, TextArea, SelectInput } from '../ui/Field'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const YEARS = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i))

function emptyRole() {
  return {
    id: uid(),
    jobTitle: '',
    company: '',
    startYear: '',
    endYear: '',
    description: '',
  }
}

export default function StepExperience({ data, onChange }) {
  const roles = data.experience

  const updateRole = (id, patch) => {
    onChange({
      experience: roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {roles.map((role, index) => (
        <div key={role.id} className={index > 0 ? 'border-t border-white/10 pt-5' : ''}>
          {index > 0 ? (
            <p className="mb-3 font-inter text-xs uppercase tracking-wide text-white/35">
              Role {index + 1}
            </p>
          ) : null}

          <div className="flex flex-col gap-3.5">
            <Field label="Job Title">
              <TextInput
                value={role.jobTitle}
                onChange={(e) => updateRole(role.id, { jobTitle: e.target.value })}
                placeholder="Product Designer"
              />
            </Field>

            <Field label="Company">
              <TextInput
                value={role.company}
                onChange={(e) => updateRole(role.id, { company: e.target.value })}
                placeholder="Folio Studio"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Year">
                <SelectInput
                  value={role.startYear}
                  onChange={(e) => updateRole(role.id, { startYear: e.target.value })}
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="End Year">
                <SelectInput
                  value={role.endYear}
                  onChange={(e) => updateRole(role.id, { endYear: e.target.value })}
                >
                  <option value="">Year / Present</option>
                  <option value="Present">Present</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field label="Description">
              <TextArea
                rows={3}
                value={role.description}
                onChange={(e) => updateRole(role.id, { description: e.target.value })}
                placeholder="What did you work on?"
              />
            </Field>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange({ experience: [...roles, emptyRole()] })}
        className="inline-flex cursor-pointer items-center gap-1.5 self-start font-inter text-sm font-medium text-[#8B5CF6] transition hover:text-[#a78bfa]"
      >
        <span aria-hidden>+</span> Add another role
      </button>
    </div>
  )
}
