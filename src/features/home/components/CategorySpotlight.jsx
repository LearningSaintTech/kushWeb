import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoriesService } from '../../../services/categories.service.js'
import { getPublicImageUrl } from '../../../services/config.js'
import { getSearchPath } from '../../../utils/constants'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import fallbackMen from '../../../assets/images/home/category-men.jpg'
import fallbackWomen from '../../../assets/images/home/category-women.jpg'
import fallbackUnisex from '../../../assets/images/home/category-unisex.jpg'

const SLOTS = [
  {
    key: 'men',
    label: 'Men',
    patterns: ['men', 'man', 'mens', "men's"],
    fallbackImage: fallbackMen,
  },
  {
    key: 'women',
    label: 'Women',
    patterns: ['women', 'woman', 'womens', "women's", 'ladies'],
    fallbackImage: fallbackWomen,
  },
  {
    key: 'unisex',
    label: 'Unisex',
    patterns: ['unisex'],
    fallbackImage: fallbackUnisex,
  },
]

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesCategory(cat, patterns) {
  const n = normalizeName(cat?.name)
  return patterns.some((p) => n === p || n.startsWith(`${p} `) || n.includes(` ${p}`))
}

function pickCategoryImage(cat) {
  const raw =
    cat?.imageUrl ||
    cat?.bannerImage ||
    cat?.coverImage ||
    cat?.thumbnail ||
    cat?.iconUrl ||
    ''
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null
  return getPublicImageUrl(raw.trim()) || raw.trim()
}

function buildSlots(categories) {
  const used = new Set()
  return SLOTS.map((slot) => {
    const match =
      categories.find(
        (cat) =>
          !used.has(cat._id ?? cat.id) && matchesCategory(cat, slot.patterns),
      ) || null

    if (match) used.add(match._id ?? match.id)

    const id = match?._id ?? match?.id ?? slot.key
    const name = match?.name ?? slot.label
    const remote = match ? pickCategoryImage(match) : null

    return {
      key: slot.key,
      id,
      label: slot.label,
      image: remote || slot.fallbackImage,
      to: getSearchPath({
        categoryId: match?._id ?? match?.id ?? '',
        categoryName: name,
      }),
    }
  })
}

/**
 * Full-bleed Men / Women / Unisex category row — placed after Banner.
 */
export default function CategorySpotlight() {
  const [slots, setSlots] = useState(() => buildSlots([]))

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

        if (cancelled) return
        const next = buildSlots(categories)
        debugLog('[CategorySpotlight] slots', next.map((s) => s.label))
        setSlots(next)
      } catch (err) {
        debugError('[CategorySpotlight] load failed', err?.message)
        if (!cancelled) setSlots(buildSlots([]))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="w-full bg-white" aria-label="Shop by category">
      <div className="grid grid-cols-1 gap-[2px] sm:grid-cols-3 sm:gap-0">
        {slots.map((slot) => (
          <Link
            key={slot.key}
            to={slot.to && slot.to !== '/search' ? slot.to : getSearchPath({})}
            className="group relative block min-h-[62vh] w-full overflow-hidden bg-neutral-200 sm:min-h-[72vh] md:min-h-[78vh] lg:min-h-[85vh] xl:min-h-[90vh]"
            aria-label={`Shop ${slot.label}`}
          >
            <img
              src={slot.image}
              alt={slot.label}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 p-5 sm:p-6 md:p-7 lg:p-8">
              <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-3.5 py-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md sm:text-xs">
                {slot.label}
              </span>
              {/* <span className="font-inter text-sm font-medium text-white/90 opacity-0 translate-y-1 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:text-[13px]">
                Shop Now 
              </span> */}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
