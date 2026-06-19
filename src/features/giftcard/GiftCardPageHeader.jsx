import giftCardTitle from '../../assets/images/giftcard/giftcardhearder.png'

export default function GiftCardPageHeader({ className = '' }) {
  return (
    <header className={`w-full text-center ${className}`}>
      <img
        src={giftCardTitle}
        alt="Gift Card"
        className="mx-auto block h-auto w-full max-w-[9rem] sm:max-w-[11rem] md:max-w-[13rem] lg:max-w-[15rem]"
        decoding="async"
        draggable={false}
      />
      <h1 className="mt-2 font-inter text-[clamp(1.25rem,4vw,2.25rem)] font-bold uppercase leading-tight tracking-[0.02em] text-black sm:mt-2.5 md:mt-3">
        <span className="font-extrabold">Gift More.</span>{' '}
        <span className="font-normal">Get More.</span>
      </h1>
      <p className="mt-2 font-inter text-[clamp(0.6875rem,2vw,0.9375rem)] font-normal leading-snug text-black sm:mt-2.5">
        Buy A Gift Card And Get{' '}
        <span className="font-normal italic">Extra</span>  Value.
      </p>
    </header>
  )
}
