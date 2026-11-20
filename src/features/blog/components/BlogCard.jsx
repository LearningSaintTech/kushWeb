import { Link } from 'react-router-dom'
import { getBlogPath } from '../../../utils/constants'

/** Editorial story card: image, category, serif title, excerpt, author · date. */
export default function BlogCard({ post }) {
  if (!post) return null
  return (
    <Link to={getBlogPath(post.slug)} className="group block">
      <div className="aspect-[4/5] w-full overflow-hidden bg-neutral-100">
        <img
          src={post.image}
          alt={post.imageAlt || post.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
        {post.category}
      </p>
      <h3 className="font-refer-display mt-2 text-lg font-bold leading-snug text-black sm:text-xl group-hover:underline underline-offset-4">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500 sm:text-sm">
          {post.excerpt}
        </p>
      )}
      <p className="mt-3 text-[11px] text-neutral-500">
        <span className="font-medium text-black">{post.author}</span>
        {post.date && <span className="mx-1.5 text-neutral-300">—</span>}
        {post.date}
      </p>
    </Link>
  )
}
