import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import giftCardTitle from '../../assets/images/giftcard/giftcardhearder.png'
import giftHeroBg from '../../assets/images/giftcard/giftcard-bg.png'
import { giftcardService } from '../../services/giftcard.service.js'
import { ROUTES } from '../../utils/constants'

function BuyGiftCta({ className = '' }) {
    return (
        <div className={`relative inline-flex w-full max-w-[11.5rem] sm:max-w-[12.5rem] md:max-w-[14.5rem] lg:max-w-[17.5rem] xl:max-w-[20rem] ${className}`}>
            {/* <span
                className="absolute -right-0.5 -top-1 z-10 h-2 w-2 rounded-full bg-[#ef1f26] sm:-top-1.5 sm:right-0 sm:h-2.5 sm:w-2.5"
                aria-hidden
            /> */}
            <span className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-black shadow-[0_4px_14px_rgba(0,0,0,0.2)] sm:min-h-[42px] sm:gap-2.5 sm:px-5 sm:py-3 sm:text-xs md:min-h-[38px] md:px-5 md:text-sm lg:min-h-[30px] lg:px-5 lg:text-[15px]">
                Buy Gift
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]"
                    aria-hidden
                >
                    <path d="M9 5L15.9632 11.9632L9 18.9263" stroke="black" strokeWidth="2" />
                </svg>
            </span>
        </div>
    )
}

function GiftBoxCircleIcon({ className = '' }) {
    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/75 bg-white/5 sm:h-9 sm:w-9 md:h-10 md:w-10 ${className}`}
            aria-hidden
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 25 25"
                fill="none"
                className="h-[18px] w-[18px] sm:h-5 sm:w-5"
            >
                <path
                    d="M12.0501 7.03177V21.0921M12.0501 7.03177C11.6868 5.53474 11.0613 4.2549 10.2552 3.35916C9.44898 2.46341 8.49956 1.99332 7.53072 2.0102C6.86482 2.0102 6.22619 2.27473 5.75533 2.7456C5.28447 3.21646 5.01994 3.85509 5.01994 4.52099C5.01994 5.18689 5.28447 5.82551 5.75533 6.29638C6.22619 6.76724 6.86482 7.03177 7.53072 7.03177M12.0501 7.03177C12.4134 5.53474 13.0389 4.2549 13.8451 3.35916C14.6513 2.46341 15.6007 1.99332 16.5695 2.0102C17.2354 2.0102 17.8741 2.27473 18.3449 2.7456C18.8158 3.21646 19.0803 3.85509 19.0803 4.52099C19.0803 5.18689 18.8158 5.82551 18.3449 6.29638C17.8741 6.76724 17.2354 7.03177 16.5695 7.03177M20.0846 11.049V19.0835C20.0846 19.6162 19.873 20.1271 19.4963 20.5038C19.1196 20.8805 18.6087 21.0921 18.076 21.0921H6.02425C5.49153 21.0921 4.98063 20.8805 4.60394 20.5038C4.22725 20.1271 4.01563 19.6162 4.01562 19.0835V11.049"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M20.0889 7.03125H4.01994C3.46527 7.03125 3.01562 7.4809 3.01562 8.03556V10.0442C3.01562 10.5989 3.46527 11.0485 4.01994 11.0485H20.0889C20.6436 11.0485 21.0932 10.5989 21.0932 10.0442V8.03556C21.0932 7.4809 20.6436 7.03125 20.0889 7.03125Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    )
}

export default function GiftHomePage() {
    const navigate = useNavigate()
    const [giftCardImage, setGiftCardImage] = useState('')
    const [giftCardName, setGiftCardName] = useState('Khush Gift Card')

    useEffect(() => {
        let cancelled = false
        giftcardService
            .getActiveRules()
            .then((rules) => {
                if (cancelled) return
                if (rules?.image) setGiftCardImage(rules.image)
                if (rules?.name) setGiftCardName(rules.name)
            })
            .catch(() => { })
        return () => {
            cancelled = true
        }
    }, [])

    const goToGiftCard = (e) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        navigate(ROUTES.GIFTCARD)
    }

    return (
        <section
            className="w-full mt-10 overflow-x-hidden py-3 sm:py-6 md:py-12 lg:py-15 xl:py-20 2xl:py-14"
            aria-label="Gift card promotion"
        >
            <div className="mx-auto w-full max-w-[1920px] px-3 sm:px-9 md:px-15 lg:px-18 xl:px-30 2xl:px-50">
                <h2 className="mb-2.5 text-center sm:mb-4 md:mb-9 lg:mb-14 xl:mb-18 2xl:mb-18">
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
                    aria-label="Buy a gift card — Gift more, get more"
                >
                    <div className="relative  min-h-[clamp(11.5rem,42vw,18rem)] overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.22)] transition-opacity duration-200 group-hover:opacity-[0.98] group-active:opacity-95 sm:rounded-[1.25rem] lg:rounded-3xl xl:rounded-[1.75rem]">
                        <img
                            src={giftHeroBg}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 h-full w-full object-cover object-[center_35%] sm:object-[20%_center] md:object-[15%_center] lg:object-center"
                            draggable={false}
                            decoding="async"
                        />

                        <div className="relative z-10 flex min-h-[inherit] w-full flex-row items-center justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 md:gap-6 md:px-8 md:py-7 lg:gap-8 lg:px-10 lg:py-8 xl:px-12 xl:py-9">
                            <div className="flex min-w-0 flex-1 flex-col justify-center text-left sm:max-w-[58%] md:max-w-[55%] lg:max-w-[52%]">
                                <h3 className="font-inter uppercase leading-[1.12] tracking-[0.04em] text-white">
                                    <span className="block text-[clamp(1.05rem,4.5vw,2rem)] font-bold">
                                        GIFT MORE.
                                    </span>
                                    <span className="mt-0.5 font-inter block text-[clamp(0.85rem,3.1vw,1.45rem)]  tracking-[0.20em] pl-14 font-normal ">
                                        GET MORE.
                                    </span>
                                </h3>

                                <div
                                    className="mt-2.5 h-px w-18 bg-white/90 sm:mt-3 sm:w-10 md:mt-3.5 md:w-12"
                                    aria-hidden
                                />

                                <p className="mt-2.5 font-inter text-[clamp(0.625rem,2.2vw,0.8125rem)] font-normal uppercase  tracking-[0.06em] text-white sm:mt-3 md:mt-3.5">
                                    Extra Value On{' '}
                                    <span className="font-bold">Every Purchase</span>
                                </p>

                                <div className="  flex items-center gap-2.5 sm:mt-4 sm:gap-3 md:mt-5">
                                    <GiftBoxCircleIcon />
                                    <p className="  font-inter text-[clamp(0.5625rem,1.9vw,0.75rem)] font-normal uppercase  tracking-[0.05em] text-white/95">
                                        The Joy Of Gifting - Now Even <br /> Better.
                                    </p>
                                </div>

                                <BuyGiftCta className="mt-8 sm:mt-5 md:mt-6 lg:mt-7" />
                            </div>

                            {giftCardImage ? (
                                <div className= "  flex w-[34%] max-w-[7.5rem] shrink-0 items-center justify-center sm:w-[38%] sm:max-w-none md:w-[40%] lg:w-[42%]">
                                    <img
                                        src={giftCardImage}
                                        alt={giftCardName}
                                        className="h-auto w-full  max-h-[min(8.5rem,32vw)] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:max-h-[min(11rem,36vw)] md:max-h-[13rem] lg:max-h-[15rem]"
                                        decoding="async"
                                        draggable={false}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
