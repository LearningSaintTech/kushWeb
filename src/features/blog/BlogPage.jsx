import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogService } from '../../services'
import { getBlogPath } from '../../utils/constants'
import { debugError } from '../../utils/debugLog.js'
import BlogCard from './components/BlogCard'

/** Posts per page: two rows of three around one featured story. */
const PAGE_SIZE = 7

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] w-full bg-neutral-200" />
      <div className="mt-4 h-2 w-16 bg-neutral-200" />
      <div className="mt-3 h-4 w-4/5 bg-neutral-200" />
      <div className="mt-2 h-3 w-full bg-neutral-100" />
    </div>
  )
}

function FeaturedStory({ post }) {
  return (
    <section className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
      <Link to={getBlogPath(post.slug)} className="group block overflow-hidden bg-neutral-100">
        <img
          src={post.image}
          alt={post.imageAlt || post.title}
          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
          Featured Story
        </p>
        <h2 className="font-refer-display mt-4 text-3xl font-extrabold leading-tight text-black sm:text-4xl lg:text-5xl">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-600">{post.excerpt}</p>
        )}
        <Link
          to={getBlogPath(post.slug)}
          className="mt-7 inline-block bg-black px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800"
        >
          Read Article
        </Link>
      </div>
    </section>
  )
}

function CardRow({ posts }) {
  if (!posts.length) return null
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <BlogCard key={p.id} post={p} />
      ))}
    </div>
  )
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = searchParams.get('category') || 'all'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    blogService
      .getAll({ page: 1, limit: 50 })
      .then(({ posts: list }) => {
        if (!cancelled) setPosts(list.filter((p) => p.isPublished !== false))
      })
      .catch((err) => {
        debugError('Failed to load blog posts', err)
        if (!cancelled) setError(err.message || 'Failed to load stories')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const seen = new Map()
    posts.forEach((p) => {
      if (p.categorySlug && !seen.has(p.categorySlug)) seen.set(p.categorySlug, p.category)
    })
    return [...seen].map(([slug, name]) => ({ slug, name }))
  }, [posts])

  const filtered = useMemo(
    () => (activeCategory === 'all' ? posts : posts.filter((p) => p.categorySlug === activeCategory)),
    [posts, activeCategory],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagePosts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Featured: explicit isFeatured first, otherwise the most viewed post on this page.
  const featured = useMemo(() => {
    if (pagePosts.length < 4) return null
    return (
      pagePosts.find((p) => p.isFeatured) ||
      [...pagePosts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0]
    )
  }, [pagePosts])
  const rest = featured ? pagePosts.filter((p) => p.id !== featured.id) : pagePosts

  const heroImage = posts[0]?.image

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === 'all' || v === 1) params.delete(k)
      else params.set(k, String(v))
    })
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Helmet>
        <title>Fashion Stories | Khush Pehno Blog</title>
        <meta
          name="description"
          content="Insights, trends and style — editorial fashion stories from Khush Pehno."
        />
        <meta property="og:title" content="Fashion Stories | Khush Pehno Blog" />
      </Helmet>

      <div className="bg-white text-black font-inter">
        {/* HERO */}
        {/* Top padding clears the fixed header that overlays the hero */}
        <section className="relative flex h-[320px] items-center justify-center overflow-hidden bg-black pt-28 sm:h-[400px] sm:pt-16 lg:h-[460px]">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          )}
          <div className="relative z-10 px-4 text-center text-white">
            <h1 className="font-refer-display text-4xl font-bold uppercase tracking-wide sm:text-6xl lg:text-7xl">
              Fashion Stories
            </h1>
            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.35em] text-white/80 sm:text-xs">
              Insights, Trends, Style
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {/* CATEGORY FILTERS */}
          <div className="mb-10 flex flex-wrap gap-2 sm:gap-3">
            {[{ slug: 'all', name: 'All' }, ...categories].map((c) => {
              const active = activeCategory === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => updateParams({ category: c.slug, page: 1 })}
                  className={`rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-black/80 bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <p className="py-20 text-center text-sm text-neutral-500">{error}</p>
          ) : !pagePosts.length ? (
            <p className="py-20 text-center text-sm text-neutral-500">No stories yet. Check back soon.</p>
          ) : (
            <div className="space-y-16 sm:space-y-20">
              <CardRow posts={rest.slice(0, 3)} />
              {featured && <FeaturedStory post={featured} />}
              <CardRow posts={rest.slice(3)} />
            </div>
          )}

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <nav className="mt-16 flex items-center justify-center gap-4 text-xs" aria-label="Pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateParams({ page: n })}
                  aria-current={n === page ? 'page' : undefined}
                  className={`pb-0.5 font-semibold tracking-wider ${
                    n === page ? 'border-b border-black text-black' : 'text-neutral-400 hover:text-black'
                  }`}
                >
                  {String(n).padStart(2, '0')}
                </button>
              ))}
              {page < totalPages && (
                <button
                  type="button"
                  onClick={() => updateParams({ page: page + 1 })}
                  className="font-semibold tracking-wider text-black hover:underline"
                >
                  Next →
                </button>
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  )
}
