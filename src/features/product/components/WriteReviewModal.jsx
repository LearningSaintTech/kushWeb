import { useEffect, useId, useRef, useState } from "react";
import { RiStarFill, RiStarLine } from "react-icons/ri";
import { reviewsService } from "../../../services/reviews.service.js";

/** Max total attachments (photos + videos combined). */
const MAX_MEDIA = 5;
const MAX_REVIEW_LENGTH = 2000;

/** Allowed MIME types (plus extension fallback when type is empty). */
const ALLOWED_MIME =
  /^(image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|webm|quicktime|x-msvideo))$/i;
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|mp4|webm|mov|m4v)$/i;

function getUserIdFromReview(r) {
  const uid = r?.userId?._id ?? r?.userId?.id ?? r?.userId ?? r?.user;
  return uid != null ? String(uid) : null;
}

function isAllowedMediaFile(file) {
  if (!file || typeof file !== "object") return false;
  const base = (file.type || "").split(";")[0].trim();
  if (base && ALLOWED_MIME.test(base)) return true;
  if (!file.type && typeof file.name === "string" && ALLOWED_EXT.test(file.name))
    return true;
  return false;
}

function isVideoFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || "");
}

function revokeItemUrls(items) {
  items.forEach(({ url }) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  });
}

function InteractiveStars({ value, onChange, disabled }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Overall rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="rounded p-0.5 text-amber-500 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={star <= value}
        >
          {star <= value ? (
            <RiStarFill className="h-8 w-8 sm:h-9 sm:w-9" />
          ) : (
            <RiStarLine className="h-8 w-8 sm:h-9 sm:w-9 text-zinc-300" />
          )}
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-zinc-700">
        {value} / 5
      </span>
    </div>
  );
}

/**
 * Modal to create or update a product review (rating + optional text + optional photos/videos).
 */
