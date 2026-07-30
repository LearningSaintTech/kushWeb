import Field, { TextInput, TextArea } from '../ui/Field'

export default function StepBio({ data, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Tagline">
        <TextInput
          value={data.tags}
          onChange={(e) => onChange({ tags: e.target.value.slice(0, 80) })}
          placeholder="Quiet luxury, loud craft"
          maxLength={80}
        />
        <p className="mt-1.5 text-right font-inter text-[11px] text-white/35">
          {(data.tags || '').length}/80
        </p>
      </Field>

      <Field label="Bio">
        <TextArea
          rows={5}
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, 300) })}
          placeholder="Tell the community who you are and what you create…"
        />
        <p className="mt-1.5 text-right font-inter text-[11px] text-white/35">
          {data.bio.length}/300
        </p>
      </Field>
    </div>
  )
}
