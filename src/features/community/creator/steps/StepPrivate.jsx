import Field, { SelectInput, TextInput } from '../ui/Field'

export default function StepPrivate({ data, onChange }) {
  return (
    <div className="space-y-5">
      <Field label="Email">
        <TextInput
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="your@email.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Phone">
        <TextInput
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+1 (555) 000-0000"
          autoComplete="tel"
        />
      </Field>

      <Field label="Gender">
        <SelectInput
          value={data.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
        >
          <option value="">Select gender</option>
          <option value="prefer-not">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="trans">Trans</option>
        </SelectInput>
      </Field>

      <p className="flex items-center gap-1.5 font-inter text-xs text-neutral-400">
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        This info won&apos;t be shown publicly.
      </p>
    </div>
  )
}
