import { Link } from 'react-router-dom'
import { getProductPath, ROUTES } from '../../../utils/constants'
import { getPublicImageUrl } from '../../../services/config.js'
import studioWide from '../../../assets/images/limited-edition/studio-wide.png'
import editorial from '../../../assets/images/limited-edition/editorial.png'
import flatlay from '../../../assets/images/limited-edition/flatlay.png'
import dunes from '../../../assets/images/limited-edition/dunes.png'
import fashionDuo from '../../../assets/images/limited-edition/fashion-duo.png'

const GRID_IMAGE_COUNT = 8

const GRID_IMAGES = [
    {
        src: editorial,
        alt: 'Model in black blazer with pearl necklace',
        objectPosition: 'object-[center_25%] sm:object-center',
    },
    {
        src: studioWide,
        alt: 'Two models in white outfits in minimalist studio',
        objectPosition: 'object-[center_35%] sm:object-center',
    },
    {
        src: editorial,
        alt: 'Editorial fashion pose in black outfit',
        objectPosition: 'object-[center_15%] sm:object-[center_30%]',
    },
    {
        src: flatlay,
        alt: 'Flat lay of jeans, cardigan, boots and accessories',
        objectPosition: 'object-center',
    },
    {
        src: dunes,
        alt: 'Models in flowing dresses walking on sand dunes',
        objectPosition: 'object-[center_42%] sm:object-[center_38%]',
    },
    {
        src: fashionDuo,
        alt: 'Two models in high-fashion outfits and sunglasses',
        objectPosition: 'object-[center_20%] sm:object-center',
    },
    {
        src: studioWide,
        alt: 'Fashion editorial in studio',
        objectPosition: 'object-center',
    },
    {
        src: dunes,
        alt: 'Models on sand dunes at golden hour',
        objectPosition: 'object-[center_40%] sm:object-center',
    },
]

const DEFAULT_OBJECT_POSITION = 'object-center'

function buildGridImagesFromSection(section) {
    const fromProducts =
        section?.products
            ?.filter((p) => p?.item?.thumbnail)
            ?.slice(0, GRID_IMAGE_COUNT)
            ?.map((p, i) => ({
                src: getPublicImageUrl(p.item.thumbnail),
                alt: p.item.name || 'Limited edition product',
                objectPosition: GRID_IMAGES[i]?.objectPosition ?? DEFAULT_OBJECT_POSITION,
                productId: p.item._id ?? p.itemId ?? p.item?.id,
                name: p.item.name || '',
                shortDescription: p.item.shortDescription || '',
            })) ?? []

    if (fromProducts.length === 0) return GRID_IMAGES

    while (fromProducts.length < GRID_IMAGE_COUNT) {
        const fallback = GRID_IMAGES[fromProducts.length % GRID_IMAGES.length]
        fromProducts.push({ ...fallback })
    }
    return fromProducts.slice(0, GRID_IMAGE_COUNT)
}

function GalleryImage({ item }) {
    const frameClass =
        'relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:rounded-[15px]'

    const image = (
        <img
            src={item.src}
            alt={item.alt}
            className={`absolute inset-0 h-full w-full object-cover ${item.objectPosition ?? DEFAULT_OBJECT_POSITION}`}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, 25vw"
        />
    )

    if (item.productId) {
        return (
            <Link
                to={getProductPath(item.productId, item.name, item.shortDescription)}
                className={`${frameClass} block transition-opacity hover:opacity-90`}
                aria-label={item.alt}
            >
                {image}
            </Link>
        )
    }

    return <div className={frameClass}>{image}</div>
}

function LimitedEditionGallery({ gridImages }) {
    return (
        <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-5"
            role="list"
        >
            {gridImages.map((item, index) => (
                <GalleryImage
                    key={item.productId ? String(item.productId) : `${item.src}-${index}`}
                    item={item}
                />
            ))}
        </div>
    )
}

function LimitedEditionHeader({ title }) {
    const words = (title || 'Limited Edition')
        .trim()
        .replace(/['']/g, '')
        .split(/\s+/)
        .filter(Boolean)
    const first = words[0] || 'Limited'
    const rest = words.slice(1).join(' ') || 'Edition'

    return (
        <header className="mb-6 sm:mb-8 md:mb-10">
            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-0 leading-none text-white">
                <span className="font-rivera text-[clamp(2rem,9vw,3rem)] text-white sm:text-[clamp(2.5rem,6vw,3.75rem)] md:text-[clamp(3rem,4.5vw,4.25rem)] lg:text-[4.5rem]">
                    {first}
                </span>
                <span className="font-inter text-[clamp(1rem,3.5vw,1.25rem)] font-bold uppercase tracking-[0.14em] text-white sm:text-xl sm:tracking-[0.16em] md:text-2xl lg:text-[2.25rem]">
                    {rest}
                </span>
            </h2>
        </header>
    )
}

function ExploreLink({ to }) {
    return (
        <Link
            to={to}
            className="group inline-flex flex-col items-end gap-1.5 font-inter text-[10px] font-medium uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-80 sm:text-xs md:text-sm"
            aria-label="Explore limited edition collection"
        >
            <span className="flex items-center gap-1">
                Explore
                <span className="translate-y-px text-sm leading-none" aria-hidden>
                    &gt;
                </span>
            </span>
            <span className="h-px w-[calc(100%+0.5rem)] bg-white transition-opacity group-hover:opacity-80" />
        </Link>
    )
}

function LimitedEdition({ section }) {
    const gridImages = buildGridImagesFromSection(section)
    const exploreTo = section?._id
        ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}`
        : ROUTES.SEARCH

    return (
        <section className="w-full overflow-x-hidden bg-black py-10 sm:py-12 md:py-14 lg:py-16 xl:py-20">
            <div className="mx-auto w-full max-w-[1420px] px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
                <LimitedEditionHeader title={section?.title} />

                <LimitedEditionGallery gridImages={gridImages} />

                <div className="mt-6 flex justify-end sm:mt-8 md:mt-10">
                    <ExploreLink to={exploreTo} />
                </div>
            </div>
        </section>
    )
}

export default LimitedEdition
