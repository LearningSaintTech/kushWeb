const FEATURES = [
  {
    n: '01',
    title: 'Premium cotton',
    body: '220–500 GSM fabrics chosen per garment, never one-weight-fits-all.',
  },
  {
    n: '02',
    title: 'Breathable fabrics',
    body: 'Loose weaves and natural fibres that move air, not trap it.',
  },
  {
    n: '03',
    title: 'Durable stitching',
    body: 'Double-needle seams and bar-tacked stress points, built to last years.',
  },
  {
    n: '04',
    title: 'Relaxed fits',
    body: 'Silhouettes engineered for movement — never boxy by accident.',
  },
  {
    n: '05',
    title: 'Carefully sourced',
    body: 'Mill-audited cotton and low-impact dyes across the range.',
  },
  {
    n: '06',
    title: 'Built for every season',
    body: 'Tested against summer humidity, full-sun afternoons, and layered winters.',
  },
  {
    n: '07',
    title: 'Easy to style',
    body: 'A palette and cut system where everything pairs with everything.',
  },
  {
    n: '08',
    title: 'Built for repeat wear',
    body: 'Colour-fast, shape-retaining, and machine-wash friendly.',
  },
]

const ROWS = [
  [FEATURES[0], FEATURES[1]],
  [FEATURES[2], FEATURES[3]],
  [FEATURES[4], FEATURES[5]],
  [FEATURES[6], FEATURES[7]],
]

function FeatureCell({ item }) {
  return (
    <div className="min-w-0 border-t border-[#E5E5E5] py-5 pr-3 sm:py-6 sm:pr-6 lg:pr-8 xl:py-7 xl:pr-10 2xl:py-8">
      <div className="flex items-baseline gap-2 xl:gap-2.5">
        <span className="w-6 shrink-0 font-inter text-[12px] font-normal leading-none text-[#A3A3A3] tabular-nums xl:w-7 xl:text-[13px] 2xl:text-sm">
          {item.n}
        </span>

        <h3 className="font-inter text-[15px] font-bold leading-snug text-black xl:text-base 2xl:text-[17px]">
          {item.title}
        </h3>
      </div>

      <p className="mt-1.5 max-w-[280px] pl-8 font-inter text-[13px] font-normal leading-[1.55] text-[#888888] xl:mt-2 xl:max-w-[340px] xl:pl-9 xl:text-[14px] 2xl:max-w-[380px] 2xl:text-[15px]">
        {item.body}
      </p>
    </div>
  )
}

/**
 * Fabric & Craft — matches design SS; placed before Our Products.
 */
export default function FabricCraft() {
  return (
    <section className="bg-white py-14 md:py-16 lg:py-20 xl:py-24 2xl:py-28">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10 xl:max-w-[1440px] xl:px-14 2xl:max-w-[1680px] 2xl:px-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-12 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] xl:gap-20 2xl:gap-24">
          {/* Left intro */}
          <div className="max-w-[380px] xl:max-w-[460px] 2xl:max-w-[520px]">
            <p className="font-inter text-[11px] font-medium uppercase tracking-[0.16em] text-[#A3A3A3] xl:text-xs">
              Fabric &amp; Craft
            </p>
            <h2 className="mt-4 font-inter text-[28px] font-bold uppercase leading-[1.08] tracking-[-0.02em] text-black sm:text-[34px] lg:text-[42px] lg:leading-[1.05] xl:mt-5 xl:text-[48px] 2xl:text-[56px]">
              Quality you can feel before you see
            </h2>
            <p className="mt-5 max-w-[320px] font-inter text-[15px] font-normal leading-[1.6] text-[#737373] xl:mt-6 xl:max-w-[400px] xl:text-base 2xl:max-w-[440px] 2xl:text-[17px]">
              We obsess over the details you touch every day — fabric weight,
              seam strength, and finishes that survive real life.
            </p>
          </div>

          {/* Right feature grid — row rules only on this side */}
          <div>
            {ROWS.map((pair, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-1 gap-x-12 sm:grid-cols-2 xl:gap-x-16 2xl:gap-x-20"
              >
                <FeatureCell item={pair[0]} />
                <FeatureCell item={pair[1]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
