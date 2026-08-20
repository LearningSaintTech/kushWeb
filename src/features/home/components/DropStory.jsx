import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import {
  categoriesService,
  subcategoriesService,
} from '../../../services/categories.service.js'
import { getPublicImageUrl } from '../../../services/config.js'
import { getSearchPath } from '../../../utils/constants'
import { debugError, debugLog } from '../../../utils/debugLog.js'

const GRID_COUNT = 4

const FALLBACK_FEATURED = {
  id: 'f-dress',
  title: 'Dress',
  image: productImage,
  to: '#',
}

const FALLBACK_GRID = [
  { id: 'f2', title: 'Bottom Wear', image: hoverProductImage, to: '#' },
  { id: 'f3', title: 'Tops', image: productImage, to: '#' },
  { id: 'f4', title: 'Shirts', image: hoverProductImage, to: '#' },
  { id: 'f5', title: 'Outerwear', image: productImage, to: '#' },
]

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesName(item, patterns) {
  const n = normalizeName(item?.title || item?.name)
  return patterns.some((p) => n === p || n.includes(p))
}

const DRESS_PATTERNS = ['dress', 'dresses']
const BOTTOM_WEAR_PATTERNS = ['bottom wear', 'bottomwear', 'bottom wears', 'bottoms']

function resolveImage(url, fallback) {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback
  return getPublicImageUrl(url.trim()) || url.trim() || fallback
}

function pickSubImage(sub) {
  return (
    sub.imageUrl ||
    sub.bannerImage ||
    sub.coverImage ||
    sub.thumbnail ||
    sub.iconUrl ||
    sub.iconKey ||
    ''
  )
}

function mapSubcategory(sub, parentCategory) {
  const id = sub._id ?? sub.id
  const categoryId = parentCategory?._id ?? parentCategory?.id ?? sub.categoryId ?? ''
  const categoryName = parentCategory?.name ?? ''
  const rawImage = pickSubImage(sub)
  const image = resolveImage(rawImage, productImage)
  return {
    id,
    title: sub.name || 'Shop',
    image,
    hasRemoteImage: Boolean(rawImage),
    to: getSearchPath({
      categoryId,
      subcategoryId: id,
      categoryName,
      subcategoryName: sub.name,
    }),
  }
}

async function fetchSubsForCategory(cat) {
  const catId = cat._id ?? cat.id
  if (!catId) return []

  // Prefer navbar subs; fall back to all subs so Dress / Bottom Wear are not missed
  const tryFetch = async (params) => {
    const res = params
      ? await subcategoriesService.getByCategoryId(catId, params)
      : await subcategoriesService.getNavbarByCategoryId(catId)
    const data = res?.data?.data ?? res?.data
    return Array.isArray(data?.subcategories)
      ? data.subcategories
      : Array.isArray(data)
        ? data
        : []
  }

  let subs = await tryFetch()
  if (!subs.length) {
    try {
      subs = await tryFetch({ limit: 50 })
    } catch {
      /* keep empty */
    }
  }
  return subs.map((sub) => mapSubcategory(sub, cat))
}

/** Pick Dress for featured, Bottom Wear + 3 others for the grid. */
function arrangeDropItems(all) {
  if (!all.length) {
    return { featured: FALLBACK_FEATURED, gridItems: FALLBACK_GRID }
  }

  const dressCandidates = all.filter((item) => matchesName(item, DRESS_PATTERNS))
  const dress =
    dressCandidates.find((item) => item.hasRemoteImage) ||
    dressCandidates[0] ||
    all.find((item) => item.hasRemoteImage) ||
    all[0]

  const rest = all.filter((item) => item.id !== dress.id)
  const bottomWear = rest.find((item) => matchesName(item, BOTTOM_WEAR_PATTERNS))
  const others = rest.filter((item) => item.id !== bottomWear?.id)

  const gridItems = []
  if (bottomWear) gridItems.push(bottomWear)
  for (const item of others) {
    if (gridItems.length >= GRID_COUNT) break
    gridItems.push(item)
  }

  while (gridItems.length < GRID_COUNT && FALLBACK_GRID[gridItems.length]) {
    gridItems.push(FALLBACK_GRID[gridItems.length])
  }

  return {
    featured: dress || FALLBACK_FEATURED,
    gridItems: gridItems.slice(0, GRID_COUNT),
  }
}

function tileRevealClass(revealed) {
  return [
    'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none',
    revealed ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
  ].join(' ')
}

