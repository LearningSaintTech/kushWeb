export default function FeedFilters({ filters, active, onChange }) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
      {filters.map((filter) => {
        const isActive = filter === active
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange?.(filter)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-1 font-inter text-sm transition ${
              isActive
                ? 'bg-[#1B2B1F] font-medium text-white'
                : 'bg-neutral-100 font-normal text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {filter}
          </button>
        )
      })}
    </div>
  )
}
