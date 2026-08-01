/**
 * Community feed + engagement hooks — centralized data loading with debug logs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { communityService, getCommunityErrorMessage } from '../../../services/community.service.js';
import { logCommunity } from '../../../services/communityApi.js';
import { debugError } from '../../../utils/debugLog.js';
import {
  mapContentToPost,
  mapContentToReel,
  mapSaveItem,
} from '../api/communityContentMappers.js';

/**
 * Cursor-paginated feed.
 * @param {{ scope?: string, type?: string, q?: string, hashtag?: string, enabled?: boolean }} options
 */
export function useCommunityFeed(options = {}) {
  const {
    scope = 'following',
    type = 'all',
    q,
    hashtag,
    itemId,
    limit = 20,
    enabled = true,
  } = options;

  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async ({ cursor, append } = {}) => {
      if (!enabled) return;
      const id = ++reqId.current;
      const isMore = Boolean(cursor);
      if (isMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      logCommunity('useCommunityFeed.fetch', { scope, type, q, hashtag, cursor, append });

      try {
        const data = await communityService.getFeed({
          scope,
          type,
          q,
          hashtag,
          itemId,
          limit,
          cursor,
        });
        if (id !== reqId.current) return;

        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const mapped =
          type === 'reel'
            ? rawItems.map(mapContentToReel).filter(Boolean)
            : rawItems.map(mapContentToPost).filter(Boolean);

        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setNextCursor(data?.nextCursor ?? null);
        setHasMore(Boolean(data?.hasMore));
        logCommunity('useCommunityFeed.ok', {
          count: mapped.length,
          hasMore: data?.hasMore,
          nextCursor: data?.nextCursor,
        });
      } catch (err) {
        if (id !== reqId.current) return;
        const message = getCommunityErrorMessage(err, 'Failed to load feed');
        debugError('[Community] useCommunityFeed error', message);
        setError(message);
        if (!append) setItems([]);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enabled, scope, type, q, hashtag, itemId, limit],
  );

  useEffect(() => {
    fetchPage({ append: false });
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage({ append: false }), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore || loading) return;
    return fetchPage({ cursor: nextCursor, append: true });
  }, [fetchPage, hasMore, nextCursor, loadingMore, loading]);

  const patchItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    nextCursor,
    refresh,
    loadMore,
    patchItem,
    setItems,
  };
}

export function useCommunitySaves({ type = 'all', enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    logCommunity('useCommunitySaves.fetch', { type });
    try {
      const data = await communityService.getSaves({ type, limit: 20 });
      const raw = Array.isArray(data?.items) ? data.items : [];
      setItems(raw.map(mapSaveItem).filter(Boolean));
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(Boolean(data?.hasMore));
      logCommunity('useCommunitySaves.ok', { count: raw.length });
    } catch (err) {
      const message = getCommunityErrorMessage(err, 'Failed to load saves');
      debugError('[Community] useCommunitySaves error', message);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, hasMore, nextCursor, refresh, setItems };
}

/** Optimistic like toggle */
export async function toggleCommunityLike(item, patchItem) {
  const id = item?.id;
  if (!id) return;
  const nextLiked = !item.isLiked;
  const nextCount = Math.max(0, (item.likeCount || 0) + (nextLiked ? 1 : -1));
  patchItem?.(id, {
    isLiked: nextLiked,
    likeCount: nextCount,
    likes: String(nextCount),
  });
  logCommunity('toggleLike', { id, nextLiked });
  try {
    if (nextLiked) await communityService.like(id);
    else await communityService.unlike(id);
  } catch (err) {
    patchItem?.(id, {
      isLiked: item.isLiked,
      likeCount: item.likeCount,
      likes: item.likes,
    });
    throw err;
  }
}

/** Optimistic save toggle */
export async function toggleCommunitySave(item, patchItem) {
  const id = item?.id;
  if (!id) return;
  const nextSaved = !item.isSaved;
  patchItem?.(id, { isSaved: nextSaved });
  logCommunity('toggleSave', { id, nextSaved });
  try {
    if (nextSaved) await communityService.save(id);
    else await communityService.unsave(id);
  } catch (err) {
    patchItem?.(id, { isSaved: item.isSaved });
    throw err;
  }
}
