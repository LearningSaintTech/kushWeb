import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift } from 'lucide-react'
import giftCardProduct from '../../assets/images/giftcard/gift-card-product.png'
import giftCardTitle from '../../assets/images/giftcard/gift card.svg'
import { giftcardService } from '../../services/giftcard.service.js'
import { ROUTES } from '../../utils/constants'

const DEFAULT_PREVIEW_AMOUNT = 500

const FALLBACK_RULES = [
    'Khush Gift Cards can be purchased instantly by entering your preferred amount',
    'Redeem gift card balance easily during checkout on eligible products',
    'Gift cards and wallet transactions are secured with encrypted payment and account protection systems',
]

function BuyGiftCta({ className = '', onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-h-[44px] items-center justify-center gap-3 rounded-full bg-white px-8 py-3 font-refer-display text-sm font-semibold normal-case tracking-normal text-[#1a1a1a] shadow-[0_4px_14px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] sm:min-h-[48px] sm:gap-5 sm:px-14 sm:py-4 sm:text-base md:px-16 lg:min-h-[50px] lg:px-20 ${className}`}
        >
            Buy Gift
            <span className="text-lg leading-none sm:text-[3vh]" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" className="sm:h-6 sm:w-6">
                    <path d="M9 5L15.9632 11.9632L9 18.9263" stroke="black" strokeWidth="2" />
                </svg>
            </span>
        </button>
    )
}

export default function GiftHomePage() {
    const navigate = useNavigate()
    const [percent, setPercent] = useState(null)
    const [rules, setRules] = useState([])
    const [bannerImage, setBannerImage] = useState('')

    useEffect(() => {
        let cancelled = false

        giftcardService
            .previewBuy(DEFAULT_PREVIEW_AMOUNT)
            .then((data) => {
                if (cancelled) return
                if (data?.percent != null) setPercent(data.percent)
                if (Array.isArray(data?.rules) && data.rules.length > 0) {
                    setRules(data.rules)
                }
                if (data?.image) setBannerImage(data.image)
            })
            .catch(() => {})

        return () => {
            cancelled = true
        }
    }, [])

    const displayPercent = percent ?? 25
    const displayRules = rules.length > 0 ? rules : FALLBACK_RULES
    const productImage = bannerImage || giftCardProduct

    const goToGiftCard = (e) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        navigate(ROUTES.GIFTCARD)
    }

    return (
        <section
            className="w-full overflow-x-hidden py-3 sm:py-6 md:py-8 lg:py-10 xl:py-12 2xl:py-14"
            aria-label="Gift card promotion"
        >
            <div className="mx-auto w-full max-w-[1920px] px-3 sm:px-5 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
                <h2 className="mb-2.5 text-center sm:mb-4 md:mb-5">
                    <img
                        src={giftCardTitle}
                        alt="Gift Card"
                        className="mx-auto block h-auto w-full max-w-[11rem] sm:max-w-[16rem] md:max-w-[20rem] lg:max-w-[24rem] xl:max-w-[26rem] 2xl:max-w-[28rem]"
                        decoding="async"
                        loading="lazy"
                        draggable={false}
                    />
                </h2>

                <div
                    role="link"
                    tabIndex={0}
                    onClick={goToGiftCard}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goToGiftCard(e)
                        }
                    }}
                    className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2"
                    aria-label={`Buy gift card — Get ${displayPercent}% bonus on every transaction`}
                >
                    <div className="gift-hero-banner relative overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.22)] transition-opacity duration-200 group-hover:opacity-[0.98] group-active:opacity-95 sm:rounded-[1.25rem] lg:rounded-3xl xl:rounded-[1.75rem]">
                        <div className="gift-hero-watermark" aria-hidden />

                        <div className="relative z-10 flex flex-col items-center gap-5 px-4 py-6 text-center sm:gap-6 sm:px-6 sm:py-8 md:gap-7 md:px-8 md:py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-10 lg:py-10 lg:text-left xl:gap-10 xl:px-14 xl:py-12 2xl:gap-12 2xl:px-16 2xl:py-14">
                            {/* Content column */}
                            <div className="flex w-full min-w-0 flex-col items-center lg:max-w-[54%] lg:flex-1 lg:items-start lg:text-left xl:max-w-[50%] 2xl:max-w-[48%]">
                                <h3 className="w-full max-w-[18rem] font-inter text-[clamp(1.05rem,4.2vw,2.15rem)] font-bold uppercase leading-[1.2] tracking-[0.06em] text-white sm:max-w-[24rem] sm:leading-[1.15] sm:tracking-[0.07em] md:max-w-[28rem] lg:max-w-none lg:text-[clamp(1.65rem,2.2vw,2.1rem)] xl:text-[clamp(1.85rem,2vw,2.25rem)]">
                                    Get {displayPercent}% bonus on every transaction
                                </h3>

                                <div className="mt-2.5 h-px w-8 bg-white/90 sm:mt-4 sm:w-10 lg:mx-0" aria-hidden />

                                <ul className="mt-3 w-full max-w-[20rem] space-y-2 sm:mt-4 sm:max-w-md sm:space-y-3 md:max-w-lg lg:mt-5 lg:max-w-none xl:max-w-xl">
                                    {displayRules.map((rule) => (
                                        <li
                                            key={rule}
                                            className="flex items-start gap-2 text-left sm:gap-3"
                                        >
                                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/5 sm:h-8 sm:w-8">
                                                <Gift
                                                    className="h-3 w-3 text-white sm:h-4 sm:w-4"
                                                    strokeWidth={1.5}
                                                />
                                            </span>
                                            <p className="font-inter text-[9px] font-medium leading-snug text-white/95 sm:text-[11px] md:text-xs lg:text-[13px] xl:text-sm">
                                                {rule}
                                            </p>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-5 hidden w-full lg:mt-7 lg:block xl:mt-8">
                                    <BuyGiftCta className="min-w-[11rem]" onClick={goToGiftCard} />
                                </div>
                            </div>

                            {/* Image column */}
                            <div className="flex w-full shrink-0 justify-center lg:w-[min(46%,20rem)] lg:justify-end xl:w-[min(44%,24rem)] 2xl:w-[min(42%,26rem)]">
                                <img
                                    src={productImage}
                                    alt={`Khush Gift Card — Get ${displayPercent}% bonus on every transaction`}
                                    className="h-auto w-full max-w-[min(100%,14rem)] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] sm:max-w-[18rem] md:max-w-[20rem] lg:max-w-full xl:max-w-[24rem] 2xl:max-w-[26rem]"
                                    draggable={false}
                                    decoding="async"
                                    loading="lazy"
                                />
                            </div>

                            {/* Mobile / tablet CTA */}
                            <div className="w-full lg:hidden">
                                <BuyGiftCta
                                    className="mx-auto w-full max-w-[16rem] sm:max-w-xs md:max-w-sm"
                                    onClick={goToGiftCard}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
