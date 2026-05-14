import { useState, useEffect, useCallback } from "react";
import { reviewsService } from "../../../services/reviews.service.js";
import {
  getUrlFromMediaEntry,
  isVideoMediaEntry,
} from "../../../utils/mediaUrl.js";

function normalizeGalleryList(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  return list
    .map((raw) => {
      const url = getUrlFromMediaEntry(raw);
      if (!url) return null;
      return { url, isVideo: isVideoMediaEntry(raw) };
    })
    .filter(Boolean);
}

/**
 * Lightbox: large image or video with controls, prev/next, close.
 */
function MediaLightbox({ items, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const total = items.length;

  const goPrev = useCallback(
    () => setIndex((i) => (i <= 0 ? total - 1 : i - 1)),
    [total],
  );
  const goNext = useCallback(
    () => setIndex((i) => (i >= total - 1 ? 0 : i + 1)),
    [total],
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  if (total === 0) return null;
  const safeIndex = Math.min(Math.max(0, index), total - 1);
  const current = items[safeIndex];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-4 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Customer media gallery"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 cursor-pointer"
        aria-label="Close"
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:left-4 cursor-pointer"
        aria-label="Previous"
      >
        <svg
          className="h-10 w-10 sm:h-12 sm:w-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <div
        className="relative max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[90vw] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {current?.isVideo ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="max-h-[80vh] sm:max-h-[85vh] max-w-full bg-black object-contain"
          />
        ) : (
          <img
            src={current?.url}
            alt=""
            className="max-h-[80vh] sm:max-h-[85vh] max-w-full object-contain"
          />
        )}
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-white/90">
          {safeIndex + 1} / {total}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:right-4 cursor-pointer"
        aria-label="Next"
      >
        <svg
          className="h-10 w-10 sm:h-12 sm:w-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}

function GalleryThumb({ url, isVideo, onActivate, sizeClass }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`relative shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0 focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer ${sizeClass}`}
      aria-label={isVideo ? "View customer video" : "View customer photo"}
    >
      {isVideo ? (
        <span className="relative block h-full w-full bg-black">
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-contain object-center"
            aria-hidden
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 sm:h-8 sm:w-8">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 fill-white sm:h-3.5 sm:w-3.5"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </span>
      ) : (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover transition-transform hover:scale-105"
          loading="lazy"
        />
      )}
    </button>
  );
}

const FEATURED_VISIBLE_COUNT = 3;

/**
 * Fetches review media for a product and shows a grid. Supports photos and videos.
 */
export default function ProductReviewImages({
  itemId,
  compact = false,
  layout = "default",
}) {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    reviewsService
      .getImagesByItem(itemId)
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? {};
        const list = Array.isArray(payload.images) ? payload.images : [];
        setGalleryItems(normalizeGalleryList(list));
      })
      .catch(() => setGalleryItems([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (!itemId) return null;

  const openLightbox = (index) => {
    if (galleryItems.length)
      setLightbox({ items: galleryItems, currentIndex: index });
  };

  if (layout === "featured") {
    const visible = galleryItems.slice(0, FEATURED_VISIBLE_COUNT);
    const restCount = Math.max(0, galleryItems.length - FEATURED_VISIBLE_COUNT);

    return (
      <>
        {loading && <p className="text-sm text-gray-500">Loading photos…</p>}
        {!loading && galleryItems.length === 0 && (
          <p className="text-sm text-gray-500">No customer photos yet.</p>
        )}
        {!loading && galleryItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {visible.map((item, idx) => (
              <GalleryThumb
                key={`${item.url}-${idx}`}
                url={item.url}
                isVideo={item.isVideo}
                onActivate={() => openLightbox(idx)}
                sizeClass="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
              />
            ))}
            {restCount > 0 && (
              <button
                type="button"
                onClick={() => openLightbox(FEATURED_VISIBLE_COUNT)}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-black/80 text-xs font-medium text-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/20 sm:h-20 sm:w-20 md:h-24 md:w-24 sm:text-sm cursor-pointer"
                aria-label={`View ${restCount} more items`}
              >
                +{restCount}
              </button>
            )}
          </div>
        )}
        {lightbox && (
          <MediaLightbox
            items={lightbox.items}
            initialIndex={lightbox.currentIndex}
            onClose={() => setLightbox(null)}
          />
        )}
      </>
    );
  }

  return (
    <section
      className={compact ? "pb-4 sm:pb-6" : "mt-8 sm:mt-10 pb-6"}
      aria-label="Customer photos"
    >
      <h2 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
        Customer Photos ({galleryItems.length})
      </h2>
      {loading && (
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
          Loading photos…
        </p>
      )}
      {!loading && galleryItems.length === 0 && (
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
          No customer photos yet.
        </p>
      )}
      {!loading && galleryItems.length > 0 && (
        <>
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-4">
            {galleryItems.map((item, idx) => (
              <GalleryThumb
                key={`${item.url}-${idx}`}
                url={item.url}
                isVideo={item.isVideo}
                onActivate={() => openLightbox(idx)}
                sizeClass="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28"
              />
            ))}
          </div>
          {lightbox && (
            <MediaLightbox
              items={lightbox.items}
              initialIndex={lightbox.currentIndex}
              onClose={() => setLightbox(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
