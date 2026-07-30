import { useEffect, useRef, useState } from 'react'

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

function describeMediaError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was blocked. In the address bar, set Camera to Allow, then tap Retry.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera detected. On Windows: Settings → Privacy & security → Camera → allow desktop apps, then tap Retry. Also close Zoom/Teams if open.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is busy in another app. Close it, then tap Retry.'
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'Camera settings were not supported. Tap Retry to use a simpler mode.'
  }
  if (name === 'SecurityError') {
    return 'Camera blocked by browser security. Open the app at http://localhost and allow camera.'
  }
  return err?.message
    ? `Could not open camera: ${err.message}`
    : 'Could not access the camera.'
}

async function listVideoInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

/**
 * Open the best available camera with progressive fallbacks.
 * Avoids back-camera / mic constraints that fail on laptops.
 */
async function requestCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.')
  }

  const constraintSets = [
    { audio: false, video: true },
    { audio: false, video: {} },
    { audio: false, video: { facingMode: 'user' } },
    {
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
  ]

  // After a soft permission grant, prefer a concrete deviceId when available.
  try {
    const inputs = await listVideoInputs()
    for (const device of inputs) {
      if (!device.deviceId) continue
      constraintSets.unshift({
        audio: false,
        video: { deviceId: { exact: device.deviceId } },
      })
      constraintSets.unshift({
        audio: false,
        video: { deviceId: { ideal: device.deviceId } },
      })
    }
  } catch {
    /* enumerate can fail before permission — ignore */
  }

  let lastError = null
  for (const constraints of constraintSets) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastError = err
    }
  }

  // Last resort: ask for any media and keep only video tracks
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    stream.getAudioTracks().forEach((t) => {
      t.stop()
      stream.removeTrack(t)
    })
    if (stream.getVideoTracks().length) return stream
    stopStream(stream)
  } catch (err) {
    lastError = err
  }

  throw lastError ?? new Error('Camera unavailable')
}

/**
 * Live device camera overlay.
 * - post → still capture
 * - reel → MediaRecorder video capture
 */
export default function CameraCapture({
  open,
  mode = 'reel',
  onClose,
  onCapture,
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const isReel = mode === 'reel'

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false
    setError(null)
    setReady(false)
    setRecording(false)
    chunksRef.current = []

    const start = async () => {
      const host = window.location.hostname
      const okHost = host === 'localhost' || host === '127.0.0.1'
      if (!window.isSecureContext && !okHost) {
        setError('Camera needs HTTPS or localhost.')
        return
      }

      try {
        const stream = await requestCameraStream()
        if (cancelled) {
          stopStream(stream)
          return
        }
        streamRef.current = stream
        setReady(true)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(describeMediaError(err))
      }
    }

    start()

    return () => {
      cancelled = true
      if (recorderRef.current?.state === 'recording') {
        try {
          recorderRef.current.stop()
        } catch {
          /* ignore */
        }
      }
      recorderRef.current = null
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [open, retryKey])

  useEffect(() => {
    if (!open || !ready || !streamRef.current || !videoRef.current) return undefined
    const video = videoRef.current
    video.srcObject = streamRef.current
    const play = video.play()
    if (play?.catch) play.catch(() => {})
    return undefined
  }, [open, ready])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `community-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        onCapture?.(file)
      },
      'image/jpeg',
      0.92,
    )
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream || recording) return

    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''

    try {
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        })
        chunksRef.current = []
        const file = new File([blob], `community-reel-${Date.now()}.webm`, {
          type: blob.type,
        })
        onCapture?.(file)
      }
      recorder.start()
      setRecording(true)
    } catch {
      setError('Could not start video recording on this device.')
    }
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.stop()
    setRecording(false)
  }

  const handleShutter = () => {
    if (isReel) {
      if (recording) stopRecording()
      else startRecording()
      return
    }
    capturePhoto()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 sm:p-4">
      <div className="relative flex h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-black shadow-2xl">
        <div className="relative min-h-0 flex-1 bg-neutral-900">
          {ready ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
              <p className="text-center font-inter text-sm leading-relaxed text-white/80">
                {error ?? 'Opening camera…'}
              </p>
              {error ? (
                <button
                  type="button"
                  onClick={() => setRetryKey((n) => n + 1)}
                  className="cursor-pointer rounded-full bg-white px-5 py-2 font-inter text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  Retry
                </button>
              ) : null}
            </div>
          )}

          {recording ? (
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="font-inter text-xs font-semibold uppercase tracking-wider text-white">
                Rec
              </span>
            </div>
          ) : null}

          {/* Always-visible capture bar overlaid on preview */}
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-5 pb-5 pt-16">
            <p className="mb-4 text-center font-inter text-xs font-medium text-white/80">
              {ready
                ? isReel
                  ? recording
                    ? 'Tap to stop recording'
                    : 'Tap to start recording'
                  : 'Tap to capture photo'
                : ' '}
            </p>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-w-16 cursor-pointer font-inter text-sm font-semibold text-white transition hover:text-white/80"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleShutter}
                disabled={!ready}
                aria-label={
                  isReel
                    ? recording
                      ? 'Stop recording'
                      : 'Start recording'
                    : 'Capture photo'
                }
                className="group flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-transparent transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className={`transition-all ${
                    isReel && recording
                      ? 'h-6 w-6 rounded-md bg-red-500'
                      : 'h-12 w-12 rounded-full bg-white group-hover:bg-neutral-200'
                  }`}
                />
              </button>

              <span className="min-w-16 text-center font-inter text-xs font-semibold uppercase tracking-wide text-white/90">
                {ready ? (isReel ? (recording ? 'Stop' : 'Record') : 'Capture') : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
