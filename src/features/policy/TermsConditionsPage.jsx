import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PolicyPageLayout from './PolicyPageLayout'
import { termsService } from '../../services/terms.service.js'
import { ROUTES } from '../../utils/constants'

/**
 * Parses markdown terms content into introductory paragraphs and
 * ordered, point-wise sections with headings and bullet lists.
 */
function parseTermsMarkdown(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { intro: [], sections: [] }
  }

  // Split content by markdown section headings "## <heading>"
  const parts = rawContent.split(/\n(?=##\s+)/)
  let introText = ''
  const rawSections = []

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('##')) {
      rawSections.push(trimmed)
    } else if (!introText) {
      introText = trimmed
    }
  }

  const introParagraphs = introText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const sections = rawSections
    .map((sec, idx) => {
      const lines = sec.split('\n')
      const headingLine = lines[0].replace(/^##\s+/, '').trim()
      const bodyLines = lines.slice(1).join('\n').trim()

      // Extract section number and title (e.g., "1. Acceptance of Terms")
      const match = headingLine.match(/^(\d+)\.\s*(.+)$/)
      const number = match ? parseInt(match[1], 10) : idx + 1
      const title = match ? match[2].trim() : headingLine

      // Parse blocks inside the section
      const rawBlocks = bodyLines.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
      const blocks = []

      for (const block of rawBlocks) {
        const blockLines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const isAllList = blockLines.every((l) => /^[-*•]\s+/.test(l))

        if (isAllList) {
          blocks.push({
            type: 'list',
            items: blockLines.map((l) => l.replace(/^[-*•]\s+/, '').trim()),
          })
        } else {
          // Check if mixed with bullet items
          const hasBullets = blockLines.some((l) => /^[-*•]\s+/.test(l))
          if (hasBullets) {
            let currentParas = []
            for (const line of blockLines) {
              if (/^[-*•]\s+/.test(line)) {
                if (currentParas.length) {
                  blocks.push({ type: 'paragraph', text: currentParas.join(' ') })
                  currentParas = []
                }
                blocks.push({
                  type: 'list',
                  items: [line.replace(/^[-*•]\s+/, '').trim()],
                })
              } else {
                currentParas.push(line)
              }
            }
            if (currentParas.length) {
              blocks.push({ type: 'paragraph', text: currentParas.join(' ') })
            }
          } else {
            blocks.push({
              type: 'paragraph',
              text: block,
            })
          }
        }
      }

      // Merge adjacent list blocks for clean <ul> grouping
      const mergedBlocks = []
      for (const b of blocks) {
        const last = mergedBlocks[mergedBlocks.length - 1]
        if (b.type === 'list' && last && last.type === 'list') {
          last.items.push(...b.items)
        } else {
          mergedBlocks.push(b)
        }
      }

      return {
        id: `section-${number}`,
        number,
        heading: headingLine,
        title,
        blocks: mergedBlocks,
      }
    })
    // Enforce 100% correct ascending numerical ordering
    .sort((a, b) => a.number - b.number)

  return {
    intro: introParagraphs,
    sections,
  }
}

/** Formats dates like "September 23, 2026" */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Renders emails, web URLs, and policy references as interactive links */
function renderWithLinks(text) {
  if (!text) return null

  // Match URLs, email addresses, or common policy names
  const regex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|Privacy Policy|Return(?:,\s*Exchange)?\s*(?:&|and)\s*Refund Policy|Shipping\s*(?:&|and)\s*Delivery Policy)/g

  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (!part) return null

    if (part.includes('@')) {
      return (
        <a
          key={i}
          href={`mailto:${part}`}
          className="font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {part}
        </a>
      )
    }

    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {part}
        </a>
      )
    }

    if (/privacy policy/i.test(part)) {
      return (
        <Link
          key={i}
          to={ROUTES.PRIVACY_POLICY}
          className="font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {part}
        </Link>
      )
    }

    if (/return.*refund/i.test(part)) {
      return (
        <Link
          key={i}
          to={ROUTES.RETURN_POLICY}
          className="font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {part}
        </Link>
      )
    }

    if (/shipping.*delivery/i.test(part)) {
      return (
        <Link
          key={i}
          to={ROUTES.SHIPPING_DELIVERY_POLICY}
          className="font-medium text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {part}
        </Link>
      )
    }

    return part
  })
}

