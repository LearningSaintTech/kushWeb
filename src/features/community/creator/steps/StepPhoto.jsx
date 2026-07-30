import { useEffect, useRef, useState } from 'react'

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

export default function StepPhoto({ data, onChange }) {
  const libraryRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const applyFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (data.photoPreview) URL.revokeObjectURL(data.photoPreview)
    onChange({
      photo: file,
      photoPreview: URL.createObjectURL(file),
    })
  }

  const closeCamera = () => {
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  const openCamera = async () => {
    setCameraError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      setCameraError('Could not access the camera. Please allow camera permission.')
    }
  }

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return undefined
    const video = videoRef.current
    video.srcObject = streamRef.current
    const play = video.play()
    if (play?.catch) play.catch(() => {})
    return undefined
  }, [cameraOpen])

  useEffect(() => () => stopStream(streamRef.current), [])

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror selfie so it matches the preview
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `creator-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        applyFile(file)
        closeCamera()
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-100 sm:h-32 sm:w-32">
        {data.photoPreview ? (
          <img
            src={data.photoPreview}
            alt="Profile preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <svg
            className="h-9 w-9 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.641-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        )}
      </div>

      <p className="mt-4 font-inter text-base font-bold text-black">Upload Photo</p>

      {cameraError ? (
        <p className="mt-3 text-center font-inter text-xs text-red-500" role="alert">
          {cameraError}
        </p>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-3">
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            applyFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={openCamera}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-black py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-neutral-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.641-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          Take Photo
        </button>

        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-neutral-100 py-3.5 font-inter text-sm font-semibold text-black transition hover:bg-neutral-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          Choose from Library
        </button>
      </div>

      {cameraOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4">
          <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-black shadow-2xl">
            <div className="relative aspect-[3/4] w-full bg-neutral-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <button
                type="button"
                onClick={closeCamera}
                className="cursor-pointer font-inter text-sm font-medium text-white/70 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                aria-label="Capture photo"
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-4 border-white/40 bg-white transition hover:scale-105"
              >
                <span className="h-10 w-10 rounded-full bg-white ring-2 ring-black/20" />
              </button>
              <span className="w-12" aria-hidden />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
