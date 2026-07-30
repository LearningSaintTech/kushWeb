import Field, { TextArea, TextInput } from '../ui/Field'

const BIO_MAX = 160

export default function StepAbout({ data, onChange }) {
  const bio = data.bio || ''

  return (
    <div className="space-y-5">
      <Field label="Bio">
        <TextArea
          value={bio}
          onChange={(e) => onChange({ bio: e.target.value.slice(0, BIO_MAX) })}
          placeholder="Tell people about yourself..."
          rows={4}
        />
        <span className="mt-1.5 block text-right font-inter text-xs text-neutral-400">
          {bio.length} / {BIO_MAX}
        </span>
      </Field>

      <Field label="Website">
        <TextInput
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="yourwebsite.com"
          inputMode="url"
          autoComplete="url"
        />
      </Field>
    </div>
  )
}
