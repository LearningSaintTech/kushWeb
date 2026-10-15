import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
import {
  useNotification,
  isStoreNotification,
  collectVisibleNotifications,
} from "../../app/context/NotificationContext";
import { ROUTES } from "../../utils/constants";
import { trackEvent } from "../../analytics";
import coupon from "../../assets/images/coupon/khushnotifi.svg";
const PAGE_SIZE = 20;
/** API pages walked to build the full list (same cap as collectVisibleNotificationPage). */
const MAX_API_PAGES = 25;

/** Page numbers with "…" gaps, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function getPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

function formatNotificationDate(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { markRead, markStoreAllRead, storeUnreadCount } = useNotification();
  // Full visible list; pages are sliced locally so the total page count is exact.
  const [allItems, setAllItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await collectVisibleNotifications({
        predicate: isStoreNotification,
        want: Number.POSITIVE_INFINITY,
        maxPages: MAX_API_PAGES,
      });
      setAllItems(result.items);
      setPage(1);
    } catch {
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.AUTH, { replace: true });
      return;
    }
    loadAll();
  }, [isAuthenticated, navigate, loadAll]);

  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const list = useMemo(
    () => allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allItems, page],
  );
  const pageItems = useMemo(() => getPageItems(page, totalPages), [page, totalPages]);

  const goToPage = (next) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target === page) return;
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMarkRead = async (id) => {
    await markRead(id);
    setAllItems((prev) =>
      prev.map((n) => ((n._id || n.id) === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await markStoreAllRead();
    setAllItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n) => {
    const id = n?._id || n?.id;
    trackEvent({
      eventType: "notification_opened",
      meta: {
        notificationId: id ? String(id) : undefined,
        module: n?.module || undefined,
        referenceId: n?.referenceId ? String(n.referenceId) : undefined,
      },
    });
    if (!n.read && id) handleMarkRead(id);
    if (n.module === "order" && n.referenceId) {
      // Backend sends referenceId = orderId only (no itemId); track URL needs both. Link to orders list.
      navigate(ROUTES.ORDERS, { state: { orderId: n.referenceId } });
      return;
    }
    if (n.module === "offer") {
      navigate(ROUTES.HOME);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-[20vh] sm:mt-[15vh] md:mt-[10vh] lg:mt-[8vh] py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        {storeUnreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500 py-8">No notifications yet.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((n) => (
            <li key={n._id || n.id}>
              <div
                onClick={() => handleNotificationClick(n)}
                className={`relative flex items-start gap-4 p-4 rounded-lg border bg-white transition cursor-pointer
  ${!n.read ? "bg-gray-50 border-gray-300" : "border-gray-200 hover:bg-gray-50"}`}
              >
                {/* Left Vertical Line */}
                <div className="absolute left-0 top-1 bottom-1 w-[4px] bg-black rounded-full"></div>

                {/* Icon */}
                <div className="ml-3 w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                  <img
                    src={n.image || coupon}
                    alt={n.title}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (n.image) {
                        setSelectedImage(n.image);
                      }
                    }}
                    onError={(e) => {
                      e.target.src = coupon;
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 ">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatNotificationDate(n.createdAt)}
                    </span>
                  </div>

                  {n.body && (
                    <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  )}

                  {/* CTA */}
                  {n.module === "offer" && (
                    <button className="mt-3 px-3 py-1 text-xs border rounded-md text-gray-700 hover:bg-gray-100">
                      Shop Now
                    </button>
                  )}

                  {n.module === "order" && n.referenceId && (
                    <p className="text-xs text-black mt-2 font-medium ">
                      View order →
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && totalPages > 1 && (
        <nav
          className="mt-8 flex flex-col items-center gap-3 border-t border-gray-200 pt-6"
          aria-label="Notifications pagination"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {pageItems.map((p) =>
              typeof p === "number" ? (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer ${
                    p === page
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={p} className="px-1 text-sm text-gray-400" aria-hidden>
                  …
                </span>
              ),
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{page}</span> of{" "}
            <span className="font-medium text-gray-900">{totalPages}</span>
          </p>
        </nav>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            className="absolute top-5 right-5 text-white text-4xl font-bold hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>

          {/* Image */}
          <img
            src={selectedImage}
            alt="Notification"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl cursor-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
