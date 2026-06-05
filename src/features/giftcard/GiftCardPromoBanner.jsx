import giftCardPromo from '../../assets/images/giftcard/gift-card-promo.png'

const SIZE_CLASSES = {
  default:
    'max-w-[14rem] sm:max-w-[16rem] md:max-w-[18rem] lg:max-w-[20rem]',
  compact:
    'max-w-[12rem] sm:max-w-[14rem] md:max-w-[16rem]',
}

export default function GiftCardPromoBanner({ className = '', id, size = 'default', imageUrl }) {
  const src = imageUrl || giftCardPromo
  return (
    <div className={`w-full text-center ${className}`}>
      <img
        id={id}
        src={src}
        alt="Gift Card — Gift more, get more. Buy a gift card and get double the value."
        className={`mx-auto block h-auto w-full object-contain ${SIZE_CLASSES[size] ?? SIZE_CLASSES.default}`}
        decoding="async"
        loading="lazy"
        draggable={false}
      />
    </div>
  )
}
