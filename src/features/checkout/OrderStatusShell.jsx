import { Helmet } from 'react-helmet-async'

const VARIANTS = {
  success: {
    headerClass: 'bg-black',
    iconWrapClass: 'border-white/30 bg-white/10',
    iconClass: 'text-white',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    ),
  },
  failed: {
    headerClass: 'bg-red-950',
    iconWrapClass: 'border-white/30 bg-white/10',
    iconClass: 'text-white',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    ),
  },
  cancelled: {
    headerClass: 'bg-zinc-900',
    iconWrapClass: 'border-white/30 bg-white/10',
    iconClass: 'text-white',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    ),
  },
}

export default function OrderStatusShell({
  id,
  variant = 'success',
  helmetTitle,
  title,
  subtitle,
  message,
  dataAttrs = {},
  details = [],
  children,
}) {
  const style = VARIANTS[variant] || VARIANTS.success

  return (
    <>
      <Helmet>
        <title>{helmetTitle}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div
        id={id}
        className="min-h-screen bg-gray-50 pt-28 pb-16 font-inter text-black"
        {...dataAttrs}
      >
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div
              className={`border-b border-gray-100 px-6 py-8 text-center sm:px-10 ${style.headerClass}`}
            >
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 ${style.iconWrapClass}`}
              >
                <svg
                  className={`h-7 w-7 ${style.iconClass}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  {style.icon}
                </svg>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-white sm:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 text-sm text-white/80 sm:text-base">{subtitle}</p>
              ) : null}
            </div>

            <div className="space-y-6 px-6 py-8 sm:px-10">
              {message ? (
                <p className="text-center text-sm leading-relaxed text-gray-600 sm:text-base">
                  {message}
                </p>
              ) : null}

              {details.length > 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                  <dl className="space-y-3 text-sm">
                    {details.map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-wrap items-start justify-between gap-2"
                      >
                        <dt className="font-medium uppercase tracking-wider text-gray-500">
                          {row.label}
                        </dt>
                        <dd className="font-medium text-gray-900 text-right">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
