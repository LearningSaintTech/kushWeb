import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart, Minus, Plus } from 'lucide-react'
import { blogService } from '../../services/blog.service.js'
import { useAuth } from '../../app/context/AuthContext'
import { ROUTES } from '../../utils/constants'
import { PAGE_CONTAINER, PAGE_SHELL } from '../../shared/ui/pageLayout'
import BlogCard from './BlogCard'
import BlogComments from './BlogComments'

const SITE = 'https://khushpehno.com'

function jsonLd(post) {
  const url = `${SITE}${ROUTES.BLOG}/${post.slug}`
  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'Khush Pehno' },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url,
  }
  if (!post.faqs?.length) return [article]
  return [
    article,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ]
}

function FaqItem({ faq, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-inter text-base font-semibold text-black">{faq.question}</span>
        {open ? <Minus className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </button>
      {open && <p className="whitespace-pre-line pb-4 text-sm leading-6 text-gray-600 sm:text-base">{faq.answer}</p>}
    </div>
  )
}

function Section({ section }) {
  return (
    <section className="mt-10">
      {section.subheading && <h2 className="font-inter text-xl font-bold text-black sm:text-2xl">{section.subheading}</h2>}
      {section.inlineImage && (
        <img
          src={section.inlineImage}
          alt={section.inlineImageAlt || section.subheading || ''}
          loading="lazy"
          className="mt-4 w-full rounded object-cover"
        />
      )}
      {(section.paragraphs || []).map((paragraph, index) => (
        <p key={index} className="mt-4 text-base leading-7 text-gray-700">
          {paragraph}
        </p>
      ))}
      {section.quote && (
        <blockquote className="mt-6 border-l-2 border-black pl-4 font-inter text-lg italic text-black">{section.quote}</blockquote>
      )}
    </section>
  )
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | missing | error
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setPost(null)
    setRelated([])
    blogService
      .getPost(slug)
      .then((data) => {
        if (cancelled) return
        if (!data?.id) {
          setStatus('missing')
          return
        }
        setPost(data)
        setStatus('ready')
        // Local development must not add to live view counts
        if (!import.meta.env.DEV) blogService.recordView(slug).catch(() => {})
        blogService.getRelated(slug, 3).then((list) => !cancelled && setRelated(list)).catch(() => {})
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err?.response?.status === 404 ? 'missing' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const requireLogin = () => navigate(`${ROUTES.AUTH}?redirect=${encodeURIComponent(location.pathname)}`)

  const toggleLike = async () => {
    if (!isAuthenticated) {
      requireLogin()
      return
    }
    setLiking(true)
    try {
      const { liked, likeCount } = await blogService.toggleLike(post.id)
      setPost((current) => ({ ...current, likedByMe: liked, likeCount }))
    } catch {
      // Leave the button as it was; the customer can tap again
    } finally {
      setLiking(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={PAGE_SHELL} aria-busy="true">
        <div className={`${PAGE_CONTAINER} max-w-3xl animate-pulse`}>
          <div className="h-8 w-3/4 rounded bg-gray-100" />
          <div className="mt-6 aspect-[16/9] rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className={PAGE_SHELL}>
        <div className={`${PAGE_CONTAINER} py-16 text-center`}>
          <h1 className="font-inter text-2xl font-bold text-black">
            {status === 'missing' ? 'Post not found' : 'We could not load this post'}
          </h1>
          <Link to={ROUTES.BLOG} className="mt-4 inline-block text-sm font-semibold underline">
            Back to the blog
          </Link>
        </div>
      </div>
    )
  }

  const sections = post.body?.sections || []

  return (
    <>
      <Helmet>
        <title>{`${post.title} | Khush Pehno`}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`${SITE}${ROUTES.BLOG}/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <script type="application/ld+json">{JSON.stringify(jsonLd(post))}</script>
      </Helmet>

      <div className={PAGE_SHELL}>
        <article className={PAGE_CONTAINER}>
          <div className="mx-auto max-w-3xl">
            <Link to={ROUTES.BLOG} className="mb-6 inline-block text-sm uppercase tracking-wider text-gray-500 hover:text-black">
              ← All posts
            </Link>

            {post.categorySlug && (
              <Link
                to={`${ROUTES.BLOG}?category=${post.categorySlug}`}
                className="block font-inter text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-black"
              >
                {post.category}
              </Link>
            )}
            <h1 className="mt-2 font-inter text-3xl font-bold leading-tight text-black sm:text-4xl">{post.title}</h1>
            <p className="mt-3 text-sm text-gray-500">
              {post.author} · {post.date} · {post.readTime}
            </p>

            <img src={post.image} alt={post.imageAlt || post.title} className="mt-6 w-full rounded object-cover" />

            {post.body?.intro && <p className="mt-8 text-lg leading-8 text-gray-800">{post.body.intro}</p>}
            {sections.map((section, index) => (
              <Section key={index} section={section} />
            ))}

            {post.faqs?.length > 0 && (
              <section className="mt-12" aria-labelledby="blog-faqs">
                <h2 id="blog-faqs" className="font-inter text-xl font-bold text-black sm:text-2xl">
                  Frequently asked questions
                </h2>
                <div className="mt-2 border-t border-gray-200">
                  {post.faqs.map((faq, index) => (
                    <FaqItem key={faq.question} faq={faq} defaultOpen={index === 0} />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-10 flex items-center gap-4 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={toggleLike}
                disabled={liking}
                aria-pressed={Boolean(post.likedByMe)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm transition-colors hover:border-black disabled:opacity-60"
              >
                <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-black text-black' : ''}`} aria-hidden="true" />
                {post.likedByMe ? 'Liked' : 'Like'}
                <span className="text-gray-500">{post.likeCount || 0}</span>
              </button>
            </div>

            <BlogComments
              blogId={post.id}
              onCountChange={(delta) => setPost((p) => ({ ...p, commentCount: Math.max(0, (p.commentCount || 0) + delta) }))}
              onLoginRequired={requireLogin}
            />
          </div>

          {related.length > 0 && (
            <section className="mt-16 border-t border-gray-200 pt-10" aria-labelledby="blog-related">
              <h2 id="blog-related" className="mb-6 font-inter text-xl font-bold uppercase tracking-wider text-black">
                You may also like
              </h2>
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <BlogCard key={item.id} post={item} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  )
}
