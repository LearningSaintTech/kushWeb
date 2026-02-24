import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import collectionImage from '../../../assets/temporary/collection.png'

const CATEGORY_TABS = ['MEN', 'WOMEN', 'UNISEX', 'COUPLES']

const CATEGORY_CARDS = [
  { id: 1, title: 'BLAZERS', image: productImage, hoverImage: hoverProductImage },
  { id: 2, title: 'SHIRTS', image: productImage, hoverImage: hoverProductImage },
  { id: 3, title: 'JEANS', image: collectionImage, hoverImage: collectionImage },
  { id: 4, title: 'TOPS', image: productImage, hoverImage: hoverProductImage },
  { id: 5, title: 'DRESSES', image: collectionImage, hoverImage: collectionImage },
  { id: 6, title: 'SKIRTS', image: productImage, hoverImage: hoverProductImage },
  { id: 7, title: 'JACKETS', image: collectionImage, hoverImage: collectionImage },
  { id: 8, title: 'TROUSERS', image: productImage, hoverImage: hoverProductImage },
]

function mapCategoryToCard(cat, useSubcategoryLink = false) {
  const id = cat._id ?? cat.id
  return {
    id,
    title: (cat.name ?? '').toUpperCase() || 'Category',
    image: cat.imageUrl || productImage,
    hoverImage: cat.imageUrl || hoverProductImage,
    to: useSubcategoryLink ? `/search?subcategoryId=${id}` : `/search?categoryId=${id}`,
  }
}

function OurCategory({ section }) {
  const [activeTab, setActiveTab] = useState('MEN')
  const cardsFromSection =
    section?.categories?.length > 0
      ? section.categories.map((cat) => mapCategoryToCard(cat, false))
      : section?.subcategories?.length > 0
        ? section.subcategories.map((cat) => mapCategoryToCard(cat, true))
        : null
  const cards = cardsFromSection || CATEGORY_CARDS
  const sectionTitle = section?.title || 'OUR CATEGORY'

  const categoryTabs =
    section?.categories?.length > 0
      ? section.categories.map((c) => (c.name ?? '').toUpperCase() || c._id)
      : section?.subcategories?.length > 0
        ? [...new Set(section.subcategories.map((s) => (s.name ?? '').toUpperCase() || s._id).filter(Boolean))]
        : CATEGORY_TABS

  useEffect(() => {
    if (categoryTabs.length > 0 && !categoryTabs.includes(activeTab)) {
      setActiveTab(categoryTabs[0])
    }
  }, [section])

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-20">
      <div className="px-4 sm:px-8 lg:px-16 xl:px-24">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col items-center mb-10">

          <h2 className="font-raleway text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-wide text-black text-center">
            {sectionTitle}
          </h2>

          {/* Single row, horizontally scrollable category tabs */}
          <div className="mt-6 w-full overflow-x-auto overflow-y-hidden">
            <div className="flex flex-nowrap gap-6 justify-start items-center min-w-max">
              {categoryTabs.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveTab(cat)}
                  className={`flex-shrink-0 whitespace-nowrap uppercase pb-2 text-sm sm:text-base font-medium tracking-widest transition-all border-b-2 ${
                    activeTab === cat
                      ? 'text-black font-bold border-black'
                      : 'text-gray-400 border-transparent hover:text-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================= GRID ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">

          {cards.map((card) => {
            const Wrapper = card.to ? Link : 'div'
            const wrapperProps = card.to ? { to: card.to } : {}
            return (
              <Wrapper
                key={card.id}
                {...wrapperProps}
                className={card.to ? "group relative overflow-hidden bg-gray-100 rounded-xl transition-all duration-500 hover:shadow-xl block" : "group relative overflow-hidden bg-gray-100 rounded-xl transition-all duration-500 hover:shadow-xl"}
              >
                <div className="relative aspect-[3/4]">

                  {/* Default image */}
                  <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 group-hover:opacity-0"
                  />

                  {/* Hover image */}
                  <img
                    src={card.hoverImage}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-700" />

                  {/* Title */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <span className="text-white text-sm sm:text-lg lg:text-xl font-bold uppercase tracking-wide 
                    opacity-100 sm:opacity-0 sm:translate-y-6 
                    sm:group-hover:translate-y-0 sm:group-hover:opacity-100 
                    transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]">
                      {card.title}
                    </span>
                  </div>

                </div>
              </Wrapper>
            )
          })}

        </div>

      </div>
    </section>
  )
}

export default OurCategory