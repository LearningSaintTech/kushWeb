import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MOCK_SEARCH_RESULTS, SEARCH_FILTERS } from '../data/mockFeed'

function SearchResultCard({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-4 block w-full break-inside-avoid cursor-pointer text-left"
    >
      <div className={`overflow-hidden rounded-2xl bg-neutral-100 ${item.aspect}`}>
        <img
          src={item.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
        />
      </div>
      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-neutral-200">
          {item.avatar ? (
            <img src={item.avatar} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <p className="min-w-0 flex-1 truncate font-inter text-sm font-medium text-black">
          {item.userName}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 font-inter text-xs text-neutral-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {item.likes}
        </span>
      </div>
    </button>
  )
}

/**
 * Community search — masonry explore grid with discovery rail in the shell.
 */
export default function CommunitySearchFeed() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const { openPost } = useOutletContext() ?? {}

  const results = useMemo(() => {
    let list = MOCK_SEARCH_RESULTS
    if (filter !== 'All') {
      list = list.filter((item) => item.category === filter)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (item) =>
          item.userName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [filter, query])

  return (
    <div className="pb-8">
      <label className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search style, creators, or collections..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-3.5 pl-12 pr-4 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
        />
      </label>

      <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
        {SEARCH_FILTERS.map((item) => {
          const active = item === filter
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2 font-inter text-sm font-medium transition ${
                active
                  ? 'bg-black text-white'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>

      <div className="mt-6 columns-2 gap-4 md:columns-3 ">
        {results.map((item) => (
          <SearchResultCard
            key={item.id}
            item={item}
            onOpen={() =>
              openPost?.({
                id: item.id,
                author: {
                  name: item.userName,
                  handle: item.userName.toLowerCase().replace(/\s+/g, ''),
                  role: 'CREATOR',
                  avatar: item.avatar,
                },
                image: item.image,
                images: [item.image],
                likes: item.likes,
                comments: '24',
                caption: `Exploring ${item.category.toLowerCase()} looks worth saving.`,
                date: 'AUGUST 12',
                designedBy: 'Alice Mark',
                taggedProducts: [],
                commentList: [],
              })
            }
          />
        ))}
      </div>

      {!results.length ? (
        <p className="mt-16 text-center font-inter text-sm text-neutral-400">
          No results for this search.
        </p>
      ) : null}
    </div>
  )
}
