import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { MOCK_POSTS, MOCK_SAVED_ITEMS, MOCK_SAVED_REELS } from '../data/mockFeed'

const TABS = [
  { id: 'images', label: 'Images' },
  { id: 'reels', label: 'Reels' },
]

/**
 * Saved / Favourites grid — click opens the post (or reels feed).
 */
export default function CommunitySavedFeed() {
  const [tab, setTab] = useState('images')
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const items = tab === 'reels' ? MOCK_SAVED_REELS : MOCK_SAVED_ITEMS

  const handleOpen = (item) => {
    if (item.type === 'reel') {
      navigate(ROUTES.COMMUNITY_REELS)
      return
    }

    const post =
      MOCK_POSTS.find((p) => p.id === item.postId) ??
      {
        ...MOCK_POSTS[0],
        id: item.id,
        image: item.image ?? MOCK_POSTS[0].image,
        images: [item.image ?? MOCK_POSTS[0].image],
      }

    openPost?.(post)
  }

  return (
    <div className="pb-8">
      <h1 className="font-inter text-3xl font-bold tracking-tight text-black sm:text-[2rem]">
        Your Favourites
      </h1>

      <div className="mt-5 flex gap-2">
        {TABS.map((item) => {
          const active = item.id === tab
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`cursor-pointer rounded-full px-4 py-2 font-inter text-sm font-semibold transition ${
                active
                  ? 'bg-[#1b261e] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleOpen(item)}
            className={`aspect-square w-full cursor-pointer overflow-hidden transition hover:opacity-90 ${item.style ?? 'bg-neutral-100'}`}
            aria-label={`Open saved ${item.type}`}
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
