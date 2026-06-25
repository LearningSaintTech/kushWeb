import { useEffect, useMemo, useState } from 'react'
import { debugLog, debugError } from '../../utils/debugLog.js';
import PolicyPageLayout from './PolicyPageLayout'
import { faqService } from '../../services/faq.service.js'

function formatTopicLabel(topic) {
  const t = (topic || 'general').trim()
  if (!t || t.toLowerCase() === 'general') return 'General'
  return t
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function groupFaqsByTopic(faqs) {
  const map = new Map()
  for (const faq of faqs) {
    const key = (faq.topic || 'general').trim().toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(faq)
  }

  return [...map.entries()]
    .map(([topicKey, items]) => ({
      topicKey,
      label: formatTopicLabel(topicKey),
      items: [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .sort((a, b) => {
      const minA = Math.min(...a.items.map((f) => f.order ?? Number.MAX_SAFE_INTEGER))
      const minB = Math.min(...b.items.map((f) => f.order ?? Number.MAX_SAFE_INTEGER))
      return minA - minB
    })
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const { faqs: list, pagination } = await faqService.getAll({ page: 1, limit: 100 })
        debugLog('[FAQsPage] faqs', list)
        debugLog('[FAQsPage] pagination', pagination)
        if (!cancelled) setFaqs(list)
      } catch (err) {
        debugError('[FAQsPage] load error', err)
        if (!cancelled) setError(err?.message || 'Failed to load FAQs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => groupFaqsByTopic(faqs), [faqs])

  useEffect(() => {
    if (faqs.length > 0) {
      debugLog('[FAQsPage] grouped', grouped)
    }
  }, [faqs, grouped])

  return (
    <PolicyPageLayout title="Frequently Asked Questions">
      {loading ? (
        <p className="text-center text-sm text-gray-500 py-8">Loading FAQs…</p>
      ) : error ? (
        <p className="text-center text-sm text-red-600 py-8" role="alert">
          {error}
        </p>
      ) : grouped.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-8">
          No FAQs available at the moment. Please check back later.
        </p>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {grouped.map((section) => (
            <section key={section.topicKey}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:mb-4 sm:text-2xl">
                {section.label}
              </h2>
              <div className="space-y-4 sm:space-y-6">
                {section.items.map((faq) => (
                  <FaqItem
                    key={faq._id}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PolicyPageLayout>
  )
}

function FaqItem({ question, answer }) {
  return (
    <div className="group rounded-xl px-3 py-4 transition-colors hover:bg-gray-50/60 sm:px-4">
      <dt className="text-base font-semibold leading-6 text-gray-900 group-hover:text-indigo-600 sm:text-lg sm:leading-7">
        {question}
      </dt>
      <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-gray-600 sm:text-base">
        {answer}
      </dd>
    </div>
  )
}
