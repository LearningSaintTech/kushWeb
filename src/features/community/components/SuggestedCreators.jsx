const ROLE_CLASS = {
  designer: 'text-[#8B5CF6]',
  creator: 'text-neutral-400',
}

export default function SuggestedCreators({ creators = [], onSeeAll }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h3 className="font-inter text-sm font-semibold text-black">
          Suggested Creators
        </h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="cursor-pointer font-inter text-sm font-medium text-neutral-500 transition hover:text-black"
        >
          See All
        </button>
      </div>

      <ul className="mt-4 space-y-4">
        {creators.map((person) => (
          <li key={person.id} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
              {person.avatar ? (
                <img src={person.avatar} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-inter text-sm font-semibold text-black">
                {person.name}
              </p>
              <p
                className={`font-inter text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  ROLE_CLASS[person.roleTone] ?? 'text-neutral-400'
                }`}
              >
                {person.role}
              </p>
            </div>
            <button
              type="button"
              className="cursor-pointer font-inter text-sm font-semibold text-[#2563EB] transition hover:opacity-80"
            >
              Follow
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
