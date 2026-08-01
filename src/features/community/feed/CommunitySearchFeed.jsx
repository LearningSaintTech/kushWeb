import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { SEARCH_FILTERS } from '../data/mockFeed'
import { useCommunityFeed } from '../hooks/useCommunityFeed'
import { communityService } from '../../../services/community.service.js'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError } from '../../../utils/debugLog.js'

function SearchResultCard({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-4 block w-full break-inside-avoid cursor-pointer text-left"
    >
      <div className="overflow-hidden rounded-2xl bg-neutral-100 aspect-[3/4]">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-neutral-200">
          {item.author?.avatar ? (
            <img src={item.author.avatar} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <p className="min-w-0 flex-1 truncate font-inter text-sm font-medium text-black">
          {item.author?.name || 'Member'}
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
 * Community search / explore — GET /community/feed?scope=explore&q=
 */
export default function CommunitySearchFeed() {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [chips, setChips] = useState([])
  const { openPost } = useOutletContext() ?? {}

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    logCommunity('SearchFeed load hashtags')
    communityService
      .getHashtags()
      .then((data) => {
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []
        const labels = list
          .map((h) => (typeof h === 'string' ? h : h?.keyword || h?.name || h?.tag))
          .filter(Boolean)
        setChips(labels)
        logCommunity('SearchFeed hashtags ok', { count: labels.length })
      })
      .catch((err) => {
        debugError('[Community] hashtags failed', err?.message)
        setChips(SEARCH_FILTERS.filter((f) => f !== 'All'))
      })
  }, [])

  const feedType = filter === 'Reels' ? 'reel' : filter === 'Posts' ? 'post' : 'all'

  const { items, loading, error, refresh } = useCommunityFeed({
    scope: 'explore',
    type: feedType === 'all' ? 'all' : feedType,
    q: debouncedQ || undefined,
    hashtag: filter !== 'All' && filter !== 'Reels' && filter !== 'Posts' ? filter.replace(/^#/, '') : undefined,
  })

  const filters = useMemo(() => {
    const base = ['All', 'Posts', 'Reels']
    const fromApi = chips.slice(0, 8).map((c) => (c.startsWith('#') ? c : `#${c}`))
    return [...base, ...fromApi]
  }, [chips])

  const results = items

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
        {filters.map((item) => {
          const active = item === filter
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                setFilter(item)
                logCommunity('SearchFeed filter', { filter: item })
              }}
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

      {loading ? (
        <p className="mt-8 font-inter text-sm text-neutral-500">Searching…</p>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-2xl bg-amber-50 px-4 py-3 font-inter text-sm text-amber-900">
          {error}
          <button type="button" onClick={refresh} className="ml-3 cursor-pointer font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <div className="mt-6 columns-2 gap-4 md:columns-3">
        {results.map((item) => (
          <SearchResultCard
            key={item.id}
            item={item}
            onOpen={() => openPost?.(item)}
          />
        ))}
      </div>

      {!loading && !results.length ? (
        <p className="mt-16 text-center font-inter text-sm text-neutral-400">
          No results for this search.
        </p>
      ) : null}
    </div>
  )
}
