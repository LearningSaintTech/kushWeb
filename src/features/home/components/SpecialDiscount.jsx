import { Link } from 'react-router-dom'
import { getProductPath, ROUTES } from '../../../utils/constants'
import { getPublicImageUrl } from '../../../services/config.js'
import bgHero from '../../../assets/images/special-discount/bg-hero.png'
import thumb1 from '../../../assets/images/special-discount/thumb-1.png'
import thumb2 from '../../../assets/images/special-discount/thumb-2.png'
import thumb3 from '../../../assets/images/special-discount/thumb-3.png'
import thumb4 from '../../../assets/images/special-discount/thumb-4.png'

const GALLERY_IMAGES = [
    { src: thumb1, alt: 'Woman in tan coat and sunglasses' },
    { src: thumb2, alt: 'Models in vibrant suits against blue sky' },
    { src: thumb3, alt: 'Woman in red tomato soup sweatshirt' },
    { src: thumb4, alt: 'Models in streetwear against orange background' },
]

const BADGE_GOLD = '#C5A059'

function formatDiscountPercent(section) {
    const value = section?.discount?.value
    if (value == null || Number.isNaN(Number(value))) return 60
    return Math.round(Number(value))
}

function resolveBannerSrc(section) {
    const desktopRaw = section?.desktopBanner?.[0]?.imageUrl
    return desktopRaw ? getPublicImageUrl(desktopRaw) : bgHero
}

function resolveProductImage(item) {
    if (!item) return null

    const variants = item.variants ?? []
    for (const variant of variants) {
        const images = variant?.images ?? []
        const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const url = sorted.find((img) => img?.url)?.url ?? sorted[0]?.url
        if (url) return getPublicImageUrl(url)
    }

    if (item.thumbnail) return getPublicImageUrl(item.thumbnail)
    return null
}

function resolveGalleryImages(section) {
    const fromProducts =
        section?.products
            ?.slice(0, 4)
            ?.map((p, i) => {
                const item = p?.item ?? p
                const src = resolveProductImage(item)
                if (!src) return null

                return {
                    src,
                    alt: item.name || `Product ${i + 1}`,
                    productId: item._id ?? p.itemId ?? item?.id,
                    name: item.name || '',
                    shortDescription: item.shortDescription || '',
                }
            })
            .filter(Boolean) ?? []

    if (fromProducts.length > 0) {
        while (fromProducts.length < 4 && fromProducts.length < GALLERY_IMAGES.length) {
            fromProducts.push(GALLERY_IMAGES[fromProducts.length])
        }
        return fromProducts.slice(0, 4)
    }
    return GALLERY_IMAGES
}

function DiscountBlock({ percent, className = '' }) {
    return (
        <div className={`flex shrink-0 items-end gap-1 sm:gap-2 md:gap-3 ${className}`}>
            <div className="flex flex-col items-start leading-none">
                <span className="font-inter text-[8px] font-medium uppercase tracking-[0.2em] text-black sm:text-[10px] md:text-xs lg:text-sm">
                    {/* Up to */}
                </span>
                <span
                    className="-mt-0.5 font-refer-display text-[1.5rem] italic leading-none text-black sm:text-[2rem] md:text-[clamp(2.25rem,4vw,3rem)] lg:text-[clamp(2.75rem,3.5vw,3.75rem)] xl:text-[4rem]"
                    style={{ fontWeight: 700, lineHeight: 0.9 }}
                >
                    {/* {percent}% */}
                </span>
            </div>
            <span
                className="mb-0.5 rounded-[4px] px-1.5 py-0.5 font-inter text-[6px] font-semibold uppercase tracking-wider text-white sm:mb-1 sm:rounded-[5px] sm:px-2 sm:text-[8px] md:text-[10px] lg:text-[11px]"
                style={{ backgroundColor: BADGE_GOLD }}
            >
                {/* Off */}
            </span>
        </div>
    )
}

function SpecialOfferHeader({ title, subtitle, className = '' }) {
    const lines = (title || 'Special Offer').trim().split(/\s+/)
    const first = lines[0] || 'Special'
    const rest = lines.slice(1).join(' ') || 'Offer'

    return (
        <header className={`min-w-0 max-w-[58%] shrink text-right sm:max-w-[52%] md:max-w-[48%] lg:max-w-none ${className}`}>
            <h2 className="font-inter font-bold uppercase leading-[0.92] tracking-tight text-black">
                <span className="block text-[10px] sm:text-sm md:text-base lg:text-xl xl:text-[1.75rem] 2xl:text-[2rem]">
                    {first}
                </span>
                {rest ? (
                    <span className="block text-[10px] sm:text-sm md:text-base lg:text-xl xl:text-[1.75rem] 2xl:text-[2rem]">
                        {rest}
                    </span>
                ) : null}
            </h2>
            <p className="mt-0.5 font-inter text-[7px] font-semibold leading-tight text-black sm:mt-1 sm:text-[10px] md:text-xs lg:text-base">
                {subtitle || 'Grab Your Discounts!'}
            </p>
        </header>
    )
}

