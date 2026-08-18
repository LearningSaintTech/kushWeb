import { FaRegComment } from 'react-icons/fa'
import { MdShare } from 'react-icons/md'

function ActionButton({ label, onClick, tone = 'dark', compact = false, children }) {
  const isLight = tone === 'light'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer flex-col items-center transition hover:opacity-80 ${
        compact ? 'gap-0.5' : 'gap-1'
      } ${isLight ? 'text-white' : 'text-black'}`}
    >
      <span
        className={`flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] ${
          compact ? 'h-9 w-9' : 'h-10 w-10'
        }`}
      >
        {children}
      </span>
      <span
        className={`font-inter font-medium ${
          compact ? 'text-[10px]' : 'text-xs'
        } ${isLight ? 'text-white/95' : 'text-neutral-700'}`}
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
  showLike = true,
  compact = false,
  onLike,
  onComment,
  onShare,
  onSave,
}) {
  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-3.5' : 'gap-5'} py-1`}>
      {showLike ? (
        <ActionButton label={likes} onClick={onLike} tone={tone} compact={compact}>
          <svg
            className={compact ? 'h-6 w-6' : 'h-6 w-6'}
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
      ) : null}

      <ActionButton label={comments} onClick={onComment} tone={tone} compact={compact}>
        <FaRegComment className={compact ? 'h-5 w-5' : 'h-5 w-5'} />
      </ActionButton>

      <ActionButton label="Share" onClick={onShare} tone={tone} compact={compact}>
        <MdShare className={compact ? 'h-5 w-5' : 'h-5 w-5'} />
      </ActionButton>

      <ActionButton label="Save" onClick={onSave} tone={tone} compact={compact}>
        <svg
          className={compact ? 'h-6 w-6' : 'h-6 w-6'}
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
