import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogService } from '../../services'
import { ROUTES } from '../../utils/constants'
import { debugError } from '../../utils/debugLog.js'
import BlogCard from './components/BlogCard'

/** API returns `body.sections`; older posts only carry the flat first-section fields. */
function getSections(body) {
  if (!body) return []
  if (Array.isArray(body.sections) && body.sections.length) return body.sections
  if (body.subheading || body.paragraphs?.length || body.inlineImage || body.quote) {
    return [
      {
        subheading: body.subheading,
        paragraphs: body.paragraphs,
        inlineImage: body.inlineImage,
        inlineImageAlt: body.inlineImageAlt,
        quote: body.quote,
      },
    ]
  }
  return []
}

function formatCommentDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ArticleSection({ section }) {
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs.filter(Boolean) : []
  return (
    <section className="space-y-6">
      {section.subheading && (
        <h2 className="font-refer-display mx-auto max-w-3xl text-2xl font-bold text-black sm:text-3xl">
          {section.subheading}
        </h2>
      )}
      {paragraphs.map((text, i) => (
        <p key={i} className="mx-auto max-w-3xl text-[15px] leading-8 text-neutral-700">
          {text}
        </p>
      ))}
      {section.quote && (
        <blockquote className="mx-auto max-w-3xl border-y border-black/10 py-10 text-center">
          <p className="font-refer-display text-2xl font-semibold italic leading-snug text-black sm:text-3xl">
            “{section.quote}”
          </p>
        </blockquote>
      )}
      {section.inlineImage && (
        <figure className="mx-auto max-w-5xl pt-4">
          <div className="overflow-hidden bg-neutral-100">
            <img
              src={section.inlineImage}
              alt={section.inlineImageAlt || ''}
              loading="lazy"
              decoding="async"
              className="max-h-[560px] w-full object-cover"
            />
          </div>
          {section.inlineImageAlt && (
            <figcaption className="mt-3 text-center text-xs text-neutral-500">
              {section.inlineImageAlt}
            </figcaption>
          )}
        </figure>
      )}
    </section>
  )
}

function FaqList({ faqs }) {
  if (!faqs.length) return null
  return (
    <section className="mx-auto max-w-3xl">
      <h2 className="font-refer-display mb-6 text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
      <div className="divide-y divide-black/10 border-y border-black/10">
        {faqs.map((faq, i) => (
          <details key={faq.id || faq._id || i} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-black sm:text-base">
              {faq.question}
              <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-neutral-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Comment({ comment, isReply = false }) {
  const name = comment.user?.name || 'User'
  return (
    <li className={isReply ? 'mt-5 border-l border-black/10 pl-5' : ''}>
      <div className="flex items-start gap-3">
        {comment.user?.avatar ? (
          <img src={comment.user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold uppercase text-white">
            {name.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold text-black">{name}</span>
            <span className="ml-2 text-xs text-neutral-400">{formatCommentDate(comment.createdAt)}</span>
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-700">{comment.text}</p>
          {comment.likeCount > 0 && (
            <p className="mt-1 text-xs text-neutral-400">♥ {comment.likeCount}</p>
          )}
          {comment.replies?.length > 0 && (
            <ul>
              {comment.replies
                .filter((r) => !r.isHidden)
                .map((r) => (
                  <Comment key={r.id} comment={r} isReply />
                ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function CommentList({ comments, total }) {
  const visible = comments.filter((c) => !c.isHidden)
  if (!visible.length) return null
  return (
    <section className="mx-auto max-w-3xl">
      <h2 className="font-refer-display mb-6 text-2xl font-bold sm:text-3xl">
        Comments <span className="text-base font-normal text-neutral-400">({total ?? visible.length})</span>
      </h2>
      <ul className="space-y-8">
        {visible.map((c) => (
          <Comment key={c.id} comment={c} />
        ))}
      </ul>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[420px] w-full bg-neutral-800 sm:h-[560px]" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-14">
        <div className="h-4 w-full bg-neutral-200" />
        <div className="h-4 w-11/12 bg-neutral-200" />
        <div className="h-4 w-4/5 bg-neutral-200" />
      </div>
    </div>
  )
}

export default function BlogDetailPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [comments, setComments] = useState({ comments: [], pagination: null })
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setPost(null)
    setFaqs([])
    setComments({ comments: [], pagination: null })
    setRelated([])

    blogService
      .getBySlug(slug)
      .then((data) => {
        if (cancelled) return
        setPost(data)
        if (!data?.id) return
        blogService.getFaqs(data.id).then((list) => !cancelled && setFaqs(list))
        blogService.getComments(data.id).then((res) => !cancelled && setComments(res))
        blogService
          .getAll({ page: 1, limit: 20 })
          .then(({ posts }) => {
            if (cancelled) return
            const others = posts.filter((p) => p.id !== data.id)
            const sameCategory = others.filter((p) => p.categorySlug === data.categorySlug)
            const rest = others.filter((p) => p.categorySlug !== data.categorySlug)
            setRelated([...sameCategory, ...rest].slice(0, 3))
          })
          .catch(() => {})
      })
      .catch((err) => {
        debugError('Failed to load blog post', err)
        if (!cancelled) setError(err.message || 'Story not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <DetailSkeleton />

  if (error || !post) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center font-inter">
        <h1 className="font-refer-display text-3xl font-bold">Story not found</h1>
        <p className="mt-3 text-sm text-neutral-500">{error || 'This story may have been moved or removed.'}</p>
        <Link
          to={ROUTES.BLOG}
          className="mt-8 inline-block bg-black px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white"
        >
          Back to Fashion Stories
        </Link>
      </div>
    )
  }

  const sections = getSections(post.body)

  return (
    <>
      <Helmet>
        <title>{`${post.title} | Khush Fashion Stories`}</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        {post.excerpt && <meta property="og:description" content={post.excerpt} />}
        {post.image && <meta property="og:image" content={post.image} />}
      </Helmet>

      <article className="bg-white text-black font-inter">
        {/* HERO */}
        <header className="relative flex h-[420px] items-end overflow-hidden bg-black sm:h-[520px] lg:h-[600px]">
          {post.image && (
            <img
              src={post.image}
              alt={post.imageAlt || post.title}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
            <Link
              to={ROUTES.BLOG}
              className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 hover:text-white"
            >
              ← Fashion Stories
            </Link>
            {post.category && (
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
                {post.category}
              </p>
            )}
            <h1 className="font-refer-display mt-3 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 text-xs text-white/70">
              <span className="font-medium text-white">{post.author}</span>
              {post.date && <span className="mx-2">·</span>}
              {post.date}
              {post.readTime && <span className="mx-2">·</span>}
              {post.readTime}
            </p>
          </div>
        </header>

        <div className="space-y-14 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {(post.body?.intro || post.excerpt) && (
            <p className="mx-auto max-w-3xl text-base leading-8 text-neutral-800 sm:text-lg sm:leading-9">
              {post.body?.intro || post.excerpt}
            </p>
          )}

          {sections.map((section, i) => (
            <ArticleSection key={i} section={section} />
          ))}

          <FaqList faqs={faqs} />
          <CommentList comments={comments.comments} total={comments.pagination?.total} />
        </div>

        {related.length > 0 && (
          <section className="border-t border-black/10 bg-white">
            <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="font-refer-display text-2xl font-bold sm:text-3xl">More Stories</h2>
                <Link
                  to={ROUTES.BLOG}
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  )
}
