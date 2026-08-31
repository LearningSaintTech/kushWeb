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
 * Cursor-paginated feed with deduplication, in-flight protection, and stable rendering.
 * @param {{ scope?: string, type?: string, q?: string, hashtag?: string, itemId?: string, limit?: number, enabled?: boolean }} options
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

  // Concurrency & deduplication guards
  const reqId = useRef(0);
  const inFlightRef = useRef(false);
  const lastCursorRef = useRef(null);

  // Keep latest seed function in ref to avoid recreating fetchPage callback on social updates
  const seedRef = useRef(seedFromContentItems);
  useEffect(() => {
    seedRef.current = seedFromContentItems;
  }, [seedFromContentItems]);

  const fetchPage = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (!enabled) return;

      // Prevent concurrent duplicate requests
      if (inFlightRef.current) {
        logCommunity('useCommunityFeed.skip_in_flight', { cursor, append });
        return;
      }

      // Prevent requesting the exact same cursor again when paginating
      if (append && cursor && cursor === lastCursorRef.current) {
        logCommunity('useCommunityFeed.skip_duplicate_cursor', { cursor });
        return;
      }

      inFlightRef.current = true;
      if (append) {
        lastCursorRef.current = cursor;
        setLoadingMore(true);
      } else {
        lastCursorRef.current = null;
        setLoading(true);
      }
      setError(null);

      const id = ++reqId.current;
      logCommunity('useCommunityFeed.fetch', { scope, type, q, hashtag, cursor, append });

      try {
        const data = await communityService.getFeed({
          scope,
          type,
          q,
          hashtag,
          itemId,
          limit,
          cursor: cursor || undefined,
        });

        if (id !== reqId.current) return;

        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const mapped =
          type === 'reel'
            ? rawItems.map(mapContentToReel).filter(Boolean)
            : rawItems.map(mapContentToPost).filter(Boolean);

        seedRef.current?.(mapped);

        setItems((prev) => {
          if (!append) return mapped;
          // Deduplicate items on append using unique ID
          const existingIds = new Set(prev.map((it) => String(it.id || it._id)));
          const uniqueNew = mapped.filter((it) => {
            const itId = String(it.id || it._id);
            if (!itId || existingIds.has(itId)) return false;
            existingIds.add(itId);
            return true;
          });
          return [...prev, ...uniqueNew];
        });

        const newCursor = data?.nextCursor ?? null;
        const newHasMore = Boolean(data?.hasMore && newCursor);
        setNextCursor(newCursor);
        setHasMore(newHasMore);

        logCommunity('useCommunityFeed.ok', {
          count: mapped.length,
          hasMore: newHasMore,
          nextCursor: newCursor,
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
          inFlightRef.current = false;
        }
      }
    },
    [enabled, scope, type, q, hashtag, itemId, limit],
  );

  // Initial / filter reset load
  useEffect(() => {
    fetchPage({ append: false });
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage({ append: false }), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore || loading || inFlightRef.current) return;
    return fetchPage({ cursor: nextCursor, append: true });
  }, [fetchPage, hasMore, nextCursor, loadingMore, loading]);

  const patchItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((item) => (String(item.id || item._id) === String(id) ? { ...item, ...patch } : item)),
    );
  }, []);

  // Stabilize socialItems referential equality: preserve unchanged items so PostCards do not re-render
  const prevSocialItemsRef = useRef([]);
  const socialItems = useMemo(() => {
    let hasChanges = false;
    const prevItems = prevSocialItemsRef.current;

    if (prevItems.length !== items.length) {
      hasChanges = true;
    }

    const nextList = items.map((item, idx) => {
      const socialized = withSocial(item);
      const prev = prevItems[idx];
      if (
        prev &&
        String(prev.id || prev._id) === String(socialized.id || socialized._id) &&
        prev.isLiked === socialized.isLiked &&
        prev.isSaved === socialized.isSaved &&
        prev.isFollowing === socialized.isFollowing &&
        prev.author?.isFollowing === socialized.author?.isFollowing &&
        prev.likeCount === socialized.likeCount &&
        prev.commentCount === socialized.commentCount &&
        prev.likes === socialized.likes &&
        prev.comments === socialized.comments &&
        prev.isReported === socialized.isReported &&
        prev.isBlocked === socialized.isBlocked
      ) {
        return prev;
      }
      hasChanges = true;
      return socialized;
    });

    if (!hasChanges && prevItems.length === nextList.length) {
      return prevItems;
    }
    prevSocialItemsRef.current = nextList;
    return nextList;
  }, [items, withSocial]);

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

