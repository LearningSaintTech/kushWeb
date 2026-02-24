import React from 'react'
import { Link } from 'react-router-dom'
import collectionImage from '../../../assets/temporary/collection.png'
import { IoChevronForward } from "react-icons/io5";

const COLLECTIONS = [
  { id: 'mens', title: "MEN'S COLLECTION", image: collectionImage, to: '/search?category=men' },
  { id: 'womens', title: "WOMEN'S COLLECTION", image: collectionImage, to: '/search?category=women' },
  { id: 'unisex', title: 'UNISEX COLLECTION', image: collectionImage, to: '/search?category=unisex' },
  { id: 'couple', title: 'COUPLE COLLECTION', image: collectionImage, to: '/search?category=couple' },
]

function Collection({ section }) {
  const items = section?.categories?.length
    ? section.categories.map((cat) => ({
        id: cat._id,
        title: cat.name ? `${cat.name.toUpperCase()} COLLECTION` : '',
        image: cat.imageUrl || collectionImage,
        to: `/search?categoryId=${cat._id}`,
      }))
    : COLLECTIONS
  return (
    <section className="w-full overflow-visible">

      {/* ================= MOBILE / TABLET (< lg) — image format ================= */}
      <div className="collection-mobile-only w-full min-h-[300px] bg-white py-8 px-4 sm:px-5 md:hidden">

        {/* Vector 22 banner */}
        <div className="mb-4 rounded-lg bg-sky-200 px-4 py-2 shadow-sm">
          <span className="text-white text-sm font-medium tracking-wide">— Vector 22</span>
        </div>

        {/* COUPLES subtitle with decorative lines */}
        <div className="flex items-center gap-3 mb-1">
          <span className="flex-1 border-t border-gray-300" />
          <p className="text-xs tracking-widest uppercase text-black shrink-0">
            COUPLES
          </p>
          <span className="flex-1 border-t border-gray-300" />
        </div>

        {/* Large COUPLES title */}
        <h2 className="text-5xl sm:text-6xl font-impact leading-none uppercase text-black">
          COUPLES
        </h2>

        {/* COLLECTION subtitle with decorative lines */}
        <div className="flex items-center gap-3 mt-1 mb-6">
          <span className="flex-1 border-t border-gray-300" />
          <p className="text-xs tracking-widest uppercase text-black shrink-0">
            COLLECTION
          </p>
          <span className="flex-1 border-t border-gray-300" />
        </div>

        {/* Large stacked images */}
        <div className="space-y-6">
          <img
            src={collectionImage}
            alt="Couples Collection"
            className="w-full object-cover aspect-[3/4]"
          />
          <img
            src={collectionImage}
            alt="Couples Collection"
            className="w-full object-cover aspect-[3/4]"
          />
        </div>

        {/* Bottom: COLLECTI (outlined) + ON (solid) */}
        <div className="mt-8">
          <h2 className="text-4xl sm:text-5xl font-impact uppercase tracking-wide leading-none">
            <span
              className="font-normal"
              style={{ color: 'transparent', WebkitTextStroke: '2px black' }}
            >
              COLLECTI
            </span>
            <span className="text-black font-black">ON</span>
          </h2>
        </div>
      </div>


      {/* ================= DESKTOP (≥ lg) ================= */}
      <div className="collection-desktop-only w-full hidden md:block bg-black py-10 lg:py-20">
        <div className="px-8 lg:px-16 xl:px-24">

          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-5xl font-bold text-white uppercase tracking-tight">
              <span style={{ fontFamily: 'Inter, sans-serif' }}>EXPLORE </span>
              <span style={{ fontFamily: "'Headlines', sans-serif" }}>COLLECTIONS</span>
            </h2>

            <Link
              to="/"
              className="inline-flex items-center gap-2 uppercase text-sm tracking-widest text-white border-b border-white pb-1 hover:opacity-70 transition-opacity"
            >
              <span>Explore More</span>
              <IoChevronForward />
            </Link>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="group relative rounded-2xl overflow-hidden border border-white/20"
              >
                <div className="relative aspect-[3/4]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="rounded-xl px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20">
                      <span
                        className="text-white text-xl font-bold uppercase tracking-wide block text-center"
                        style={{ fontFamily: "'Headlines', sans-serif" }}
                      >
                        {item.title}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>

    </section>
  )
}

export default Collection