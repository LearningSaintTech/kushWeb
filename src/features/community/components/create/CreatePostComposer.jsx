import { useCallback, useEffect, useRef, useState } from 'react'
import { debugLog, debugError } from '../../../../utils/debugLog'
import {
  communityService,
  getCommunityErrorMessage,
  isDesignerNotVerifiedError,
} from '../../../../services/community.service.js'
import {
  createPostFast,
  createReelFast,
} from '../../../../services/communityUpload.service.js'
import { itemsService } from '../../../../services/items.service.js'
import { logCommunity } from '../../../../services/communityApi.js'
import {
  extractHashtagsFromCaption,
  mapCatalogItemToPickerItem,
} from '../../../../services/communityContent.mappers.js'
import topSvg from '../../../../assets/images/community/top.svg'

const SUGGESTED_TAGS = ['#Minimalist', '#LinenLove', '#SummerLook', '#KhushStyle']
const CATALOG_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const MAX_POST_IMAGES = 10
const MAX_TAGGED_PRODUCTS = 10
const VIDEO_TYPE_MESSAGE = 'Please upload a video type'

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:30'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

function normalizeIncomingMedia(mediaFile) {
  if (!mediaFile) return []
  if (Array.isArray(mediaFile)) return mediaFile.filter(Boolean)
  return [mediaFile]
}