export default function WriteReviewModal({
  open,
  onClose,
  itemId,
  productName,
  currentUserId,
  onSubmitted,
}) {
  const titleId = useId();
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaUrlsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState("");
  /** @type {{ file: File; url: string }[]} */
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    mediaUrlsRef.current = mediaItems.map((m) => m.url);
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setMediaItems((prev) => {
      revokeItemUrls(prev);
      return [];
    });
    setExistingReview(null);
    setRating(5);
    setDescription("");
    setError(null);
    setLoading(false);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open || !itemId) return;
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    setMediaItems((prev) => {
      revokeItemUrls(prev);
      return [];
    });

    reviewsService
      .getByItem(itemId, { page: 1, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? {};
        const list = Array.isArray(payload.reviews)
          ? payload.reviews
          : Array.isArray(payload.data)
            ? payload.data
            : [];
        const mine = list.find(
          (r) => getUserIdFromReview(r) === String(currentUserId),
        );
        if (mine) {
          setExistingReview(mine);
          setRating(Number(mine.rating) || 5);
          setDescription(mine.description ?? "");
        } else {
          setExistingReview(null);
          setRating(5);
          setDescription("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ??
              err?.message ??
              "Could not load your review.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, itemId, currentUserId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const appendMediaFiles = (picked) => {
    if (!picked.length) return;
    const valid = picked.filter(isAllowedMediaFile);
    let fileError = null;
    if (picked.length > valid.length) {
      fileError =
        "Some files were skipped. Use images (JPG, PNG, GIF, WebP) or video (MP4, WebM, MOV).";
    }
    if (valid.length === 0) {
      if (fileError) setError(fileError);
      return;
    }

    setMediaItems((prev) => {
      const combined = [...prev.map((p) => p.file), ...valid];
      if (combined.length > MAX_MEDIA) {
        fileError = `You can attach up to ${MAX_MEDIA} photos or videos in total.`;
      }
      const nextFiles = combined.slice(0, MAX_MEDIA);
      revokeItemUrls(prev);
      return nextFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
    });

    if (fileError) setError(fileError);
    else setError(null);
  };

  const handleFilesChange = (e) => {
    const picked = Array.from(e.target.files || []);
    appendMediaFiles(picked);
    e.target.value = "";
  };

  const removeMediaAt = (index) => {
    setMediaItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index]) {
        try {
          URL.revokeObjectURL(prev[index].url);
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || submitting) return;

    setSubmitting(true);
    setError(null);

    const files = mediaItems.map((m) => m.file);
    const payload = {
      rating,
      description: description.trim().slice(0, MAX_REVIEW_LENGTH),
      files,
    };

    const promise = existingReview
      ? reviewsService.update(existingReview._id ?? existingReview.id, payload)
      : reviewsService.create({ ...payload, itemId });

    promise
      .then(() => {
        onSubmitted?.();
        onClose?.();
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Something went wrong. Please try again.",
        );
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = () => {
    const id = existingReview?._id ?? existingReview?.id;
    if (!id || submitting) return;
    if (!window.confirm("Remove your review for this product?")) return;
    setSubmitting(true);
    setError(null);
    reviewsService
      .delete(id)
      .then(() => {
        onSubmitted?.();
        onClose?.();
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Could not delete review.",
        );
      })
      .finally(() => setSubmitting(false));
  };

  const openPhotoPicker = () => photoInputRef.current?.click();
  const openVideoPicker = () => videoInputRef.current?.click();

  if (!open) return null;

  const acceptPhoto =
    "image/jpeg,image/jpg,image/png,image/gif,image/webp,image/*";
  const acceptVideo =
    "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      aria-labelledby={titleId}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
        aria-label="Close dialog"
        onClick={() => !submitting && onClose?.()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200/80 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-100 bg-zinc-950 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-inter text-base font-semibold tracking-wide text-white sm:text-lg"
              >
                Rate &amp; review
              </h2>
              {productName ? (
                <p className="mt-1 truncate text-xs text-zinc-400 sm:text-sm">
                  {productName}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Share your experience to help other shoppers.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => !submitting && onClose?.()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
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
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
              <p className="mt-4 text-sm text-zinc-600">Loading your review…</p>
            </div>
          ) : (
            <form id="write-review-form" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Overall rating
                </p>
                <InteractiveStars
                  value={rating}
                  onChange={setRating}
                  disabled={submitting}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Tap a star to set your rating. You can change it before submitting.
                </p>
              </div>

              <div>
                <label
                  htmlFor="review-description"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Written review{" "}
                  <span className="font-normal normal-case text-zinc-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="review-description"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value.slice(0, MAX_REVIEW_LENGTH),
                    )
                  }
                  rows={4}
                  placeholder="Fit, fabric quality, styling — what stood out for you?"
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900/20"
                  disabled={submitting}
                />
                <p className="mt-1.5 text-right text-[11px] text-zinc-400">
                  {description.length} / {MAX_REVIEW_LENGTH}
                </p>
              </div>

              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Photos &amp; videos{" "}
                  <span className="font-normal normal-case text-zinc-400">
                    (optional, max {MAX_MEDIA} total)
                  </span>
                </span>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept={acceptPhoto}
                  multiple
                  className="sr-only"
                  onChange={handleFilesChange}
                  disabled={submitting || mediaItems.length >= MAX_MEDIA}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={acceptVideo}
                  multiple
                  className="sr-only"
                  onChange={handleFilesChange}
                  disabled={submitting || mediaItems.length >= MAX_MEDIA}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={openPhotoPicker}
                    disabled={
                      submitting || mediaItems.length >= MAX_MEDIA
                    }
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[140px] sm:flex-none"
                  >
                    <svg
                      className="h-5 w-5 shrink-0 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Add photos
                  </button>
                  <button
                    type="button"
                    onClick={openVideoPicker}
                    disabled={
                      submitting || mediaItems.length >= MAX_MEDIA
                    }
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[140px] sm:flex-none"
                  >
                    <svg
                      className="h-5 w-5 shrink-0 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Add video
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  JPG, PNG, WebP, GIF, or MP4 / WebM / MOV — up to {MAX_MEDIA}{" "}
                  files combined. You can add more in separate steps.
                </p>

                {mediaItems.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {mediaItems.map(({ file, url }, i) => (
                      <li
                        key={`${url}-${i}`}
                        className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900"
                      >
                        {isVideoFile(file) ? (
                          <video
                            src={url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            aria-label="Video preview"
                          />
                        ) : (
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                          {isVideoFile(file) ? "Video" : "Photo"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMediaAt(i)}
                          disabled={submitting}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black disabled:opacity-50"
                          aria-label={`Remove ${isVideoFile(file) ? "video" : "photo"} ${i + 1}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error ? (
                <p
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>

        {!loading && (
          <footer className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {existingReview ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="text-xs font-semibold uppercase tracking-wide text-red-600 underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    Delete review
                  </button>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    You can edit or remove your review anytime.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !submitting && onClose?.()}
                  className="min-h-11 flex-1 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-zinc-800 transition hover:bg-zinc-50 sm:flex-initial sm:min-w-[100px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="write-review-form"
                  disabled={submitting}
                  className="min-h-11 flex-1 rounded-full bg-zinc-950 px-6 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial"
                >
                  {submitting
                    ? existingReview
                      ? "Saving…"
                      : "Posting…"
                    : existingReview
                      ? "Update review"
                      : "Submit review"}
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
