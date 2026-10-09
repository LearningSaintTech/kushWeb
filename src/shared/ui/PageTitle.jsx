/** Shared heading for account / profile-panel pages so they all look the same. */
export default function PageTitle({ children, className = '' }) {
  return (
    <h1 className={`font-inter text-2xl font-bold uppercase tracking-wider text-black sm:text-3xl ${className}`}>
      {children}
    </h1>
  )
}
