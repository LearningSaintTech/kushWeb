/** Chip for BOGO / bind-offer on product cards and PDP. */
export default function BindOfferBadge({ text, className = "" }) {
  if (!text) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-sm bg-violet-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/80 sm:text-[10px] ${className}`.trim()}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