/**
 * Saved / Favourites hook with full pagination and deduplication support.
 */
export function useCommunitySaves({ type = 'all', enabled = true } = {}) {
  const { seedFromContentItems, withSocial } = useCommunitySocial();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const inFlightRef = useRef(false);
  const lastCursorRef = useRef(null);
  const reqId = useRef(0);

  const seedRef = useRef(seedFromContentItems);
  useEffect(() => {
    seedRef.current = seedFromContentItems;
  }, [seedFromContentItems]);

  const fetchSaves = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (!enabled) return;
      if (inFlightRef.current) return;
      if (append && cursor && cursor === lastCursorRef.current) return;

      inFlightRef.current = true;
      if (append) {
        lastCursorRef.current = cursor;
        setLoadingMore(true);
      } else {
        lastCursorRef.current = null;
        setLoading(true);
      }
      setError(null);

      const id = ++reqId.current;
      logCommunity('useCommunitySaves.fetch', { type, cursor, append });

      try {
        const data = await communityService.getSaves({
          type,
          limit: 20,
          cursor: cursor || undefined,
        });

        if (id !== reqId.current) return;

        const raw = extractSavesList(data);
        const mapped = raw.map(mapSaveItem).filter(Boolean);
        seedRef.current?.(mapped.map((m) => ({ ...m, isSaved: true })));

        setItems((prev) => {
          if (!append) return mapped;
          const existingIds = new Set(prev.map((it) => String(it.saveId || it.id || it._id)));
          const uniqueNew = mapped.filter((it) => {
            const itId = String(it.saveId || it.id || it._id);
            if (!itId || existingIds.has(itId)) return false;
            existingIds.add(itId);
            return true;
          });
          return [...prev, ...uniqueNew];
        });

        const newCursor = data?.nextCursor ?? null;
        const newHasMore = Boolean(data?.hasMore && newCursor);
        setNextCursor(newCursor);
        setHasMore(newHasMore);

        debugLog('[Community] useCommunitySaves.ok', {
          type,
          rawCount: raw.length,
          mappedCount: mapped.length,
          hasMore: newHasMore,
          nextCursor: newCursor,
        });
      } catch (err) {
        if (id !== reqId.current) return;
        const message = getCommunityErrorMessage(err, 'Failed to load saves');
        debugError('[Community] useCommunitySaves error', message);
        setError(message);
        if (!append) setItems([]);
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
          inFlightRef.current = false;
        }
      }
    },
    [enabled, type],
  );

  useEffect(() => {
    fetchSaves({ append: false });
  }, [fetchSaves]);

  const refresh = useCallback(() => fetchSaves({ append: false }), [fetchSaves]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore || loading || inFlightRef.current) return;
    return fetchSaves({ cursor: nextCursor, append: true });
  }, [fetchSaves, hasMore, nextCursor, loadingMore, loading]);

  const prevSocialItemsRef = useRef([]);
  const socialItems = useMemo(() => {
    let hasChanges = false;
    const prevItems = prevSocialItemsRef.current;

    if (prevItems.length !== items.length) {
      hasChanges = true;
    }

    const nextList = items.map((item, idx) => {
      const socialized = withSocial({ ...item, isSaved: true });
      const prev = prevItems[idx];
      if (
        prev &&
        String(prev.saveId || prev.id) === String(socialized.saveId || socialized.id) &&
        prev.isSaved === socialized.isSaved
      ) {
        return prev;
      }
      hasChanges = true;
      return socialized;
    });

    if (!hasChanges && prevItems.length === nextList.length) {
      return prevItems;
    }
    prevSocialItemsRef.current = nextList;
    return nextList;
  }, [items, withSocial]);

  return {
    items: socialItems,
    loading,
    loadingMore,
    error,
    hasMore,
    nextCursor,
    refresh,
    loadMore,
    setItems,
  };
}

/** Optimistic like toggle — updates local patch + global social store */
export async function toggleCommunityLike(item, patchItem, social) {
  const id = item?.id || item?._id;
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
  const id = item?.id || item?._id;
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
  const rawUserId = author?.id || author?._id || (typeof author === 'string' ? author : null);
  if (!rawUserId) return;
  const userId = String(rawUserId);
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