function CloseIcon({ className = 'h-3 w-3' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/**
 * Create Post / Reel composer — multi-image posts, catalog product tag, source selector, fast upload.
 */
export default function CreatePostComposer({
  open,
  kind = 'reel',
  mediaFile = null,
  onClose,
  onPosted,
}) {
  const addMediaInputRef = useRef(null)
  const searchReqId = useRef(0)
  const previewUrlsRef = useRef([])

  const [caption, setCaption] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(null)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogTotalPages, setCatalogTotalPages] = useState(1)
  const [tagged, setTagged] = useState([])

  // Sources state (e.g. Myntra, Instagram, Street style, etc.)
  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [sourcesError, setSourcesError] = useState(null)
  const [sourcesPage, setSourcesPage] = useState(1)
  const [sourcesHasMore, setSourcesHasMore] = useState(false)
  const [sourcesQuery, setSourcesQuery] = useState('')
  const [debouncedSourcesQuery, setDebouncedSourcesQuery] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)

  const [previewUrls, setPreviewUrls] = useState([])
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [durationLabel, setDurationLabel] = useState('0:30')
  const [musicOn, setMusicOn] = useState(false)
  const [posting, setPosting] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadPhase, setUploadPhase] = useState('')
  const [postError, setPostError] = useState(null)
  const [localFiles, setLocalFiles] = useState([])
  const [pickerOpen, setPickerOpen] = useState(true)
  const [mediaReady, setMediaReady] = useState(false)

  const mediaFiles = mediaReady ? localFiles : normalizeIncomingMedia(mediaFile)
  const activeFile = mediaFiles[activeMediaIndex] || mediaFiles[0] || null
  const isVideo = Boolean(
    kind === 'reel' || activeFile?.type?.startsWith('video/'),
  )
  const isMultiPost = kind !== 'reel' && mediaFiles.length > 1
  const selectedItem = tagged[0] || null
  const designedByLabel =
    selectedItem?.raw?.designedBy ||
    selectedItem?.raw?.item?.designedBy ||
    tagged.map((t) => t?.raw?.designedBy || t?.raw?.item?.designedBy).find(Boolean) ||
    null

  const taggedIds = new Set(tagged.map((t) => String(t.id)))
  const canTagMore = tagged.length < MAX_TAGGED_PRODUCTS

  const selectedSource = sources.find((s) => String(s.id) === String(selectedSourceId)) || null

  // Fetch catalog items via GET /api/items/search?keyword=<text>&page=1&limit=20
  const loadCatalogItems = useCallback(
    async ({ q = '', page = 1 } = {}) => {
      const reqId = ++searchReqId.current
      setCatalogLoading(true)
      setCatalogError(null)

      logCommunity('CreatePostComposer search catalog items', { q, page })
      try {
        const res = await itemsService.search({
          keyword: q || undefined,
          page,
          limit: CATALOG_PAGE_SIZE,
        })
        if (reqId !== searchReqId.current) return

        const data = res?.data?.data ?? res?.data
        const rawItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []
        const mapped = rawItems.map(mapCatalogItemToPickerItem).filter(Boolean)
        const pag = data?.pagination ?? null
        const total = pag?.total ?? data?.total ?? mapped.length
        const totalPages = Math.max(
          1,
          pag?.totalPages ?? Math.ceil(total / CATALOG_PAGE_SIZE) ?? 1,
        )

        setCatalog(mapped)
        setCatalogTotalPages(totalPages)
        setCatalogPage(page)

        logCommunity('CreatePostComposer catalog items search ok', {
          count: mapped.length,
          page,
          totalPages,
          q,
        })
      } catch (err) {
        if (reqId !== searchReqId.current) return
        const message = getCommunityErrorMessage(err, 'Could not load catalog products')
        debugError('[Community] catalog items search failed', message)
        setCatalogError(message)
        setCatalog([])
      } finally {
        if (reqId === searchReqId.current) setCatalogLoading(false)
      }
    },
    [],
  )

  // Fetch sources via GET /api/community/sources?page=1&limit=20&q=<search>
  const loadSources = useCallback(
    async ({ page = 1, q = '', reset = false } = {}) => {
      setSourcesLoading(true)
      setSourcesError(null)
      try {
        const res = await communityService.getSources({
          page,
          limit: 20,
          q: q.trim() || undefined,
        })
        const data = res?.data?.items ? res.data : res?.items ? res : res?.data || {}
        const items = Array.isArray(data?.items) ? data.items : []
        const hasMore = Boolean(data?.hasMore ?? (data?.page < data?.totalPages))

        setSources((prev) => (reset || page === 1 ? items : [...prev, ...items]))
        setSourcesPage(page)
        setSourcesHasMore(hasMore)
      } catch (err) {
        const msg = getCommunityErrorMessage(err, 'Could not load sources')
        setSourcesError(msg)
      } finally {
        setSourcesLoading(false)
      }
    },
    [],
  )

  // Reset & load initial data on modal open
  useEffect(() => {
    if (!open) return undefined
    setCaption('')
    setProductQuery('')
    setDebouncedQuery('')
    setTagged([])
    setSelectedSourceId('')
    setSourcesQuery('')
    setDebouncedSourcesQuery('')
    setSourcePickerOpen(false)
    setMusicOn(false)
    setPosting(false)
    setUploadPct(0)
    setUploadPhase('')
    setPostError(null)
    setLocalFiles([])
    setMediaReady(false)
    setActiveMediaIndex(0)
    setDurationLabel('0:30')
    setCatalogError(null)
    setCatalog([])
    setCatalogPage(1)
    setCatalogTotalPages(1)
    setPickerOpen(true)

    loadCatalogItems({ q: '', page: 1 })
    loadSources({ page: 1, reset: true })
    return undefined
  }, [open, loadCatalogItems, loadSources])

  useEffect(() => {
    if (!open || mediaReady) return
    setLocalFiles(normalizeIncomingMedia(mediaFile))
    setMediaReady(true)
  }, [open, mediaFile, mediaReady])

  // Debounced search for catalog products
  useEffect(() => {
    if (!open) return undefined
    const delay = productQuery.trim() ? SEARCH_DEBOUNCE_MS : 0
    const t = window.setTimeout(() => {
      const q = productQuery.trim()
      setDebouncedQuery(q)
      setCatalogPage(1)
      loadCatalogItems({ q, page: 1 })
    }, delay)
    return () => window.clearTimeout(t)
  }, [open, productQuery, loadCatalogItems])

  // Debounced search for sources
  useEffect(() => {
    if (!open) return undefined
    const delay = sourcesQuery.trim() ? SEARCH_DEBOUNCE_MS : 0
    const t = window.setTimeout(() => {
      const q = sourcesQuery.trim()
      setDebouncedSourcesQuery(q)
      loadSources({ page: 1, q, reset: true })
    }, delay)
    return () => window.clearTimeout(t)
  }, [open, sourcesQuery, loadSources])

  useEffect(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current = []
    if (!open || !mediaFiles.length) {
      setPreviewUrls([])
      return undefined
    }
    const urls = mediaFiles.map((file) => URL.createObjectURL(file))
    previewUrlsRef.current = urls
    setPreviewUrls(urls)
    setActiveMediaIndex((idx) => Math.min(idx, urls.length - 1))
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current = []
    }
  }, [open, mediaFiles])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const goToProductPage = (nextPage) => {
    if (catalogLoading) return
    if (nextPage < 1 || nextPage > catalogTotalPages) return
    loadCatalogItems({ q: debouncedQuery, page: nextPage })
  }

  const appendHashtag = (tag) => {
    setCaption((prev) => {
      const next = prev.trim()
      if (next.includes(tag)) return prev
      return next ? `${next} ${tag}` : tag
    })
  }

  const addProduct = (product) => {
    setTagged((prev) => {
      if (prev.some((p) => String(p.id) === String(product.id))) return prev
      if (prev.length >= MAX_TAGGED_PRODUCTS) return prev
      return [...prev, product]
    })
    setPickerOpen(true)
    logCommunity('CreatePostComposer product selected', {
      itemId: product.itemId || product.id,
      name: product.name,
    })
  }

  const removeProduct = (id) => {
    setTagged((prev) => prev.filter((p) => String(p.id) !== String(id)))
    setPickerOpen(true)
  }

  const clearProducts = () => {
    setTagged([])
    setPickerOpen(true)
  }

  const handleAddMedia = (event) => {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return

    if (kind === 'reel') {
      const video = picked.find((f) => f.type?.startsWith('video/'))
      if (!video) {
        setPostError(VIDEO_TYPE_MESSAGE)
        return
      }
      setPostError(null)
      setLocalFiles([video])
      setMediaReady(true)
      setActiveMediaIndex(0)
      return
    }

    const images = picked.filter((f) => f.type?.startsWith('image/'))
    if (!images.length) return
    setLocalFiles((prev) => [...prev, ...images].slice(0, MAX_POST_IMAGES))
    setMediaReady(true)
  }

  const removeMediaAt = (index) => {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaReady(true)
    setActiveMediaIndex((idx) => {
      if (index < idx) return idx - 1
      if (index === idx) return Math.max(0, idx - 1)
      return idx
    })
  }

  const handlePost = async () => {
    setPostError(null)
    if (!mediaFiles.length) {
      setPostError('Add media before posting')
      return
    }
    const primary = mediaFiles[0]
    if (kind === 'reel' && !primary?.type?.startsWith('video/')) {
      setPostError(VIDEO_TYPE_MESSAGE)
      return
    }
    const itemIds = tagged
      .map((p) => p.itemId || p.id)
      .filter(Boolean)
      .map(String)

    if (!itemIds.length) {
      setPostError('itemId or itemIds is required — select product(s) from the Khush catalog')
      setPickerOpen(true)
      return
    }

    setPosting(true)
    setUploadPct(0)
    setUploadPhase('upload')

    const captionText = caption.trim()
    const hashtags = extractHashtagsFromCaption(captionText)

    debugLog('[Community] Post to Community (fast upload)', {
      kind,
      itemIds,
      sourceId: selectedSourceId || null,
      caption: captionText,
      hashtags,
      fileCount: mediaFiles.length,
      fileNames: mediaFiles.map((f) => f?.name),
    })

    try {
      const onProgress = (pct, phase) => {
        setUploadPct(pct)
        setUploadPhase(phase || '')
        logCommunity('CreatePostComposer progress', { pct, phase })
      }

      let result
      if (kind === 'reel' || primary?.type?.startsWith('video/')) {
        if (!primary?.type?.startsWith('video/')) {
          throw new Error(VIDEO_TYPE_MESSAGE)
        }
        result = await createReelFast({
          itemId: itemIds[0],
          itemIds,
          sourceId: selectedSourceId || undefined,
          caption: captionText,
          hashtags,
          videoFile: primary,
          onProgress,
        })
      } else {
        result = await createPostFast({
          itemId: itemIds[0],
          itemIds,
          sourceId: selectedSourceId || undefined,
          caption: captionText,
          hashtags,
          imageFiles: mediaFiles.filter((f) => f?.type?.startsWith('image/')),
          onProgress,
        })
      }

      debugLog('[Community] Post to Community success', {
        id: result?._id,
        status: result?.status,
        type: result?.type,
        source: result?.source,
      })
      setPosting(false)
      onPosted?.({
        kind,
        itemId: itemIds[0],
        itemIds,
        sourceId: selectedSourceId || null,
        caption: captionText,
        hashtags,
        content: result,
      })
    } catch (err) {
      // 1. Handle ITEM_NOT_TAGGABLE: Some items deactivated or deleted
      const errErrors = err?.response?.data?.errors
      const errCode = errErrors?.code || err?.response?.data?.code

      if (errCode === 'ITEM_NOT_TAGGABLE') {
        const untaggable = Array.isArray(errErrors?.itemIds) ? errErrors.itemIds.map(String) : []
        if (untaggable.length) {
          setTagged((prev) =>
            prev.filter(
              (p) => !untaggable.includes(String(p.itemId || p.id)),
            ),
          )
        }
        setPostError('Some items are no longer available in the Khush catalog and have been unselected. Please retry.')
        setPosting(false)
        return
      }

      // 2. Handle SOURCE_NOT_AVAILABLE: Source disabled by admin or deleted
      if (errCode === 'SOURCE_NOT_AVAILABLE') {
        setSelectedSourceId('')
        loadSources({ page: 1, reset: true })
        setPostError('The selected source is no longer available. Please select another source or publish without one.')
        setPosting(false)
        return
      }

      // 3. Handle SOURCE_INVALID
      if (errCode === 'SOURCE_INVALID') {
        setSelectedSourceId('')
        setPostError('Invalid source selected. Please pick a valid source or publish without one.')
        setPosting(false)
        return
      }

      const raw = isDesignerNotVerifiedError(err)
        ? 'Designer account must be verified before creating posts'
        : getCommunityErrorMessage(err, 'Failed to publish')
      const message =
        /mime|video type|required video/i.test(String(raw))
          ? VIDEO_TYPE_MESSAGE
          : raw
      debugError('[Community] Post to Community failed', message)
      setPostError(message)
      setPosting(false)
    }
  }

  if (!open) return null

  const canSubmit = mediaFiles.length > 0 && !posting
  const progressLabel =
    uploadPhase === 'publish'
      ? 'Publishing…'
      : uploadPhase === 'poll'
        ? 'Processing…'
        : uploadPct > 0
          ? `Uploading ${uploadPct}%`
          : 'Posting…'

  const previewUrl = previewUrls[activeMediaIndex] || previewUrls[0] || ''
  const canGoPrevPage = catalogPage > 1 && !catalogLoading
  const canGoNextPage = catalogPage < catalogTotalPages && !catalogLoading
  const pageLabel =
    catalogTotalPages > 1
      ? `${catalogPage} / ${catalogTotalPages}`
      : `Page ${catalogPage}`

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 px-3 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
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
        className="relative z-10 my-auto w-full max-w-[920px] rounded-[24px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-md transition hover:bg-neutral-800 sm:right-4 sm:top-4"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch lg:gap-10 lg:p-10 lg:pr-12">
          <div className="flex min-w-0 flex-col">
            <h2
              id="create-post-title"
              className="pr-12 font-inter text-[1.65rem] font-bold leading-none tracking-tight text-black"
            >
              Create {kind === 'reel' ? 'Reel' : 'Post'}
            </h2>

            {/* Caption */}
            <label className="mt-7 block">
              <span className="mb-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Caption
              </span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Write something about your style..."
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 font-inter text-sm leading-relaxed text-black outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>

            {/* Suggested tags */}
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

            {/* Source picker (Optional) */}
            <div className="mt-6 border-b border-neutral-100 pb-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    Source (Optional)
                  </span>
                  <p className="font-inter text-xs text-neutral-500">
                    Where was this look found? (e.g. Myntra, Instagram, Street style)
                  </p>
                </div>
                {selectedSource ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSourceId('')}
                    className="cursor-pointer font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 transition hover:text-black"
                  >
                    Clear source
                  </button>
                ) : null}
              </div>

              {/* Selected source badge */}
              {selectedSource ? (
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-900 px-3 py-1 font-inter text-xs font-semibold text-white shadow-sm">
                    <span>Source: {selectedSource.name}</span>
                    <button
                      type="button"
                      aria-label="Remove source"
                      onClick={() => setSelectedSourceId('')}
                      className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
                    >
                      <CloseIcon className="h-2 w-2" />
                    </button>
                  </span>
                </div>
              ) : null}

              {/* Quick source pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {sources.slice(0, 6).map((src) => {
                  const isSelected = String(src.id) === String(selectedSourceId)
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        setSelectedSourceId(isSelected ? '' : src.id)
                      }}
                      className={`cursor-pointer rounded-full border px-3 py-1 font-inter text-xs transition ${
                        isSelected
                          ? 'border-black bg-black font-semibold text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {src.name}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setSourcePickerOpen((v) => !v)}
                  className="cursor-pointer rounded-full border border-dashed border-neutral-300 px-2.5 py-1 font-inter text-xs font-medium text-neutral-500 transition hover:border-neutral-500 hover:text-black"
                >
                  {sourcePickerOpen ? 'Hide sources' : 'More sources…'}
                </button>
              </div>

              {/* Expandable full source picker with search & load more */}
              {sourcePickerOpen ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={sourcesQuery}
                      onChange={(e) => setSourcesQuery(e.target.value)}
                      placeholder="Search sources (e.g. Myntra, Instagram)..."
                      className="w-full rounded-full border border-neutral-200 bg-[#f7f7f7] py-1.5 pl-3 pr-3 font-inter text-xs text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white"
                    />
                  </div>

                  {sourcesLoading && sources.length === 0 ? (
                    <p className="py-4 text-center font-inter text-xs text-neutral-400">Loading sources…</p>
                  ) : sources.length === 0 ? (
                    <p className="py-4 text-center font-inter text-xs text-neutral-400">No matching sources found</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {sources.map((src) => {
                        const isSelected = String(src.id) === String(selectedSourceId)
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => {
                              setSelectedSourceId(isSelected ? '' : src.id)
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-inter text-xs transition ${
                              isSelected
                                ? 'bg-neutral-900 font-semibold text-white'
                                : 'text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            <span>{src.name}</span>
                            {isSelected ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                Selected
                              </span>
                            ) : src.description ? (
                              <span className="max-w-[140px] truncate text-[10px] text-neutral-400">
                                {src.description}
                              </span>
                            ) : null}
                          </button>
                        )
                      })}

                      {sourcesHasMore ? (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            disabled={sourcesLoading}
                            onClick={() =>
                              loadSources({ page: sourcesPage + 1, q: debouncedSourcesQuery })
                            }
                            className="cursor-pointer font-inter text-xs font-medium text-[#2563EB] hover:underline disabled:opacity-50"
                          >
                            {sourcesLoading ? 'Loading more…' : 'Load more sources'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {sourcesError ? (
                    <p className="mt-1 font-inter text-xs text-red-500">{sourcesError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Tag products — multi-select catalog search (up to 10 items) */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Tag Products (Catalog)
                </span>
                <span className="font-inter text-[11px] font-medium text-neutral-400">
                  {tagged.length}/{MAX_TAGGED_PRODUCTS}
                </span>
              </div>

              {/* Tagged product chips */}
              {tagged.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {tagged.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-neutral-200 bg-[#fafafa] py-1.5 pl-1.5 pr-2"
                    >
                      <img
                        src={item.thumb || topSvg}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                      <span className="max-w-[140px] truncate font-inter text-xs font-semibold text-black">
                        {item.name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeProduct(item.id)}
                        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800"
                      >
                        <CloseIcon className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  {tagged.length > 1 ? (
                    <button
                      type="button"
                      onClick={clearProducts}
                      className="cursor-pointer rounded-full px-2 py-1 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 transition hover:text-black"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-inter text-xs text-neutral-500">
                  {canTagMore
                    ? 'Tag any item from the Khush catalog (up to 10 products)'
                    : 'Maximum products tagged'}
                </p>
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="cursor-pointer font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 transition hover:text-black"
                >
                  {pickerOpen ? 'Hide catalog' : 'Tag products'}
                </button>
              </div>

              {pickerOpen ? (
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                  <div className="relative border-b border-neutral-100 px-3 py-2.5">
                    <svg
                      className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
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
                      placeholder="Search Khush catalog products by name..."
                      className="w-full rounded-full border-0 bg-[#f2f2f2] py-2.5 pl-10 pr-4 font-inter text-sm text-black outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-black/10"
                    />
                  </div>

                  <div className="min-h-[168px]">
                    {catalogLoading ? (
                      <p className="px-4 py-8 text-center font-inter text-xs text-neutral-400">
                        Searching Khush catalog…
                      </p>
                    ) : catalog.length === 0 ? (
                      <p className="px-4 py-8 text-center font-inter text-xs text-neutral-400">
                        {debouncedQuery
                          ? 'No products match your search in the Khush catalog.'
                          : 'No catalog products found.'}
                      </p>
                    ) : (
                      <ul className="divide-y divide-neutral-100">
                        {catalog.map((item) => {
                          const isAlreadyTagged = tagged.some(
                            (t) => String(t.id) === String(item.id),
                          )
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                disabled={!canTagMore || isAlreadyTagged}
                                onClick={() => addProduct(item)}
                                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 disabled:cursor-not-allowed ${
                                  isAlreadyTagged ? 'bg-neutral-50/80 opacity-60' : ''
                                }`}
                              >
                                <img
                                  src={item.thumb || topSvg}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-inter text-sm font-medium text-black">
                                    {item.name}
                                  </p>
                                  {item.designedBy ? (
                                    <p className="truncate font-inter text-[10px] text-neutral-400">
                                      By {item.designedBy}
                                    </p>
                                  ) : null}
                                </div>
                                {item.price ? (
                                  <span className="shrink-0 font-inter text-xs text-neutral-600">
                                    {item.price}
                                  </span>
                                ) : null}
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide ${
                                    isAlreadyTagged
                                      ? 'bg-neutral-200 text-neutral-600'
                                      : 'bg-black text-white'
                                  }`}
                                >
                                  {isAlreadyTagged ? 'Tagged' : 'Add'}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => goToProductPage(catalogPage - 1)}
                      disabled={!canGoPrevPage}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Previous products page"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {pageLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToProductPage(catalogPage + 1)}
                      disabled={!canGoNextPage}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Next products page"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : null}

              {catalogError ? (
                <p className="mt-2 font-inter text-xs text-amber-700">{catalogError}</p>
              ) : null}
            </div>

            {designedByLabel ? (
              <p className="mt-5 font-inter text-[11px] uppercase tracking-[0.06em] text-neutral-500">
                <span className="font-semibold text-neutral-400">Designed by </span>
                <span className="font-semibold text-black">{designedByLabel}</span>
              </p>
            ) : null}

            {postError ? (
              <p className="mt-4 font-inter text-sm text-red-600">{postError}</p>
            ) : null}

            <div className="mt-8 lg:mt-auto lg:pt-8">
              <button
                type="button"
                onClick={handlePost}
                disabled={!canSubmit}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1a2420] font-inter text-sm font-semibold text-white transition hover:bg-[#243029] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? progressLabel : 'Post to Community'}
              </button>
              {posting && uploadPct > 0 ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#1a2420] transition-all"
                    style={{ width: `${Math.min(100, uploadPct)}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Media preview + multi strip */}
          <div className="flex flex-col items-center justify-start gap-3 lg:sticky lg:top-10 lg:items-end lg:justify-start lg:self-start">
            <div className="relative flex items-start gap-3">
              <div className="relative h-[min(48vh,400px)] w-[min(calc(48vh*9/16),220px)] overflow-hidden rounded-[22px] bg-[#ececec] sm:h-[420px] sm:w-[236px]">
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
                    onClick={() => addMediaInputRef.current?.click()}
                    className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 text-neutral-400"
                  >
                    <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="font-inter text-xs">
                      {kind === 'reel' ? 'Upload video' : 'Upload photos'}
                    </span>
                  </button>
                )}

                {previewUrl && isVideo ? (
                  <span className="pointer-events-none absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  </span>
                ) : null}

                {isMultiPost ? (
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-inter text-[11px] font-semibold text-white">
                    {activeMediaIndex + 1}/{mediaFiles.length}
                  </span>
                ) : null}

                {isVideo ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 font-inter text-[11px] font-semibold text-white">
                    {durationLabel}
                  </span>
                ) : null}

                {isMultiPost ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      disabled={activeMediaIndex <= 0}
                      onClick={() => setActiveMediaIndex((i) => Math.max(0, i - 1))}
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/55 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      disabled={activeMediaIndex >= mediaFiles.length - 1}
                      onClick={() =>
                        setActiveMediaIndex((i) =>
                          Math.min(mediaFiles.length - 1, i + 1),
                        )
                      }
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/55 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Thumbnail strip + add more (posts) */}
            {kind !== 'reel' ? (
              <div className="flex w-full max-w-[280px] items-center gap-2 overflow-x-auto pb-1">
                {previewUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveMediaIndex(index)}
                      className={`h-14 w-14 overflow-hidden rounded-xl ring-2 transition ${
                        index === activeMediaIndex
                          ? 'ring-black'
                          : 'ring-transparent hover:ring-neutral-300'
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => removeMediaAt(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow"
                    >
                      <CloseIcon className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {mediaFiles.length < MAX_POST_IMAGES ? (
                  <button
                    type="button"
                    onClick={() => addMediaInputRef.current?.click()}
                    className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-500 hover:text-black"
                    aria-label="Add more photos"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : previewUrl ? (
              <button
                type="button"
                onClick={() => addMediaInputRef.current?.click()}
                className="cursor-pointer font-inter text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500 transition hover:text-black"
              >
                Replace video
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={addMediaInputRef}
          type="file"
          accept={kind === 'reel' ? 'video/*' : 'image/*'}
          multiple={kind !== 'reel'}
          className="hidden"
          onChange={handleAddMedia}
        />
      </div>
    </div>
  )
}
