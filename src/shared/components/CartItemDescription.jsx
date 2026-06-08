import { useState, useRef, useLayoutEffect, useEffect } from 'react'

/** Two-line clamp with See more / See less when text overflows. */
export default function CartItemDescription({ text }) {
  const desc = String(text ?? '').trim()
  const [expanded, setExpanded] = useState(false)
  const [exceedsTwoLines, setExceedsTwoLines] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setExpanded(false)
    setExceedsTwoLines(false)
  }, [desc])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !desc) return

    const measure = () => {
      if (expanded) return
      setExceedsTwoLines(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [desc, expanded])

  if (!desc) return null

  return (
    <div className="min-w-0 w-full">
      <p
        ref={ref}
        className={`mt-0.5 text-sm font-normal normal-case text-gray-600 ${
          !expanded ? 'line-clamp-2' : ''
        }`}
      >
        {desc}
      </p>
      {exceedsTwoLines ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-600 underline decoration-gray-400 underline-offset-2 hover:text-black sm:text-xs"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  )
}
