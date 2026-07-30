export default function TrendingHashtags({ hashtags = [] }) {
  return (
    <section>
      <h3 className="font-inter text-sm font-semibold text-black">
        Trending Hashtags
      </h3>
      <ul className="mt-4 space-y-3.5">
        {hashtags.map((item) => (
          <li key={item.tag}>
            <button
              type="button"
              className="cursor-pointer text-left transition hover:opacity-70"
            >
              <p className="font-inter text-sm font-semibold text-black">{item.tag}</p>
              <p className="font-inter text-xs text-neutral-400">{item.posts}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
