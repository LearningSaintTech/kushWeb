export default function Field({
  label,
  children,
  className = '',
  labelRight = null,
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between font-inter text-[11px] font-medium uppercase tracking-wide text-white/45">
        <span>{label}</span>
        {labelRight}
      </span>
      {children}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-transparent bg-[#2a2a2a] px-3.5 py-3 font-inter text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#8B5CF6] ${className}`}
    />
  )
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-transparent bg-[#2a2a2a] px-3.5 py-3 font-inter text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#8B5CF6] ${className}`}
    />
  )
}

export function SelectInput({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-xl border border-transparent bg-[#2a2a2a] px-3.5 py-3 pr-9 font-inter text-sm text-white outline-none transition focus:border-[#8B5CF6] ${className}`}
        style={{ colorScheme: 'dark', ...(props.style || {}) }}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden>
        ▾
      </span>
    </div>
  )
}
