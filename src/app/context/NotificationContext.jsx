import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { notificationService } from '../../services/notification.service.js';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../../services/config.js';
import { debugLog } from '../../utils/debugLog.js';

export function isCommunityNotification(n) {
  return n?.module === 'community' || String(n?.templateKey || '').startsWith('COMMUNITY_');
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
      const data = await notificationService.getList({ page, limit });
      const items = data?.list ?? [];
      const total = data?.total ?? 0;
      setList(items);
      return { list: items, total, page: data?.page ?? page, limit: data?.limit ?? limit };
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
    if (!payload) return;
    const item = {
      _id: payload.id || payload._id || `notif-${Date.now()}`,
      title: payload.title || 'New Notification',
      body: payload.body || '',
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
