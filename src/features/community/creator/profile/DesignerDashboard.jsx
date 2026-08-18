import { useState } from 'react'
import { CREATOR_DASHBOARD, DESIGNER_DASHBOARD } from '../../data/mockCreator'
import CreatorSettingsDrawer from './CreatorSettingsDrawer'

/**
 * Shared profile dashboard — same layout for creator & designer feed profiles.
 */
export default function DesignerDashboard({ mode = 'designer', onModeChange }) {
  const data = mode === 'creator' ? CREATOR_DASHBOARD : DESIGNER_DASHBOARD
  const topPosts = data.topPosts ?? []
  const showBreakdown =
    data.earnings?.creator != null || data.earnings?.royalties != null
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <aside className="scrollbar-hide w-full shrink-0 overflow-y-auto pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-inter text-lg font-bold text-black">Dashboard</h2>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-inter text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          {data.range}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {['creator', 'designer'].map((value) => {
            const active = mode === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange?.(value)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-inter text-[11px] font-medium capitalize transition ${
                  active
                    ? 'border-[#7C5CFF] bg-[#F3EEFF] text-[#7C5CFF]'
                    : 'border-[#D9D9D9] bg-white text-[#7A7A7A] hover:border-neutral-400'
                }`}
              >
                {value}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={`${mode === 'designer' ? 'Designer' : 'Creator'} settings`}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 11v5.5" />
              <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-stretch gap-3">
        <div className="flex min-w-0 flex-[1.7] flex-col rounded-[1.25rem] bg-[#EFEFEF] p-4 sm:p-5">
          <p className="font-inter text-xs font-medium text-neutral-500">Total Earnings</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <p className="font-inter text-[1.75rem] font-bold leading-none tracking-tight text-black">
              {data.earnings.total}
            </p>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 font-inter text-[11px] font-semibold text-emerald-600">
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 12V4M8 4L4.5 7.5M8 4l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {data.earnings.change}
            </span>
          </div>
          {showBreakdown ? (
            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-black/10 pt-3.5 font-inter text-xs text-neutral-500">
              <p>
                Creator Earnings
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.creator}
                </span>
              </p>
              <p>
                Design Royalties
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.royalties}
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-auto border-t border-black/10 pt-3.5 font-inter text-xs text-neutral-500">
              <p>
                Creator Earnings
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.total}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="flex w-[100px] shrink-0 flex-col gap-2.5 sm:w-[110px]">
          {data.summary.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col justify-center rounded-[1.15rem] bg-[#EFEFEF] px-3 py-2.5"
            >
              <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                {item.label}
              </p>
              <p className="mt-1 font-inter text-lg font-bold leading-none text-black">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-inter text-sm font-bold text-black">Earnings Per Post</h3>
          <button
            type="button"
            className="cursor-pointer font-inter text-xs font-medium text-neutral-400 transition hover:text-black"
          >
            Details
          </button>
        </div>
        <ul className="mt-3 divide-y divide-neutral-200/80">
          {data.earningsPerPost.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0">
              <span className="w-3.5 shrink-0 font-inter text-xs font-semibold text-neutral-400">
                {row.rank ?? index + 1}
              </span>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                <img src={row.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-inter text-sm font-semibold text-black">{row.title}</p>
                <p className="font-inter text-xs text-neutral-400">{row.views}</p>
              </div>
              <p className="shrink-0 font-inter text-sm font-semibold text-emerald-600">
                {row.earnings}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h3 className="font-inter text-sm font-bold text-black">Top Performing Posts</h3>
        <div className="scrollbar-hide mt-3 flex gap-2.5 overflow-x-auto pb-0.5">
          {topPosts.map((post) => (
            <article
              key={post.id}
              className="relative w-[96px] shrink-0 overflow-hidden rounded-xl sm:w-[104px]"
            >
              <div className={`aspect-[4/5] ${post.style}`}>
                {post.image ? (
                  <img
                    src={post.image}
                    alt=""
                    className="h-full w-full object-cover mix-blend-overlay"
                  />
                ) : null}
              </div>
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 font-inter text-[9px] font-semibold leading-none text-white">
                {post.views ?? post.earnings ?? post.place}
              </span>
            </article>
          ))}
        </div>
      </section>

      <CreatorSettingsDrawer
        open={settingsOpen}
        mode={mode}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  )
}
