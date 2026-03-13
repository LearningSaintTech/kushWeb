import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/context/AuthContext';
import { useNotification } from '../../app/context/NotificationContext';
import { notificationService } from '../../services/notification.service.js';
import { ROUTES } from '../../utils/constants';

const PAGE_SIZE = 20;

function formatNotificationDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { markRead, markAllRead, unreadCount } = useNotification();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async (pageNum = 1, append = false) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await notificationService.getList({ page: pageNum, limit: PAGE_SIZE });
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.AUTH, { replace: true });
      return;
    }
    loadPage(1);
  }, [isAuthenticated, navigate, loadPage]);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n) => {
    if (!n.read) handleMarkRead(n._id);
    if (n.module === 'order' && n.referenceId) {
      // Backend sends referenceId = orderId only (no itemId); track URL needs both. Link to orders list.
      navigate(ROUTES.ORDERS, { state: { orderId: n.referenceId } });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden bg-white">
          {list.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-gray-900 flex-1">{n.title}</p>
                  <span className="text-xs text-gray-500 shrink-0">{formatNotificationDate(n.createdAt)}</span>
                </div>
                {n.body ? <p className="text-sm text-gray-600 mt-1">{n.body}</p> : null}
                {n.module === 'order' && n.referenceId && (
                  <p className="text-xs text-blue-600 mt-1">View order →</p>
                )}
              </button>
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
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
