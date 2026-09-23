import { useEffect, useRef, useState } from 'react'

/**
 * Clamps long captions and toggles See more / See less when the text overflows.
 */
export default function ExpandableCaption({
  text = '',
  prefix = null,
  className = 'font-inter text-sm leading-relaxed',
  collapsedClassName = 'line-clamp-2',
  buttonClassName = 'mt-1 cursor-pointer font-inter text-sm font-medium text-neutral-500 transition hover:text-neutral-700',
}) {
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [canToggle, setCanToggle] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [text])

  useEffect(() => {
    const el = ref.current
    if (!el || !String(text).trim()) {
      setCanToggle(false)
      return undefined
    }

    const measure = () => {
      if (expanded) return
      setCanToggle(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    const frame = window.requestAnimationFrame(measure)
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => {
      window.cancelAnimationFrame(frame)
      ro?.disconnect()
    }
  }, [text, expanded, collapsedClassName, prefix])

  if (!String(text).trim() && !prefix) return null

  return (
    <div>
      <p ref={ref} className={`${className} ${expanded ? '' : collapsedClassName}`}>
        {prefix}
        {text}
      </p>
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={buttonClassName}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  )
}