export default function TermsConditionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTerm, setActiveTerm] = useState(null)

  const fetchTerms = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await termsService.getAll({ page: 1, limit: 20 })
      const data = res?.data?.data ?? res?.data ?? {}
      const termsList = Array.isArray(data?.terms)
        ? data.terms
        : Array.isArray(data)
          ? data
          : []

      // Pick the active term, preferring the most recent active one
      const active =
        termsList.find((t) => t.isActive === true) ||
        termsList[0] ||
        null

      setActiveTerm(active)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load terms and conditions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTerms()
  }, [])

  const { intro, sections } = useMemo(() => {
    if (!activeTerm?.content) return { intro: [], sections: [] }
    return parseTermsMarkdown(activeTerm.content)
  }, [activeTerm?.content])

  const effectiveDate = useMemo(() => {
    return formatDate(activeTerm?.effectiveDate || activeTerm?.updatedAt || activeTerm?.createdAt)
  }, [activeTerm])

  return (
    <PolicyPageLayout title={activeTerm?.title || 'Terms & Conditions'}>
      {/* Header Meta Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 mb-6">
        <p className="text-xs uppercase tracking-wider text-gray-500 sm:text-sm">
          {effectiveDate ? `Effective Date: ${effectiveDate}` : 'Official Terms of Use'}
        </p>
        {activeTerm?.version && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-700">
            Version {activeTerm.version}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
          <p className="mt-3 text-sm text-gray-500">Loading terms and conditions...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchTerms}
            className="mt-4 rounded-full bg-black px-6 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dynamic Content Display */}
      {!loading && !error && activeTerm && (
        <div className="space-y-8 font-inter">
          {/* Introductory Paragraphs */}
          {intro.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-5 sm:p-7 space-y-3 text-sm sm:text-base leading-relaxed text-gray-800">
              {intro.map((para, i) => (
                <p key={i} className="leading-relaxed">
                  {renderWithLinks(para)}
                </p>
              ))}
            </div>
          )}

          {/* Quick Table of Contents / Index Bar */}
          {sections.length > 3 && (
            <nav
              aria-label="Table of contents"
              className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs"
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500 mb-3">
                Contents ({sections.length} Sections)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs sm:text-sm">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center gap-2 truncate text-gray-600 hover:text-black hover:underline transition-colors py-1"
                  >
                    <span className="font-semibold text-black shrink-0">{sec.number}.</span>
                    <span className="truncate">{sec.title}</span>
                  </a>
                ))}
              </div>
            </nav>
          )}

          {/* Ordered, Point-Wise Sections */}
          <div className="space-y-10 divide-y divide-gray-200">
            {sections.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="pt-8 first:pt-0 scroll-mt-28"
              >
                {/* Section Heading */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs sm:text-sm font-bold text-white">
                    {sec.number}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-black">
                    {sec.title}
                  </h2>
                </div>

                {/* Section Content Blocks */}
                <div className="pl-0 sm:pl-11 space-y-4">
                  {sec.blocks.map((block, bIdx) => {
                    if (block.type === 'list') {
                      return (
                        <ul
                          key={bIdx}
                          className="my-3 space-y-2.5 rounded-lg bg-gray-50/60 p-4 sm:p-5 border border-gray-100"
                        >
                          {block.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-3 text-sm sm:text-base leading-relaxed text-gray-800">
                              <span
                                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black"
                                aria-hidden="true"
                              />
                              <span className="flex-1 break-words">
                                {renderWithLinks(item)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )
                    }

                    return (
                      <p
                        key={bIdx}
                        className="text-sm sm:text-base leading-relaxed text-gray-700 break-words"
                      >
                        {renderWithLinks(block.text)}
                      </p>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </PolicyPageLayout>
  )
}
