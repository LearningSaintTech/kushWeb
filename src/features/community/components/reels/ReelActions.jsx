import { FaRegComment } from 'react-icons/fa'
import { MdShare } from 'react-icons/md'

function ActionButton({ label, onClick, tone = 'dark', children }) {
  const isLight = tone === 'light'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer flex-col items-center gap-1 transition hover:opacity-80 ${
        isLight ? 'text-white' : 'text-black'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center drop-shadow-sm">{children}</span>
      <span
        className={`font-inter text-xs font-medium ${
          isLight ? 'text-white/90' : 'text-neutral-700'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export default function ReelActions({
  likes = '0',
  comments = '0',
  liked = false,
  saved = false,
  tone = 'light',
  onLike,
  onComment,
  onShare,
  onSave,
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <ActionButton label={likes} onClick={onLike} tone={tone}>
        <svg
          className="h-6 w-6"
          fill={liked ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </ActionButton>

      <ActionButton label={comments} onClick={onComment} tone={tone}>
        <FaRegComment className="h-5 w-5" />
      </ActionButton>

      <ActionButton label="Share" onClick={onShare} tone={tone}>
        <MdShare className="h-5 w-5" />
      </ActionButton>

      <ActionButton label="Save" onClick={onSave} tone={tone}>
        <svg
          className="h-6 w-6"
          fill={saved ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
      </ActionButton>
    </div>
  )
}
