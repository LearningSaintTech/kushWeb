import React from 'react'
import { Link } from 'react-router-dom'
import { IoChevronForward } from 'react-icons/io5'
import { ROUTES } from '../../../utils/constants'

import leftImage from '../../../assets/temporary/couples.png'
import rightImage from '../../../assets/temporary/couples.png'

const Couples = ({ section }) => {
  const exploreTo = section?._id ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}` : `${ROUTES.SEARCH}?itemsOnly=1`

  const title = section?.title || 'Couples'
  const titleUpper = title.toUpperCase()

  return (
    <section className="relative overflow-visible py-10 md:py-20">
      <div className="relative mx-auto w-full max-w-full px-4 md:max-w-[90vw] md:px-0">

        {/* ================= MOBILE + TABLET (UNCHANGED) ================= */}
        <div className="flex flex-col items-start text-start mb-6 md:hidden">
          <div className="flex items-center justify-start gap-4 w-full">
            <p className="text-sm tracking-[0.25em] uppercase font-semibold text-black">
              {titleUpper}
            </p>
            <div className="flex-1 max-w-24 h-px bg-black" />
          </div>

          <h2
            className="leading-none text-black mt-2 w-full"
            style={{
              fontSize: 72,
              fontFamily: 'Impact',
              fontWeight: 400,
              textTransform: 'uppercase',
            }}
          >
            {titleUpper}
          </h2>

          <div className="flex items-center justify-start gap-4 w-full mt-2">
            <div className="flex-1 max-w-16 h-px bg-black" />
            <span className="text-sm tracking-[0.25em] uppercase font-semibold text-black">
              COLLECTION
            </span>
          </div>
        </div>

        {/* ================= IMAGE GRID: stacked on mobile/tablet, closer on desktop ================= */}
        <div className="grid grid-cols-1 md:flex md:flex-row md:justify-center md:items-center md:gap-3 relative">

          {/* LEFT IMAGE */}
          <div className="relative md:w-[38vw]">
            <img
              src={leftImage}
              alt="Couples collection"
              className="block w-full h-auto object-cover max-h-[85vh] md:h-[44vw]"
            />
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative md:w-[38vw]">
            <img
              src={rightImage}
              alt="Couples collection"
              className="block w-full h-auto object-cover max-h-[85vh] mt-2 md:mt-0 md:h-[44vw]"
            />

            {/* Desktop Explore - responsive for all screens > 768px */}
            <Link
              to={exploreTo}
              className="hidden underline decoration-1 decoration-black underline-offset-6 md:flex flex-col items-center  p-2 absolute top-1/2 -translate-y-1/2 z-20 group right-[-12vw] lg:right-[-11vw] xl:right-[-5vw] 2xl:right-[-6vw]"
            >
              <span className="text-xs  md:text-sm tracking-[0.2em]  md:tracking-[0.25em] uppercase font-light flex items-center gap-1 group-hover:opacity-70 transition-opacity">
                Explore
                <IoChevronForward className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </span>
             </Link>
          </div>

          {/* ================= DESKTOP ONLY UI (UPDATED TO MATCH IMAGE) ================= */}

          {/* LEFT BIG TEXT */}
          <div className="hidden md:block absolute left-[-2vw] top-10 z-30">
            <div className="flex items-center gap-4">
              <p className="text-sm tracking-[0.3em] uppercase font-semibold">
                {titleUpper}
              </p>
              <div className="w-[10vw] h-px bg-black" />
            </div>

            <h2
              className="uppercase leading-none mt-3"
              style={{
                fontFamily: 'Impact',
                fontSize: '7vw',
                letterSpacing: '-1px',
              }}
            >
              {titleUpper}
            </h2>

            <div className="flex items-center gap-4 mt-2">
              <div className="w-39 h-px bg-black" />
              <span className="text-sm tracking-[0.25em] uppercase font-semibold text-black">
                COLLECTION
              </span>
            </div>
          </div>

          {/* RIGHT OUTLINED COLLECTION */}
          <div className="hidden md:block absolute bottom-12 right-[-3vw] z-30 text-right">
            <h2
              className="uppercase leading-none"
              style={{
                fontFamily: 'Impact',
                fontSize: '7vw',
              }}
            >
              <span
                className="text-white"
                style={{
                  WebkitTextStroke: '1.5px black',
                  paintOrder: 'stroke fill',
                }}
              >
                COLLECTI
              </span>
              <span className="text-black">ON</span>
            </h2>
          </div>
        </div>

        {/* ================= MOBILE + TABLET: Collection text below images (same stroke as desktop) ================= */}
        <div className="md:hidden mt-6 px-4">
          <h2
            className="uppercase leading-none"
            style={{
              fontSize: 72,
              fontFamily: 'Impact',
              fontWeight: 400,
              wordWrap: 'break-word',
            }}
          >
            <span
              className="text-white"
              style={{
                WebkitTextStroke: '1.5px black',
                paintOrder: 'stroke fill',
              }}
            >
              COLLECTI
            </span>
            <span className="text-black">ON</span>
          </h2>
        </div>

        {/* ================= MOBILE EXPLORE (UNCHANGED) ================= */}
        <div className="flex justify-center mt-5 md:hidden">
          <Link to={exploreTo} className="flex flex-col items-center group">
            <span className="text-sm tracking-[0.25em] uppercase font-light flex items-center gap-1">
              Explore
              <IoChevronForward />
            </span>
            <div className="w-24 h-px bg-black mt-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Couples