import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { getProductPath, ROUTES } from '../../../utils/constants'
import { getPublicImageUrl } from '../../../services/config.js'
import studioWide from '../../../assets/images/limited-edition/studio-wide.png'
import editorial from '../../../assets/images/limited-edition/editorial.png'
import flatlay from '../../../assets/images/limited-edition/flatlay.png'
import dunes from '../../../assets/images/limited-edition/dunes.png'
import fashionDuo from '../../../assets/images/limited-edition/fashion-duo.png'

const FALLBACK_LOOKS = [
  {
    id: 'college-fit',
    title: 'College Fit',
    subtitle: 'Lecture halls to late-night canteens.',
    src: editorial,
    alt: 'College Fit look',
  },
  {
    id: 'weekend-fit',
    title: 'Weekend Fit',
    subtitle: 'Slow mornings, spontaneous plans.',
    src: fashionDuo,
    alt: 'Weekend Fit look',
  },
  {
    id: 'date-night-fit',
    title: 'Date Night Fit',
    subtitle: 'Candlelight and quiet confidence.',
    src: dunes,
    alt: 'Date Night Fit look',
  },
  {
    id: 'work-casual-fit',
    title: 'Work Casual Fit',
    subtitle: 'Meetings, but make it comfortable.',
    src: studioWide,
    alt: 'Work Casual Fit look',
  },
  {
    id: 'street-fit',
    title: 'Street Fit',
    subtitle: 'City blocks as a runway.',
    src: flatlay,
    alt: 'Street Fit look',
  },
]

function buildLooksFromSection(section) {
  const products = Array.isArray(section?.products) ? section.products : []
  const fromProducts = products
    .filter((p) => p?.item?.thumbnail || p?.item?.name)
    .slice(0, 8)
    .map((p, i) => {
      const item = p.item
      const fallback = FALLBACK_LOOKS[i % FALLBACK_LOOKS.length]
      const thumb = item?.thumbnail
        ? getPublicImageUrl(item.thumbnail) || item.thumbnail
        : fallback.src
      return {
        id: item?._id ?? item?.id ?? fallback.id,
        title: item?.name || fallback.title,
        subtitle:
          item?.shortDescription ||
          item?.description ||
          fallback.subtitle,
        src: thumb,
        alt: item?.name || fallback.alt,
        productId: item?._id ?? item?.id ?? p.itemId,
        name: item?.name || '',
        shortDescription: item?.shortDescription || '',
      }
    })

  if (fromProducts.length >= 3) return fromProducts

  const merged = [...fromProducts]
  for (const look of FALLBACK_LOOKS) {
    if (merged.length >= FALLBACK_LOOKS.length) break
    if (merged.some((m) => m.id === look.id)) continue
    merged.push({ ...look })
  }
  return merged
}

function LookCard({ look }) {
  const to = look.productId
    ? getProductPath(look.productId, look.name, look.shortDescription)
    : ROUTES.SEARCH

  return (
    <article className="group relative h-full w-full overflow-hidden bg-neutral-200">
      <img
        src={look.src}
        alt={look.alt || look.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-500"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start p-4 sm:p-5 md:p-6">
        <h3 className="font-inter text-lg font-bold leading-tight text-white sm:text-xl md:text-[1.35rem]">
          {look.title}
        </h3>

        <div
          className={[
            'grid w-full transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'grid-rows-[0fr] opacity-0',
            'group-hover:mt-1.5 group-hover:grid-rows-[1fr] group-hover:opacity-100',
            'group-focus-within:mt-1.5 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100',
            '[@media(hover:none)]:mt-1.5 [@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:opacity-100',
          ].join(' ')}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="line-clamp-4 pr-2 font-inter text-[12px] font-normal leading-[1.45] text-white/90 sm:text-[13px]">
              {look.subtitle}
            </p>
          </div>
        </div>

        <Link
          to={to}
          className="mt-3.5 inline-flex items-center gap-1.5 border border-white bg-transparent px-3.5 py-2 font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black sm:mt-4 sm:px-4 sm:text-[11px]"
        >
          Shop the Look
          <span aria-hidden className="translate-y-px text-sm leading-none">
            →
          </span>
        </Link>
      </div>
    </article>
  )
}

function LimitedEdition({ section }) {
  const scrollerRef = useRef(null)
  const looks = buildLooksFromSection(section)
  const lookbookTo = section?._id
    ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}`
    : ROUTES.SEARCH
  const heading = (section?.title || 'Limited Edition').trim() || 'Limited Edition'

  return (
    <section className="w-full overflow-x-hidden bg-white py-8 sm:py-10 md:py-12 lg:py-14">
      <div className="mb-5 flex items-end justify-between gap-4 px-4 sm:mb-6 sm:px-6 md:mb-8 md:px-8 lg:px-10">
        <h2 className="min-w-0 whitespace-nowrap font-inter text-[1.65rem] font-extrabold uppercase leading-none tracking-tight text-black sm:text-3xl md:text-4xl lg:text-[2.75rem]">
          {heading}
        </h2>
        <Link
          to={lookbookTo}
          className="font-inter mb-0.5 inline-flex shrink-0 items-center gap-1.5 border-b border-black pb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-opacity hover:opacity-70 sm:text-xs"
        >
          Full Lookbook
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:gap-3.5 sm:px-6 md:gap-4 md:px-8 lg:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Limited edition looks"
      >
        {looks.map((look) => (
          <div
            key={String(look.id)}
            role="listitem"
            className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-[46vw] sm:max-w-[300px] md:w-[32vw] md:max-w-[320px] lg:w-[22vw] lg:max-w-[340px]"
          >
            <div className="aspect-[3/4] w-full">
              <LookCard look={look} />
            </div>
          </div>
        ))}
        <div className="w-1 shrink-0 sm:w-2" aria-hidden />
      </div>
    </section>
  )
}

export default LimitedEdition
