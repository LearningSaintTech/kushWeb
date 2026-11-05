import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'

/** One post in a grid: photo, category, title, excerpt, date. */
export default function BlogCard({ post }) {
  return (
    <Link to={`${ROUTES.BLOG}/${post.slug}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded bg-gray-100">
        <img
          src={post.image}
          alt={post.imageAlt || post.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-4 font-inter text-xs font-semibold uppercase tracking-wider text-gray-500">{post.category}</p>
      <h3 className="mt-1 font-inter text-lg font-bold leading-snug text-black group-hover:underline">{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{post.excerpt}</p>
      <p className="mt-2 text-xs text-gray-500">
        {post.date} · {post.readTime}
      </p>
    </Link>
  )
}
