import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { blogService } from '../../services/blog.service.js'
import { ROUTES } from '../../utils/constants'
import PageTitle from '../../shared/ui/PageTitle'
import { PAGE_CONTAINER, PAGE_SHELL } from '../../shared/ui/pageLayout'
import BlogCard from './BlogCard'

const PAGE_SIZE = 12

export default function BlogListPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''

  const [categories, setCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    blogService.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    blogService
      .getPosts({ page: 1, limit: PAGE_SIZE, ...(category ? { categorySlug: category } : {}) })
      .then((result) => {
        if (cancelled) return
        setPosts(result.posts)
        setPagination(result.pagination)
      })
      .catch(() => {
        if (!cancelled) setError('We could not load the blog right now. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const result = await blogService.getPosts({
        page: (pagination?.page || 1) + 1,
        limit: PAGE_SIZE,
        ...(category ? { categorySlug: category } : {}),
      })
      setPosts((current) => [...current, ...result.posts])
      setPagination(result.pagination)
    } catch {
      setError('We could not load more posts. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const selectCategory = (slug) => setParams(slug ? { category: slug } : {})
  const activeCategory = categories.find((c) => c.slug === category)
  const [lead, ...rest] = posts
  const hasMore = pagination && pagination.page < pagination.totalPages

  return (
    <>
      <Helmet>
        <title>{activeCategory ? `${activeCategory.name} | Khush Pehno Blog` : 'Blog | Fashion Stories & Style Tips | Khush Pehno'}</title>
        <meta
          name="description"
          content={activeCategory?.description || 'Style guides, outfit ideas and fashion stories from Khush Pehno.'}
        />
        <link rel="canonical" href={`https://khushpehno.com${ROUTES.BLOG}${category ? `?category=${category}` : ''}`} />
      </Helmet>

      <div className={PAGE_SHELL}>
        <div className={PAGE_CONTAINER}>
          <PageTitle className="mb-2">Blog</PageTitle>
          <p className="mb-6 text-sm text-gray-600 sm:text-base">
            {activeCategory?.description || 'Style guides, outfit ideas and stories from Khush Pehno.'}
          </p>

          {categories.length > 0 && (
            <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
              {[{ slug: '', name: 'All' }, ...categories].map((c) => {
                const active = c.slug === category
                return (
                  <button
                    key={c.slug || 'all'}
                    type="button"
                    onClick={() => selectCategory(c.slug)}
                    aria-pressed={active}
                    className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 font-inter text-sm transition-colors ${
                      active ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}

          {loading ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded bg-gray-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : error && posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No posts here yet.</p>
              {category && (
                <button type="button" onClick={() => selectCategory('')} className="mt-3 cursor-pointer text-sm font-semibold underline">
                  See all posts
                </button>
              )}
            </div>
          ) : (
            <>
              <Link to={`${ROUTES.BLOG}/${lead.slug}`} className="group mb-12 grid gap-6 lg:grid-cols-2 lg:items-center">
                <div className="aspect-[4/3] overflow-hidden rounded bg-gray-100">
                  <img
                    src={lead.image}
                    alt={lead.imageAlt || lead.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <p className="font-inter text-xs font-semibold uppercase tracking-wider text-gray-500">{lead.category}</p>
                  <h2 className="mt-2 font-inter text-2xl font-bold leading-tight text-black group-hover:underline sm:text-3xl">
                    {lead.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">{lead.excerpt}</p>
                  <p className="mt-4 text-xs text-gray-500">
                    {lead.author} · {lead.date} · {lead.readTime}
                  </p>
                </div>
              </Link>

              {rest.length > 0 && (
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-6 text-center text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              {hasMore && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="cursor-pointer border border-black px-8 py-3 font-inter text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
