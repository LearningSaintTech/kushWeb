import Field, { TextInput } from '../ui/Field'

export default function StepBasicInfo({ data, onChange }) {
  const username = String(data.username || '').replace(/^@/, '')

  return (
    <div className="space-y-5">
      <Field label="Name">
        <TextInput
          value={data.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Your full name"
          autoComplete="name"
        />
      </Field>

      <Field label="Username" hint="This name will be visible to everyone.">
        <div className="flex items-center overflow-hidden rounded-2xl border border-black bg-white transition focus-within:border-black">
          <span
            className="select-none pl-4 font-inter text-sm text-neutral-400"
            aria-hidden
          >
            @
          </span>
          <TextInput
            value={username}
            onChange={(e) =>
              onChange({
                username: e.target.value
                  .replace(/^@/, '')
                  .replace(/\s/g, '')
                  .slice(0, 30),
              })
            }
            placeholder="username"
            autoComplete="username"
            maxLength={30}
            className="rounded-none border-0 bg-transparent pl-1 focus:border-transparent"
          />
        </div>
      </Field>
    </div>
  )
}
