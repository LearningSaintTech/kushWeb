import { useEffect, useState } from 'react'
import giftCardPromo from '../../assets/images/giftcard/gift-card-promo.png'

export default function GiftCardPromoBanner({
  className = '',
  id,
  imageUrl,
}) {
  const [imgSrc, setImgSrc] = useState(giftCardPromo)

  useEffect(() => {
    if (imageUrl) {
      setImgSrc(imageUrl)
      return
    }
    setImgSrc(giftCardPromo)
  }, [imageUrl])

  return (
    <div className={`w-full ${className}`}>
      <div className="mx-auto w-full max-w-[min(100%,22rem)] overflow-hidden rounded-lg bg-neutral-50">
        <div className="relative aspect-[16/10] w-full sm:aspect-[5/3]">
          <img
            id={id}
            src={imgSrc}
            alt="Khush Gift Card — Gift more, get more"
            className="absolute inset-0 h-full w-full object-contain object-center p-1 sm:p-2"
            decoding="async"
            loading="eager"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => {
              setImgSrc((current) => (current !== giftCardPromo ? giftCardPromo : current))
            }}
          />
        </div>
      </div>
    </div>
  )
}
