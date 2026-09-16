import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { notificationService } from '../../services/notification.service.js';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../../services/config.js';
import { debugLog } from '../../utils/debugLog.js';

export function isWishlistNotification(n) {
  if (!n) return false;
  const str = [
    n?.module,
    n?.type,
    n?.templateKey,
    n?.action,
    n?.eventType,
    n?.title,
    n?.body,
    n?.message,
    typeof n?.metadata === 'object' ? JSON.stringify(n.metadata) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return str.includes('wishlist');
}

export function isValidNotification(n) {
  if (!n) return false;
  if (isWishlistNotification(n)) return false;
  const rawBody = n?.body ?? n?.message ?? n?.content ?? '';
  const rawTitle = n?.title ?? '';
  const body = typeof rawBody === 'string' ? rawBody.trim() : String(rawBody).trim();
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle).trim();
  const isInvalid = (s) =>
    !s ||
    s === 'undefined' ||
    s === 'null' ||
    s === '{}' ||
    s === '[]' ||
    s === '[object Object]';
  return !isInvalid(body) || !isInvalid(title);
}

export function isCommunityNotification(n) {
  return n?.module === 'community' || String(n?.templateKey || '').startsWith('COMMUNITY_');
}

export function isStoreNotification(n) {
  return isValidNotification(n) && !isWishlistNotification(n) && !isCommunityNotification(n);
}

export function isVisibleCommunityNotification(n) {
  return isValidNotification(n) && !isWishlistNotification(n) && isCommunityNotification(n);
}

export function isVisibleNotification(n) {
  return isValidNotification(n) && !isWishlistNotification(n);
}

function notificationId(n) {
  const id = n?._id ?? n?.id;
  return id != null && id !== '' ? String(id) : '';
}

/**
 * Walk API pages until we have `want` visible items (skips blank/wishlist holes).
 * Used so page 1 is never empty while real order/community rows sit on later pages.
 */
export async function collectVisibleNotifications({
  predicate = isVisibleNotification,
  want,
  startPage = 1,
  apiLimit = 40,
  maxPages = 20,
  excludeIds = [],
} = {}) {
  const items = [];
  const seen = new Set(
    (excludeIds || []).map((id) => String(id)).filter(Boolean),
  );
  let apiPage = Math.max(1, startPage);
  let lastRawLength = 0;
  let pagesFetched = 0;

  while (items.length < want && pagesFetched < maxPages) {
    const data = await notificationService.getList({ page: apiPage, limit: apiLimit });
    const raw = Array.isArray(data?.list) ? data.list : [];
    lastRawLength = raw.length;
    pagesFetched += 1;

    for (const n of raw) {
      if (!predicate(n)) continue;
      const id = notificationId(n);
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      items.push(n);
      if (items.length >= want) break;
    }

    if (raw.length < apiLimit) break;
    apiPage += 1;
  }

  const lastPage = startPage + pagesFetched - 1;
  const apiHasMore = lastRawLength >= apiLimit;
  return {
    items,
    lastPage: lastPage > 0 ? lastPage : startPage,
    hasMore: items.length >= want && apiHasMore,
  };
}

/**
 * UI page of visible notifications. Compacts filtered-out blanks so orders
 * that lived on API page 2 still appear on UI page 1.
 */
export async function collectVisibleNotificationPage({
  predicate,
  page = 1,
  pageSize = 20,
  apiLimit = 40,
  maxPages = 25,
} = {}) {
  const skip = Math.max(0, (page - 1) * pageSize);
  const { items, lastPage } = await collectVisibleNotifications({
    predicate,
    want: skip + pageSize + 1,
    startPage: 1,
    apiLimit,
    maxPages,
  });
  const pageItems = items.slice(skip, skip + pageSize);
  return {
    items: pageItems,
    page,
    hasPrev: page > 1,
    hasNext: items.length > skip + pageSize,
    lastPage,
  };
}

const NotificationContext = createContext(null);
const LIST_PAGE_SIZE = 30;
const DROPDOWN_LIMIT = 5;

