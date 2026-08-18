/**
 * Community feed + engagement hooks — centralized data loading with debug logs.
 * Follow / save / like persist via CommunitySocialContext across pages.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { communityService, getCommunityErrorMessage } from '../../../services/community.service.js';
import { logCommunity } from '../../../services/communityApi.js';
import { debugError, debugLog } from '../../../utils/debugLog.js';
import {
  mapContentToPost,
  mapContentToReel,
  mapSaveItem,
  extractSavesList,
} from '../../../services/communityContent.mappers.js';
import { useCommunitySocial } from '../context/CommunitySocialContext';

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

  const { seedFromContentItems, withSocial } = useCommunitySocial();
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

        seedFromContentItems(mapped);
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
    [enabled, scope, type, q, hashtag, itemId, limit, seedFromContentItems],
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

  const socialItems = useMemo(
    () => items.map((item) => withSocial(item)),
    [items, withSocial],
  );

  return {
    items: socialItems,
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
  const { seedFromContentItems, withSocial } = useCommunitySocial();
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
      const raw = extractSavesList(data);
      const mapped = raw.map(mapSaveItem).filter(Boolean);
      seedFromContentItems(mapped.map((m) => ({ ...m, isSaved: true })));
      setItems(mapped);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(Boolean(data?.hasMore));
      debugLog('[Community] useCommunitySaves.ok', {
        type,
        rawCount: raw.length,
        mappedCount: mapped.length,
        sample: mapped[0]
          ? { id: mapped[0].id, type: mapped[0].type, image: Boolean(mapped[0].image) }
          : null,
      });
      logCommunity('useCommunitySaves.ok', { count: mapped.length, rawCount: raw.length });
    } catch (err) {
      const message = getCommunityErrorMessage(err, 'Failed to load saves');
      debugError('[Community] useCommunitySaves error', message);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, type, seedFromContentItems]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const socialItems = useMemo(
    () => items.map((item) => withSocial({ ...item, isSaved: true })),
    [items, withSocial],
  );

  return { items: socialItems, loading, error, hasMore, nextCursor, refresh, setItems };
}

/** Optimistic like toggle — updates local patch + global social store */
export async function toggleCommunityLike(item, patchItem, social) {
  const id = item?.id;
  if (!id) return;
  const current = social
    ? social.isLikedContent(id, item.isLiked)
    : Boolean(item.isLiked);
  const nextLiked = !current;
  const nextCount = Math.max(0, (item.likeCount || 0) + (nextLiked ? 1 : -1));
  const likesLabel = social
    ? social.formatEngagementCount(nextCount)
    : String(nextCount);

  patchItem?.(id, {
    isLiked: nextLiked,
    likeCount: nextCount,
    likes: likesLabel,
  });

  if (social?.toggleLike) {
    try {
      await social.toggleLike(id, current);
    } catch (err) {
      patchItem?.(id, {
        isLiked: current,
        likeCount: item.likeCount,
        likes: item.likes,
      });
      throw err;
    }
    return;
  }

  logCommunity('toggleLike', { id, nextLiked, nextCount });
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
export async function toggleCommunitySave(item, patchItem, social) {
  const id = item?.id;
  if (!id) return;
  const current = social
    ? social.isSavedContent(id, item.isSaved)
    : Boolean(item.isSaved);
  const nextSaved = !current;
  patchItem?.(id, { isSaved: nextSaved });

  if (social?.toggleSave) {
    try {
      await social.toggleSave(id, current);
    } catch (err) {
      patchItem?.(id, { isSaved: current });
      throw err;
    }
    return;
  }

  logCommunity('toggleSave', { id, nextSaved });
  try {
    if (nextSaved) await communityService.save(id);
    else await communityService.unsave(id);
  } catch (err) {
    patchItem?.(id, { isSaved: item.isSaved });
    throw err;
  }
}

/** Optimistic follow / unfollow — always prefer global social store */
export async function toggleCommunityFollow(author, patchByAuthorId, social) {
  const userId = author?.id;
  if (!userId) return;
  const current = social
    ? social.isFollowingUser(userId, author?.isFollowing)
    : Boolean(author?.isFollowing);
  const nextFollowing = !current;

  patchByAuthorId?.(userId, { isFollowing: nextFollowing });

  if (social?.toggleFollow) {
    try {
      await social.toggleFollow(userId, current);
    } catch (err) {
      patchByAuthorId?.(userId, { isFollowing: current });
      throw err;
    }
    return;
  }

  logCommunity('toggleFollow', { userId, nextFollowing });
  try {
    if (nextFollowing) await communityService.follow(userId);
    else await communityService.unfollow(userId);
  } catch (err) {
    patchByAuthorId?.(userId, { isFollowing: Boolean(author?.isFollowing) });
    throw err;
  }
}
