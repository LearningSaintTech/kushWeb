const PHRASE = 'MADE IN INDIA'
const COPIES = 10

/**
 * MADE IN INDIA marquee — tight vertical padding, Montserrat 600, lh 124%.
 */
export default function MadeInIndiaMarquee() {
  const row = (
    <div className="flex shrink-0 items-center whitespace-nowrap">
      {Array.from({ length: COPIES }, (_, i) => (
        <span
          key={i}
          className="font-montserrat inline-flex shrink-0 items-center px-10 text-xs uppercase  text-white sm:px-14 sm:text-[13px] md:px-16 md:text-sm  lg:px-20 lg:text-[45px]"
          style={{ fontWeight: 600, lineHeight: '100%' }}
        >
          {PHRASE}
        </span>
      ))}
    </div>
  )

  return (
    <section
      className="relative z-10 w-full shrink-0 overflow-hidden border-4 border-white bg-black"
      aria-label="Made in India"
    >
      <div className="made-in-india-marquee flex w-max py-2 sm:py-2.5 md:py-2.5">
        {row}
        <div aria-hidden>{row}</div>
      </div>
      <div className="h-px w-full bg-white" aria-hidden />
    </section>
  )
}
