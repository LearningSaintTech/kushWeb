import Field, { TextInput, SelectInput } from '../ui/Field'

const LOCATIONS = [
  'San Francisco, CA',
  'New York, NY',
  'Los Angeles, CA',
  'London, UK',
  'Mumbai, India',
  'Delhi, India',
  'Bengaluru, India',
  'Other',
]

const USERNAME_MAX = 20

export default function StepEssentials({ data, onChange }) {
  const username = data.username.replace(/^@/, '')
  const displayUsername = username ? `@${username}` : ''

  return (
    <div className="flex flex-col gap-4">
      <Field label="Full Name">
        <TextInput
          value={data.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Alex Riverton"
          autoComplete="name"
        />
      </Field>

      <Field
        label="Username"
        labelRight={
          <span className="normal-case tracking-normal text-white/35">
            {username.length}/{USERNAME_MAX}
          </span>
        }
      >
        <TextInput
          value={displayUsername}
          onChange={(e) => {
            const raw = e.target.value.replace(/^@/, '').slice(0, USERNAME_MAX)
            onChange({ username: raw })
          }}
          placeholder="@ariverton_ui"
          autoComplete="username"
          maxLength={USERNAME_MAX + 1}
        />
      </Field>

      <Field label="Location">
        <SelectInput
          value={data.location || ''}
          onChange={(e) => onChange({ location: e.target.value })}
        >
          <option value="" disabled>
            Select location
          </option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </SelectInput>
      </Field>
    </div>
  )
}