export function NotificationProvider({ children }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const refreshList = useCallback(async (page = 1, limit = LIST_PAGE_SIZE) => {
    setLoading(true);
    try {
      const { items } = await collectVisibleNotifications({
        predicate: isVisibleNotification,
        want: limit,
        startPage: page,
        apiLimit: Math.max(limit, 40),
      });
      setList(items);
      return { list: items, total: items.length, page, limit };
    } catch {
      setList([]);
      return { list: [], total: 0, page: 1, limit };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadCount();
      return data?.count ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await notificationService.markRead(id);
      setList((prev) => prev.map((n) => ((n._id || n.id) === id ? { ...n, read: true } : n)));
    } catch {
      // keep state as is
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // keep state as is
    }
  }, []);

  const markCommunityAllRead = useCallback(async () => {
    try {
      const communityUnreadItems = list.filter((n) => isCommunityNotification(n) && !n.read);
      await Promise.allSettled(
        communityUnreadItems.map((n) => notificationService.markRead(n._id || n.id))
      );
      setList((prev) =>
        prev.map((n) => (isCommunityNotification(n) ? { ...n, read: true } : n))
      );
    } catch {
      // keep state as is
    }
  }, [list]);

  const markStoreAllRead = useCallback(async () => {
    try {
      const storeUnreadItems = list.filter((n) => !isCommunityNotification(n) && !n.read);
      await Promise.allSettled(
        storeUnreadItems.map((n) => notificationService.markRead(n._id || n.id))
      );
      setList((prev) =>
        prev.map((n) => (!isCommunityNotification(n) ? { ...n, read: true } : n))
      );
    } catch {
      // keep state as is
    }
  }, [list]);

  const prependFromSocket = useCallback((payload) => {
    if (!payload || !isValidNotification(payload) || isWishlistNotification(payload)) {
      return;
    }

    const rawBody = payload.body ?? payload.message ?? payload.content ?? '';
    const rawTitle = payload.title ?? '';
    const body = typeof rawBody === 'string' ? rawBody.trim() : String(rawBody).trim();
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle).trim();

    const item = {
      _id: payload.id || payload._id || `notif-${Date.now()}`,
      title: title || 'New Notification',
      body: body || '',
      image: payload.image || '',
      module: payload.module || 'community',
      referenceId: payload.referenceId || null,
      templateKey: payload.templateKey || null,
      metadata: payload.metadata || {},
      createdAt: payload.createdAt || new Date().toISOString(),
      read: false,
    };
    setList((prev) => [item, ...prev.filter((n) => (n._id || n.id) !== item._id)]);
  }, []);

  // Separate Community vs Store notifications
  const communityList = useMemo(() => list.filter(isCommunityNotification), [list]);
  const storeList = useMemo(() => list.filter((n) => !isCommunityNotification(n)), [list]);

  const dropdownList = useMemo(() => storeList.slice(0, DROPDOWN_LIMIT), [storeList]);
  const communityDropdownList = useMemo(() => communityList.slice(0, DROPDOWN_LIMIT), [communityList]);

  const communityUnreadCount = useMemo(() => communityList.filter((n) => !n.read).length, [communityList]);
  const storeUnreadCount = useMemo(() => storeList.filter((n) => !n.read).length, [storeList]);
  const totalUnreadCount = useMemo(() => list.filter((n) => !n.read).length, [list]);

  return (
    <NotificationContext.Provider
      value={{
        list,
        storeList,
        communityList,
        dropdownList,
        communityDropdownList,
        unreadCount: storeUnreadCount, // For store header & store pages
        storeUnreadCount,
        communityUnreadCount, // For community sidebar & community drawer
        totalUnreadCount,
        loading,
        refreshList,
        refreshUnreadCount,
        markRead,
        markAllRead,
        markStoreAllRead,
        markCommunityAllRead,
        prependFromSocket,
        socketRef,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

/** Hook to connect socket and fetch initial data when token is available. */
export function useNotificationSocket(token) {
  const { refreshList, refreshUnreadCount, prependFromSocket, socketRef } = useNotification();

  useEffect(() => {
    const socketUrl = getSocketUrl();
    if (!token || !socketUrl) return;

    const socket = io(socketUrl, {
      auth: { token },
      transports: import.meta.env.DEV
        ? ['polling', 'websocket']
        : ['websocket', 'polling'],
      reconnectionAttempts: 8,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      refreshList(1, LIST_PAGE_SIZE).catch(() => {});
      refreshUnreadCount().catch(() => {});
    });

    socket.on('notification:new', (payload) => {
      prependFromSocket(payload);
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        debugLog('[Notifications] socket connect_error', {
          message: err?.message,
          socketUrl,
        });
      }
      refreshList(1, LIST_PAGE_SIZE).catch(() => {});
      refreshUnreadCount().catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, refreshList, refreshUnreadCount, prependFromSocket, socketRef]);

  return null;
}
