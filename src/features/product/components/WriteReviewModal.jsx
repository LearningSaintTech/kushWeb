import { useEffect, useId, useRef, useState } from "react";
import { RiStarFill, RiStarLine } from "react-icons/ri";
import { reviewsService } from "../../../services/reviews.service.js";

const MAX_PHOTOS = 5;
const MAX_REVIEW_LENGTH = 2000;

function getUserIdFromReview(r) {
  const uid = r?.userId?._id ?? r?.userId?.id ?? r?.userId ?? r?.user;
  return uid != null ? String(uid) : null;
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

function revokeUrls(urls) {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Modal to create or update a product review (rating + optional text + optional images).
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
  const filePreviewsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(() => {
    return () => revokeUrls(filePreviewsRef.current);
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
    revokeUrls(filePreviewsRef.current);
    filePreviewsRef.current = [];
    setExistingReview(null);
    setRating(5);
    setDescription("");
    setFiles([]);
    setFilePreviews([]);
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

    setFilePreviews((prev) => {
      revokeUrls(prev);
      return [];
    });
    setFiles([]);

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

  const handleFilesChange = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, MAX_PHOTOS);
    setFilePreviews((prev) => {
      revokeUrls(prev);
      const urls = picked.map((f) => URL.createObjectURL(f));
      filePreviewsRef.current = urls;
      return urls;
    });
    setFiles(picked);
    e.target.value = "";
  };

  const removePhotoAt = (index) => {
    setFilePreviews((prev) => {
      const nextUrls = prev.filter((_, i) => i !== index);
      if (prev[index]) {
        try {
          URL.revokeObjectURL(prev[index]);
        } catch {
          /* ignore */
        }
      }
      filePreviewsRef.current = nextUrls;
      return nextUrls;
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId || submitting) return;

    setSubmitting(true);
    setError(null);

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

  if (!open) return null;

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
                  Photos{" "}
                  <span className="font-normal normal-case text-zinc-400">
                    (optional, max {MAX_PHOTOS})
                  </span>
                </span>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 px-4 py-6 transition hover:border-zinc-300 hover:bg-zinc-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleFilesChange}
                    disabled={submitting}
                  />
                  <svg
                    className="mb-2 h-8 w-8 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-zinc-700">
                    Click to upload
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    PNG, JPG — up to {MAX_PHOTOS} images
                  </span>
                </label>

                {filePreviews.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {filePreviews.map((url, i) => (
                      <li
                        key={`${url}-${i}`}
                        className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                      >
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhotoAt(i)}
                          disabled={submitting}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black disabled:opacity-50"
                          aria-label={`Remove photo ${i + 1}`}
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
