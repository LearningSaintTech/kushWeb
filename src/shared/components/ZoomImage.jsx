import { useState, useEffect, useRef, useCallback } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function ZoomIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  );
}

/**
 * Full-screen image viewer with pinch, wheel, drag-pan, and double-tap zoom.
 */
export function ZoomableViewer({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const pinchState = useRef(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const applyZoom = useCallback((nextScale, focalX, focalY) => {
    setScale((prevScale) => {
      const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (clamped === 1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      const ratio = clamped / prevScale;
      setPosition((prev) => ({
        x: focalX - (focalX - prev.x) * ratio,
        y: focalY - (focalY - prev.y) * ratio,
      }));
      return clamped;
    });
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const focalX = e.clientX - rect.left - rect.width / 2;
    const focalY = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    applyZoom(scale + delta, focalX, focalY);
  };

  const handlePointerDown = (e) => {
    if (scale <= 1) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragState.current || scale <= 1) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPosition({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchState.current = {
        distance: getTouchDistance(e.touches),
        scale,
      };
      dragState.current = null;
    } else if (e.touches.length === 1 && scale > 1) {
      dragState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        originX: position.x,
        originY: position.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchState.current) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const ratio = distance / pinchState.current.distance;
      applyZoom(pinchState.current.scale * ratio, 0, 0);
    } else if (e.touches.length === 1 && dragState.current && scale > 1) {
      const dx = e.touches[0].clientX - dragState.current.startX;
      const dy = e.touches[0].clientY - dragState.current.startY;
      setPosition({
        x: dragState.current.originX + dx,
        y: dragState.current.originY + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchState.current = null;
    dragState.current = null;
  };

  const handleDoubleClick = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const focalX = e.clientX - rect.left - rect.width / 2;
    const focalY = e.clientY - rect.top - rect.height / 2;
    if (scale > 1) {
      resetTransform();
    } else {
      applyZoom(2.5, focalX, focalY);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed image viewer"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => applyZoom(scale - ZOOM_STEP, 0, 0)}
            disabled={scale <= MIN_SCALE}
            className="rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M5 12h14" />
            </svg>
          </button>
          <span className="min-w-[3rem] text-center text-sm text-white/90">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => applyZoom(scale + ZOOM_STEP, 0, 0)}
            disabled={scale >= MAX_SCALE}
            className="rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {scale > 1 && (
            <button
              type="button"
              onClick={resetTransform}
              className="ml-1 rounded-full px-3 py-1.5 text-xs text-white hover:bg-white/10 cursor-pointer sm:text-sm"
            >
              Reset
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white hover:bg-white/10 cursor-pointer"
          aria-label="Close"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden touch-none select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          draggable={false}
        />
      </div>

      <p className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-white/60 sm:text-sm">
        Pinch or scroll to zoom · Double-tap to zoom in/out
      </p>
    </div>
  );
}

/**
 * Product gallery lightbox with prev/next navigation and per-image zoom.
 */
function resolveImageOnlyIndex(images, initialIndex) {
  const imageOnly = (images ?? []).filter((m) => m?.type !== "video" && m?.url);
  const target = images?.[initialIndex];
  if (!target || target.type === "video") return 0;
  const idx = imageOnly.findIndex((m) => m.url === target.url);
  return idx >= 0 ? idx : 0;
}

export function ProductImageZoomLightbox({ images, initialIndex = 0, onClose }) {
  const imageOnly = (images ?? []).filter((m) => m?.type !== "video" && m?.url);
  const [index, setIndex] = useState(() =>
    resolveImageOnlyIndex(images, initialIndex),
  );

  const total = imageOnly.length;
  const current = imageOnly[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? total - 1 : i - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= total - 1 ? 0 : i + 1));
  }, [total]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (!current?.url) return null;

  return (
    <div className="fixed inset-0 z-[240]">
      <ZoomableViewer
        key={current.url}
        src={current.url}
        alt=""
        onClose={onClose}
      />
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="fixed left-2 top-1/2 z-[260] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:left-4 cursor-pointer"
            aria-label="Previous image"
          >
            <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="fixed right-2 top-1/2 z-[260] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:right-4 cursor-pointer"
            aria-label="Next image"
          >
            <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="fixed bottom-[max(2.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-[260] text-center text-sm text-white/90 pointer-events-none">
            {index + 1} / {total}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Zoom trigger button — place over product images.
 */
export function ZoomImageButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md hover:bg-white cursor-pointer sm:h-10 sm:w-10 ${className}`}
      aria-label="Zoom image"
    >
      <ZoomIcon />
    </button>
  );
}

/**
 * Inline image with click-to-zoom. Videos are not zoomable.
 */
export default function ZoomImage({
  src,
  alt = "",
  className = "",
  onZoom,
  showZoomButton = false,
  ...imgProps
}) {
  const [open, setOpen] = useState(false);

  const openZoom = () => {
    if (onZoom) {
      onZoom();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <div className="group relative h-full w-full">
        <img
          src={src}
          alt={alt}
          className={`cursor-zoom-in ${className}`}
          onClick={openZoom}
          {...imgProps}
        />
        {showZoomButton && (
          <ZoomImageButton onClick={openZoom} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      {open && !onZoom && (
        <ZoomableViewer src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
