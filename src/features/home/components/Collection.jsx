import React from 'react'
import { Link } from 'react-router-dom'
import collectionImage from '../../../assets/temporary/collection.png'
import { IoChevronForward } from "react-icons/io5"
import { ROUTES } from '../../../utils/constants'

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
      <div className="w-full bg-black py-8 sm:py-10 lg:py-20">
        <div className="px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24">

          {/* Header — responsive for all screens */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white uppercase tracking-tight">
              <span style={{ fontFamily: 'Inter, sans-serif' }}>EXPLORE </span>
              <span style={{ fontFamily: "'Headlines', sans-serif" }}>COLLECTIONS</span>
            </h2>
            <Link
              to={section?._id ? `${ROUTES.SEARCH}?sectionId=${section._id}&collection=1` : ROUTES.SEARCH}
              className="inline-flex items-center gap-2 uppercase text-sm tracking-widest text-white border-b border-white pb-1 hover:opacity-70 transition-opacity w-fit"
            >
              <span>Explore More</span>
              <IoChevronForward />
            </Link>
          </div>

          {/* Grid: 1 col phone, 2 col tablet, 4 col desktop */}
          <div className="grid grid-cols-1 min-[425px]:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-2">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="group relative rounded-2xl overflow-hidden border border-white/20"
              >
                <div className="relative aspect-[3/5]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                    <div className="rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-white/30 backdrop-blur-md border border-white/20">
                      <span
                        className="text-white text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wide block text-center"
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