import Field, { TextInput } from '../ui/Field'

/** Suggestions only — designers can type any location. */
const LOCATION_SUGGESTIONS = [
  'San Francisco, CA',
  'New York, NY',
  'Los Angeles, CA',
  'London, UK',
  'Mumbai, India',
  'Delhi, India',
  'Bengaluru, India',
]

const LOCATION_MAX = 80

const USERNAME_MAX = 20

export default function StepEssentials({ data, onChange }) {
  const username = String(data.username || '').replace(/^@/, '')

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
        <div className="flex items-center overflow-hidden rounded-xl border border-transparent bg-[#2a2a2a] transition focus-within:border-[#8B5CF6]">
          <span
            className="select-none pl-3.5 font-inter text-sm text-white/35"
            aria-hidden
          >
            @
          </span>
          <TextInput
            value={username}
            onChange={(e) => {
              const raw = e.target.value
                .replace(/^@/, '')
                .replace(/\s/g, '')
                .slice(0, USERNAME_MAX)
              onChange({ username: raw })
            }}
            placeholder="username"
            autoComplete="username"
            maxLength={USERNAME_MAX}
            className="rounded-none border-0 bg-transparent pl-0.5 focus:border-transparent"
          />
        </div>
      </Field>

      <Field label="Location">
        <TextInput
          value={data.location || ''}
          onChange={(e) => onChange({ location: e.target.value.slice(0, LOCATION_MAX) })}
          placeholder="City, Country"
          autoComplete="address-level2"
          maxLength={LOCATION_MAX}
          list="designer-location-suggestions"
        />
        <datalist id="designer-location-suggestions">
          {LOCATION_SUGGESTIONS.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </Field>
    </div>
  )
}
