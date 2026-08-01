import { Link } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'

/**
 * Our Story — centered; natural balanced wrap (no forced mid-sentence breaks).
 * CTA → About Us. Placed before Our Products.
 */
export default function OurStory() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 md:py-20 lg:py-24">
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center text-center">
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[#A3A3A3] sm:text-xs">
          Our Story
        </p>

        <p className="mt-6 w-full text-pretty font-inter text-xl  font-semibold leading-snug tracking-tight text-black sm:mt-7 sm:text-[1.5rem] sm:leading-[1.38] md:text-[1.75rem] md:leading-[1.35] lg:text-[1.875rem]">
          Khush is not just clothing. It is a feeling. We design pieces that
          move with your mood and make everyday dressing feel more personal.
        </p>

        <Link
          to={ROUTES.ABOUT_US}
          className="mt-9 inline-flex cursor-pointer items-center justify-center border border-black bg-white px-7 py-3 font-inter text-[11px] font-medium uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white sm:mt-10 sm:px-8 sm:text-xs"
        >
          Read Our Story
        </Link>
      </div>
    </section>
  )
}
