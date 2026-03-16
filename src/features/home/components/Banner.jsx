import { useEffect, useState } from 'react'
import { bannerService } from '../../../services/content.service.js'
import { getPublicImageUrl } from '../../../services/config.js'

const Banner = () => {
  const [desktopBanner, setDesktopBanner] = useState(null)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    bannerService
      .getAll({ isActive: true, limit: 1, page: 1 })
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.data?.banners || []
        const banner = list[0]
        if (!banner?.desktopBanner) return
        const db = banner.desktopBanner
        if (db.items?.length) {
          setDesktopBanner({ type: db.type, items: db.items })
        } else if (db.url && db.key) {
          setDesktopBanner({ type: 'image', items: [{ url: db.url, key: db.key }] })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!desktopBanner || desktopBanner.type !== 'image' || desktopBanner.items.length <= 1) return
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % desktopBanner.items.length)
    }, 5000)
    return () => clearInterval(t)
  }, [desktopBanner])

  if (!desktopBanner?.items?.length) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-screen overflow-hidden bg-neutral-100" />
    )
  }

  const isVideo = desktopBanner.type === 'video'
  const items = desktopBanner.items
  const singleImage = !isVideo && items.length === 1

  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-screen overflow-hidden">
      {isVideo ? (
        <video
          src={getPublicImageUrl(items[0].url)}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : singleImage ? (
        <img
          src={getPublicImageUrl(items[0].url)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : (
        <>
          {items.map((item, i) => (
            <img
              key={item.key || i}
              src={getPublicImageUrl(item.url)}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
                i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            />
          ))}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setSlideIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === slideIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Banner
