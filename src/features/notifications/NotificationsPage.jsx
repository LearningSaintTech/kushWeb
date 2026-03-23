import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
import { useNotification } from "../../app/context/NotificationContext";
import { notificationService } from "../../services/notification.service.js";
import { ROUTES } from "../../utils/constants";
import coupon from "../../assets/images/coupon/khushnotifi.svg";
const PAGE_SIZE = 20;

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
  const { markRead, markAllRead, unreadCount } = useNotification();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(
    async (pageNum = 1, append = false) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const data = await notificationService.getList({
          page: pageNum,
          limit: PAGE_SIZE,
        });
        const items = data?.list ?? [];
        setList((prev) => (append ? [...prev, ...items] : items));
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? pageNum);
      } catch {
        if (!append) setList([]);
        setTotal((t) => (append ? t : 0));
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.AUTH, { replace: true });
      return;
    }
    loadPage(1);
  }, [isAuthenticated, navigate, loadPage]);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setList((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n) => {
    if (!n.read) handleMarkRead(n._id);
    if (n.module === "order" && n.referenceId) {
      // Backend sends referenceId = orderId only (no itemId); track URL needs both. Link to orders list.
      navigate(ROUTES.ORDERS, { state: { orderId: n.referenceId } });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
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
            <li key={n._id}>
              <div
                onClick={() => handleNotificationClick(n)}
                className={`relative flex items-start gap-4 p-4 rounded-lg border bg-white transition cursor-pointer
  ${!n.read ? "bg-gray-50 border-gray-300" : "border-gray-200 hover:bg-gray-50"}`}
              >
                {/* Left Vertical Line */}
                <div className="absolute left-0 top-1 bottom-1 w-[4px] bg-black rounded-full"></div>

                {/* Icon */}
                <div className="ml-3 w-10 h-10 flex items-center justify-center shrink-0">
                  <img
                    src={coupon}
                    alt="icon"
                    className="w-full h-full object-contain"
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

      {total > PAGE_SIZE && list.length < total && (
        <button
          type="button"
          onClick={() => loadPage(page + 1, true)}
          disabled={loading}
          className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
