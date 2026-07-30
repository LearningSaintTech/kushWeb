import { useEffect, useMemo, useRef, useState } from 'react'
import { debugLog } from '../../../../utils/debugLog'
import topSvg from '../../../../assets/images/community/top.svg'

const SUGGESTED_TAGS = ['#Minimalist', '#LinenLove', '#SummerLook', '#KhushStyle']

const PRODUCT_CATALOG = [
  { id: 'p1', name: 'White Tee', thumb: topSvg },
  { id: 'p2', name: 'Cargo Pants', thumb: topSvg },
  { id: 'p3', name: 'Linen Shirt', thumb: topSvg },
  { id: 'p4', name: 'Denim Jacket', thumb: topSvg },
  { id: 'p5', name: 'Wide Trousers', thumb: topSvg },
]

const DESIGNERS = ['Alice Mark', 'John Smith']

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:30'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Create Post composer — caption, product tags, media preview.
 * Opens after Camera / Gallery for Reel (and Post).
 */
export default function CreatePostComposer({
  open,
  kind = 'reel',
  mediaFile = null,
  onClose,
  onPosted,
}) {
  const replaceInputRef = useRef(null)
  const [caption, setCaption] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [tagged, setTagged] = useState(() =>
    PRODUCT_CATALOG.filter((p) => p.id === 'p1' || p.id === 'p2'),
  )
  const [previewUrl, setPreviewUrl] = useState('')
  const [durationLabel, setDurationLabel] = useState('0:30')
  const [musicOn, setMusicOn] = useState(false)
  const [posting, setPosting] = useState(false)
  const [localFile, setLocalFile] = useState(null)

  const activeFile = localFile || mediaFile
  const isVideo = Boolean(
    activeFile?.type?.startsWith('video/') || kind === 'reel',
  )

  useEffect(() => {
    if (!open) return undefined
    setCaption('')
    setProductQuery('')
    setTagged(PRODUCT_CATALOG.filter((p) => p.id === 'p1' || p.id === 'p2'))
    setMusicOn(false)
    setPosting(false)
    setLocalFile(null)
    setDurationLabel('0:30')
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || !activeFile) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(activeFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, activeFile])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const suggestions = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return []
    return PRODUCT_CATALOG.filter(
      (p) =>
        p.name.toLowerCase().includes(q) && !tagged.some((t) => t.id === p.id),
    ).slice(0, 5)
  }, [productQuery, tagged])

  const appendHashtag = (tag) => {
    setCaption((prev) => {
      const next = prev.trim()
      if (next.includes(tag)) return prev
      return next ? `${next} ${tag}` : tag
    })
  }

  const addProduct = (product) => {
    setTagged((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]))
    setProductQuery('')
  }

  const removeProduct = (id) => {
    setTagged((prev) => prev.filter((p) => p.id !== id))
  }

  const handleReplaceMedia = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLocalFile(file)
  }

  const handlePost = async () => {
    setPosting(true)
    const payload = {
      kind,
      caption: caption.trim(),
      products: tagged.map((p) => p.id),
      designers: DESIGNERS,
      musicOn,
      fileName: activeFile?.name || null,
      fileType: activeFile?.type || null,
    }
    debugLog('[Community] Post to Community', payload)
    await new Promise((r) => setTimeout(r, 450))
    setPosting(false)
    onPosted?.(payload)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        className="relative z-10 my-auto w-full max-w-[880px] rounded-[24px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 sm:right-5 sm:top-5"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch lg:gap-10 lg:p-10 lg:pr-12">
          {/* Left — form */}
          <div className="flex min-w-0 flex-col">
            <h2
              id="create-post-title"
              className="pr-10 font-inter text-[1.65rem] font-bold leading-none tracking-tight text-black"
            >
              Create Post
            </h2>

            <label className="mt-7 block">
              <span className="mb-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Caption
              </span>
              <textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write something about your style..."
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 font-inter text-sm leading-relaxed text-black outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>

            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendHashtag(tag)}
                  className="cursor-pointer font-inter text-sm font-medium text-[#3b82f6] transition hover:text-[#2563eb]"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <span className="mb-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Tag Products
              </span>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search your products..."
                  className="w-full rounded-full border-0 bg-[#f2f2f2] py-3 pl-10 pr-4 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-black/10"
                />
                {suggestions.length > 0 ? (
                  <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
                    {suggestions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => addProduct(item)}
                          className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left font-inter text-sm text-black transition hover:bg-neutral-50"
                        >
                          <img src={item.thumb} alt="" className="h-5 w-5 object-contain" />
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {tagged.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-inter text-xs font-medium text-black"
                  >
                    <img src={item.thumb} alt="" className="h-4 w-4 object-contain" />
                    {item.name}
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeProduct(item.id)}
                      className="cursor-pointer text-neutral-400 transition hover:text-black"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-5 font-inter text-[11px] uppercase tracking-[0.06em] text-neutral-500">
              <span className="font-semibold text-neutral-400">Designed by </span>
              {DESIGNERS.map((name, index) => (
                <span key={name}>
                  {index > 0 ? ', ' : null}
                  <button
                    type="button"
                    className="cursor-pointer font-semibold text-black underline decoration-neutral-300 underline-offset-2 transition hover:decoration-black"
                  >
                    {name}
                  </button>
                </span>
              ))}
            </p>

            <div className="mt-8 lg:mt-auto lg:pt-10">
              <button
                type="button"
                onClick={handlePost}
                disabled={posting || !activeFile}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1a2420] font-inter text-sm font-semibold text-white transition hover:bg-[#243029] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? 'Posting…' : 'Post to Community'}
              </button>
            </div>
          </div>

          {/* Right — preview */}
          <div className="flex items-center justify-center lg:items-end lg:justify-end lg:pb-1">
            <div className="relative flex items-end gap-3">
              <div className="relative h-[min(52vh,420px)] w-[min(calc(52vh*9/16),236px)] overflow-hidden rounded-[22px] bg-[#ececec] sm:h-[440px] sm:w-[248px]">
                {previewUrl ? (
                  isVideo ? (
                    <video
                      src={previewUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      playsInline
                      loop
                      autoPlay
                      onLoadedMetadata={(e) => {
                        setDurationLabel(formatDuration(e.currentTarget.duration))
                      }}
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 text-neutral-400"
                  >
                    <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="font-inter text-xs">Upload media</span>
                  </button>
                )}

                {previewUrl && isVideo ? (
                  <span className="pointer-events-none absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  </span>
                ) : null}

                {previewUrl ? (
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/35"
                    aria-label="Replace media"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </button>
                ) : null}

                {isVideo ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 font-inter text-[11px] font-semibold text-white">
                    {durationLabel}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setMusicOn((v) => !v)}
                aria-pressed={musicOn}
                aria-label={musicOn ? 'Music on' : 'Add music'}
                className={`mb-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-sm transition ${
                  musicOn
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-200 bg-white text-black hover:bg-neutral-50'
                }`}
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <input
          ref={replaceInputRef}
          type="file"
          accept={kind === 'reel' ? 'video/*' : 'image/*,video/*'}
          className="hidden"
          onChange={handleReplaceMedia}
        />
      </div>
    </div>
  )
}
