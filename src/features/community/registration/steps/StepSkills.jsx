import { TextInput } from '../ui/Field'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function StepSkills({ data, onChange }) {
  const skills = data.skills

  const updateSkill = (id, patch) => {
    onChange({
      skills: skills.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const bump = (id, delta) => {
    const skill = skills.find((s) => s.id === id)
    if (!skill) return
    const next = Math.min(100, Math.max(0, skill.level + delta))
    updateSkill(id, { level: next })
  }

  return (
    <div className="flex flex-col gap-4">
      {skills.map((skill) => (
        <div key={skill.id} className="rounded-xl  p-3">
          <div className="flex items-center gap-1">
            <TextInput
              value={skill.name}
              onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
              placeholder="Skill name"
              className="flex-1 !bg-[#2a2a2a]"
            />
            <span className="w-12 shrink-0 text-center font-inter text-sm text-white/80">
              {skill.level}%
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => bump(skill.id, -5)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#2a2a2a] text-white/70 transition hover:bg-[#333] hover:text-white"
              >
                −
              </button>
              <button
                type="button"
                aria-label="Increase"
                onClick={() => bump(skill.id, 5)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#2a2a2a] text-white/70 transition hover:bg-[#333] hover:text-white"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#8B5CF6] transition-all"
              style={{ width: `${skill.level}%` }}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange({
            skills: [...skills, { id: uid(), name: '', level: 50 }],
          })
        }
        className="inline-flex cursor-pointer items-center gap-1.5 self-start font-inter text-sm font-medium text-[#8B5CF6] transition hover:text-[#a78bfa]"
      >
        <span aria-hidden>+</span> Add new skill
      </button>
    </div>
  )
}