function GalleryThumbs({ images, variant = 'row' }) {
    const containerClass =
        variant === 'grid'
            ? 'grid grid-cols-2 gap-2 sm:gap-2.5'
            : variant === 'tablet'
                ? 'grid grid-cols-4 gap-2.5 md:gap-3'
                : 'flex flex-row items-center gap-2.5 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6'

    const cellClass =
        variant === 'grid' || variant === 'tablet'
            ? 'aspect-[3/4] w-full overflow-hidden rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.12)] sm:rounded-2xl'
            : 'aspect-[3/4] w-[4.5rem] shrink-0 overflow-hidden rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.2)] sm:w-[5.5rem] sm:rounded-2xl md:w-[7rem] lg:w-[8.25rem] xl:w-[9.5rem] 2xl:w-[10.5rem]'

    return (
        <div className={containerClass} role="list">
            {images.map((item, index) => {
                const image = (
                    <img
                        src={item.src}
                        alt={item.alt}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                )

                if (item.productId) {
                    return (
                        <Link
                            key={String(item.productId)}
                            to={getProductPath(item.productId, item.name, item.shortDescription)}
                            role="listitem"
                            className={`${cellClass} block transition-opacity hover:opacity-90`}
                            aria-label={item.alt}
                        >
                            {image}
                        </Link>
                    )
                }

                return (
                    <div key={`${item.alt}-${index}`} role="listitem" className={cellClass}>
                        {image}
                    </div>
                )
            })}
        </div>
    )
}

function ExploreButton({ to, variant = 'desktop' }) {
    const isDesktop = variant === 'desktop'

    return (
        <Link
            to={to}
            className={
                isDesktop
                    ? 'relative z-30 inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full bg-white px-5 py-2 font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-colors hover:bg-neutral-50 sm:min-h-[40px] sm:gap-2 sm:px-6 sm:py-2.5 sm:text-xs md:min-h-[44px] md:px-7 md:text-sm'
                    : 'relative z-30 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 font-inter text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-900 sm:min-h-[48px] sm:rounded-2xl sm:text-sm md:min-h-[52px]'
            }
            aria-label="Explore special offers"
        >
            Explore
            <span className="text-sm leading-none sm:text-base" aria-hidden>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M9 5L15.9632 11.9632L9 18.9263"
                        stroke={isDesktop ? 'black' : 'white'}
                        strokeWidth="2"
                    />
                </svg>
            </span>
        </Link>
    )
}

function BannerHero({ bannerSrc, alt, children }) {
    return (
        <div
            className="special-discount-hero  relative w-full overflow-hidden bg-neutral-50"
            role="img"
            aria-label={alt}
        >
            <img
                src={bannerSrc}
                alt=""
                className="special-discount-hero-img block h-auto w-full max-w-full"
                loading="eager"
                decoding="async"
                draggable={false}
            />
            {children ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col">
                    <div className="pointer-events-auto flex h-full flex-col">{children}</div>
                </div>
            ) : null}
        </div>
    )
}

function SpecialDiscount({ section }) {
    const bannerSrc = resolveBannerSrc(section)
    const galleryImages = resolveGalleryImages(section)
    const discountPercent = formatDiscountPercent(section)
    const subtitle = section?.text?.trim() || 'Grab Your Discounts!'
    const exploreTo = section?._id
        ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}`
        : ROUTES.SEARCH

    return (
        <section className="w-full overflow-x-hidden bg-black  py-5 sm:py-8 md:py-10 lg:bg-transparent lg:py-12">
            <div className="mx-auto w-full max-w-[1920px] px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:max-w-[640px] md:max-w-[768px] lg:max-w-none lg:rounded-[1.75rem] lg:border-0 lg:bg-transparent lg:shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                    <BannerHero bannerSrc={bannerSrc} alt={section?.title || 'Special offer'}>
                        <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 md:p-5 lg:p-9 xl:p-10">
                            <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3 md:gap-4 lg:ml-auto lg:w-auto lg:max-w-[68%] lg:justify-end lg:gap-10">
                                {/* <DiscountBlock percent={discountPercent} className="max-w-[42%] sm:max-w-none" />
                                <SpecialOfferHeader
                                    title={section?.title || 'Special Offer'}
                                    subtitle={subtitle}
                                /> */}
                            </div>

                            {/* Desktop: products + CTA over banner */}
                            <div className="hidden  flex-col items-end gap-4 lg:flex">
                                <GalleryThumbs images={galleryImages} variant="row" />
                                <ExploreButton to={exploreTo} variant="desktop" />
                            </div>
                        </div>
                    </BannerHero>

                    {/* Phone & tablet: products below banner */}
                    <div className="relative z-20   rounded-b-2xl text-white px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5 md:px-5 md:pb-5 md:pt-0 lg:hidden">
                        <div className="md:-mt-10">
                            <div className="md:hidden">
                                <GalleryThumbs images={galleryImages} variant="grid" />
                            </div>
                            <div className="hidden md:block">
                                <GalleryThumbs images={galleryImages} variant="tablet" />
                            </div>
                        </div>
                        <div className="mt-3 sm:mt-4 md:mt-5">
                            <ExploreButton to={exploreTo} variant="mobile" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SpecialDiscount
