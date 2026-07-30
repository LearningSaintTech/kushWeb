import { useEffect, useRef, useState } from 'react'
import CameraCapture from './CameraCapture'

/**
 * Second create step — pick Camera or Gallery source.
 * Camera opens a live getUserMedia view; Gallery uses the file picker.
 */
export default function AddMediaSheet({
  open,
  type = 'reel',
  onClose,
  onCamera,
  onGallery,
}) {
  const galleryInputRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setCameraOpen(false)
      return undefined
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !cameraOpen) onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, cameraOpen])

  if (!open) return null

  const isReel = type === 'reel'
  const accept = isReel ? 'video/*' : 'image/*,video/*'
  const title = isReel ? 'Add Video' : 'Add Photo'

  const handleGallery = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    onGallery?.(file)
  }

  const handleCameraCapture = (file) => {
    setCameraOpen(false)
    onCamera?.(file)
  }

  return (
    <>
      <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-black/40"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative z-10 w-full max-w-[420px] rounded-t-[28px] border-[6px] border-white bg-[#f2f2f2] shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:rounded-[28px]"
        >
          <div className="flex flex-col items-center px-5 pb-2 pt-3">
            <div className="h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
            <p className="mt-4 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {title}
            </p>
          </div>

          <div className="px-2 pb-4 pt-1">
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-4 text-left transition hover:bg-black/[0.04]"
            >
              <svg className="h-5 w-5 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.055-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              <span className="min-w-0 flex-1 font-inter text-base font-medium text-black">
                Camera
              </span>
              <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <div className="mx-4 h-px bg-neutral-300/80" />

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-4 text-left transition hover:bg-black/[0.04]"
            >
              <svg className="h-5 w-5 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
              <span className="min-w-0 flex-1 font-inter text-base font-medium text-black">
                Gallery
              </span>
              <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleGallery}
          />
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        mode={type}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </>
  )
}
