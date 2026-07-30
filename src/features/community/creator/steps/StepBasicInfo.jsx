import Field, { TextInput } from '../ui/Field'

export default function StepBasicInfo({ data, onChange }) {
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
        <TextInput
          value={data.username}
          onChange={(e) =>
            onChange({
              username: e.target.value.replace(/^@/, '').replace(/\s/g, '').slice(0, 30),
            })
          }
          placeholder="@username"
          autoComplete="username"
          maxLength={30}
          className="border-black"
        />
      </Field>
    </div>
  )
}