function SubcategoryTile({ item, featured = false, revealed = false, delayMs = 0 }) {
  const [src, setSrc] = useState(item.image || productImage)

  useEffect(() => {
    setSrc(item.image || productImage)
  }, [item.image])

  const revealStyle = {
    transitionDelay: revealed ? `${delayMs}ms` : '0ms',
  }

  if (featured) {
    return (
      <Link
        to={item.to && item.to !== '#' ? item.to : getSearchPath({})}
        className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-neutral-200 ${tileRevealClass(revealed)}`}
        aria-label={item.title}
        style={revealStyle}
      >
        <img
          src={src}
          alt={item.title}
          className="h-full w-full object-contain object-center md:object-cover"
          loading="eager"
          decoding="async"
          onError={() => setSrc(productImage)}
        />
        <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/55 to-transparent px-4 py-5 md:px-6 md:py-6">
          <p className="font-inter text-sm font-semibold uppercase tracking-wide text-white md:text-base">
            {item.title}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={item.to && item.to !== '#' ? item.to : getSearchPath({})}
      className={`relative flex flex-col overflow-hidden bg-neutral-100 ${tileRevealClass(revealed)}`}
      aria-label={item.title}
      style={revealStyle}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-200">
        <img
          src={src}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setSrc(productImage)}
        />
      </div>
      <div className="  border-b border-gray-300 bg-white px-2.5 py-2.5 sm:px-3 sm:py-3">
        <p className="truncate font-inter text-[11px] font-medium leading-tight text-black sm:text-xs">
          {item.title}
        </p>
      </div>
    </Link>
  )
}

/**
 * Drop story — large Dress tile + 4 small tiles (Bottom Wear prioritized).
 * No hover image swap.
 */
export default function DropStory() {
  const [{ featured, gridItems }, setLayout] = useState(() =>
    arrangeDropItems([]),
  )
  const [revealed, setRevealed] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const catRes = await categoriesService.getNavbar({ limit: 10 })
        const catData = catRes?.data?.data ?? catRes?.data
        let categories = Array.isArray(catData?.categories)
          ? catData.categories
          : Array.isArray(catData)
            ? catData
            : []

        if (!categories.length) {
          const allRes = await categoriesService.getAll({ limit: 20 })
          const allData = allRes?.data?.data ?? allRes?.data
          categories = Array.isArray(allData?.categories)
            ? allData.categories
            : Array.isArray(allData)
              ? allData
              : []
        }

        debugLog('[DropStory] categories', { count: categories.length })

        const collected = []
        const seen = new Set()

        await Promise.all(
          categories.map(async (cat) => {
            try {
              const mapped = await fetchSubsForCategory(cat)
              for (const item of mapped) {
                if (!item.id || seen.has(item.id)) continue
                seen.add(item.id)
                collected.push(item)
              }
            } catch (err) {
              debugError('[DropStory] subcategories error', err?.message)
            }
          }),
        )

        if (cancelled) return

        const layout = arrangeDropItems(collected)
        debugLog('[DropStory] arranged', {
          featured: layout.featured?.title,
          featuredImage: layout.featured?.image,
          grid: layout.gridItems.map((i) => i.title),
          total: collected.length,
        })
        setLayout(layout)
      } catch (err) {
        debugError('[DropStory] load failed', err?.message)
        if (!cancelled) setLayout(arrangeDropItems([]))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return undefined

    const preferReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (preferReduced) {
      setRevealed(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="w-full bg-white pt-20 pb-10 sm:pt-24 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16"
    >
      <div className="mb-8 w-full px-4 sm:mb-10 sm:px-6 md:mb-12 md:px-8 lg:px-10 xl:px-12">
        <h2
          className={[
            'font-inter text-[2.15rem] font-extrabold uppercase leading-[0.95] tracking-tight text-black',
            'sm:text-4xl md:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]',
            'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          ].join(' ')}
        >
          Drop 04 Story,
          <br />
          Made for the Mood
        </h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-[2px] bg-white md:grid-cols-2 md:items-stretch">
        {featured ? (
          <div className="relative aspect-[3/4] w-full overflow-hidden md:aspect-auto md:min-h-[560px] lg:min-h-[640px] xl:min-h-[700px]">
            <SubcategoryTile
              item={featured}
              featured
              revealed={revealed}
              delayMs={80}
            />
          </div>
        ) : null}

        <div className="grid w-full grid-cols-2 gap-[2px]">
          {gridItems.map((item, index) => (
            <SubcategoryTile
              key={item.id}
              item={item}
              revealed={revealed}
              delayMs={160 + index * 90}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
