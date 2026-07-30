export default function Field({ label, children, hint = null, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block font-inter text-[11px] font-bold uppercase tracking-[0.08em] text-black">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block font-inter text-xs text-neutral-400">{hint}</span>
      ) : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black ${className}`}
    />
  )
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black ${className}`}
    />
  )
}

export function SelectInput({ className = '', children, value = '', ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        value={value}
        className={`w-full appearance-none rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 pr-10 font-inter text-sm outline-none transition focus:border-black ${
          value ? 'text-black' : 'text-neutral-400'
        } ${className}`}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </span>
    </div>
  )
}
