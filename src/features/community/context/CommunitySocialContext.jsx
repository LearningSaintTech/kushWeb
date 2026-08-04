/**
 * Global community social state — follow / save / like across pages.
 * Optimistic toggles write here so Reels → Home → Search stay in sync
 * even when a feed refetch returns stale isFollowing / isSaved.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { communityService } from '../../../services/community.service.js';
import { logCommunity } from '../../../services/communityApi.js';
import { debugError, debugLog } from '../../../utils/debugLog.js';

const CommunitySocialContext = createContext(null);

function formatEngagementCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

export function CommunitySocialProvider({ children }) {
  /** userId → boolean */
  const [following, setFollowing] = useState(() => ({}));
  /** contentId → boolean */
  const [saved, setSaved] = useState(() => ({}));
  /** contentId → boolean */
  const [liked, setLiked] = useState(() => ({}));

  const seedFollowing = useCallback((userId, value) => {
    if (!userId) return;
    setFollowing((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, userId)) return prev;
      return { ...prev, [userId]: Boolean(value) };
    });
  }, []);

  const seedSaved = useCallback((contentId, value) => {
    if (!contentId) return;
    setSaved((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, contentId)) return prev;
      return { ...prev, [contentId]: Boolean(value) };
    });
  }, []);

  const seedLiked = useCallback((contentId, value) => {
    if (!contentId) return;
    setLiked((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, contentId)) return prev;
      return { ...prev, [contentId]: Boolean(value) };
    });
  }, []);

  /** Merge API flags into global maps without overwriting user toggles already set. */
  const seedFromContentItems = useCallback((items = []) => {
    if (!Array.isArray(items) || !items.length) return;
    setFollowing((prev) => {
      let next = prev;
      let changed = false;
      for (const item of items) {
        const userId = item?.author?.id || item?.authorId;
        if (!userId) continue;
        if (Object.prototype.hasOwnProperty.call(prev, userId)) continue;
        const flag =
          item?.isFollowing ??
          item?.author?.isFollowing ??
          item?.raw?.isFollowing ??
          item?.raw?.authorIsFollowing;
        if (flag === undefined) continue;
        if (!changed) {
          next = { ...prev };
          changed = true;
        }
        next[userId] = Boolean(flag);
      }
      return next;
    });
    setSaved((prev) => {
      let next = prev;
      let changed = false;
      for (const item of items) {
        const id = item?.id || item?._id;
        if (!id || item?.isSaved === undefined) continue;
        if (Object.prototype.hasOwnProperty.call(prev, id)) continue;
        if (!changed) {
          next = { ...prev };
          changed = true;
        }
        next[id] = Boolean(item.isSaved);
      }
      return next;
    });
    setLiked((prev) => {
      let next = prev;
      let changed = false;
      for (const item of items) {
        const id = item?.id || item?._id;
        if (!id || item?.isLiked === undefined) continue;
        if (Object.prototype.hasOwnProperty.call(prev, id)) continue;
        if (!changed) {
          next = { ...prev };
          changed = true;
        }
        next[id] = Boolean(item.isLiked);
      }
      return next;
    });
  }, []);

  const isFollowingUser = useCallback(
    (userId, fallback = false) => {
      if (!userId) return Boolean(fallback);
      if (Object.prototype.hasOwnProperty.call(following, userId)) {
        return Boolean(following[userId]);
      }
      return Boolean(fallback);
    },
    [following],
  );

  const isSavedContent = useCallback(
    (contentId, fallback = false) => {
      if (!contentId) return Boolean(fallback);
      if (Object.prototype.hasOwnProperty.call(saved, contentId)) {
        return Boolean(saved[contentId]);
      }
      return Boolean(fallback);
    },
    [saved],
  );

  const isLikedContent = useCallback(
    (contentId, fallback = false) => {
      if (!contentId) return Boolean(fallback);
      if (Object.prototype.hasOwnProperty.call(liked, contentId)) {
        return Boolean(liked[contentId]);
      }
      return Boolean(fallback);
    },
    [liked],
  );

  /** Apply global overrides onto a mapped feed/reel/post item. */
  const withSocial = useCallback(
    (item) => {
      if (!item) return item;
      const userId = item.author?.id;
      const id = item.id;
      const nextFollowing = isFollowingUser(userId, item.isFollowing ?? item.author?.isFollowing);
      const nextSaved = isSavedContent(id, item.isSaved);
      const nextLiked = isLikedContent(id, item.isLiked);
      if (
        nextFollowing === (item.isFollowing ?? item.author?.isFollowing) &&
        nextSaved === item.isSaved &&
        nextLiked === item.isLiked
      ) {
        return item;
      }
      return {
        ...item,
        isFollowing: nextFollowing,
        isSaved: nextSaved,
        isLiked: nextLiked,
        author: item.author
          ? { ...item.author, isFollowing: nextFollowing }
          : item.author,
      };
    },
    [isFollowingUser, isSavedContent, isLikedContent],
  );

  const toggleFollow = useCallback(async (userId, currentIsFollowing) => {
    if (!userId) return false;
    const prev = Boolean(currentIsFollowing);
    const next = !prev;
    setFollowing((s) => ({ ...s, [userId]: next }));
    logCommunity('social.toggleFollow', { userId, next });
    try {
      if (next) await communityService.follow(userId);
      else await communityService.unfollow(userId);
      return next;
    } catch (err) {
      setFollowing((s) => ({ ...s, [userId]: prev }));
      debugError('[Community] toggleFollow failed', err?.message);
      throw err;
    }
  }, []);

  const toggleSave = useCallback(async (contentId, currentIsSaved) => {
    if (!contentId) return false;
    const prev = Boolean(currentIsSaved);
    const next = !prev;
    setSaved((s) => ({ ...s, [contentId]: next }));
    logCommunity('social.toggleSave', { contentId, next });
    try {
      if (next) await communityService.save(contentId);
      else await communityService.unsave(contentId);
      debugLog('[Community] save ok', { contentId, saved: next });
      return next;
    } catch (err) {
      setSaved((s) => ({ ...s, [contentId]: prev }));
      debugError('[Community] toggleSave failed', err?.message);
      throw err;
    }
  }, []);

  const toggleLike = useCallback(async (contentId, currentIsLiked) => {
    if (!contentId) return false;
    const prev = Boolean(currentIsLiked);
    const next = !prev;
    setLiked((s) => ({ ...s, [contentId]: next }));
    logCommunity('social.toggleLike', { contentId, next });
    try {
      if (next) await communityService.like(contentId);
      else await communityService.unlike(contentId);
      return next;
    } catch (err) {
      setLiked((s) => ({ ...s, [contentId]: prev }));
      debugError('[Community] toggleLike failed', err?.message);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      following,
      saved,
      liked,
      seedFollowing,
      seedSaved,
      seedLiked,
      seedFromContentItems,
      isFollowingUser,
      isSavedContent,
      isLikedContent,
      withSocial,
      toggleFollow,
      toggleSave,
      toggleLike,
      formatEngagementCount,
    }),
    [
      following,
      saved,
      liked,
      seedFollowing,
      seedSaved,
      seedLiked,
      seedFromContentItems,
      isFollowingUser,
      isSavedContent,
      isLikedContent,
      withSocial,
      toggleFollow,
      toggleSave,
      toggleLike,
    ],
  );

  return (
    <CommunitySocialContext.Provider value={value}>
      {children}
    </CommunitySocialContext.Provider>
  );
}

export function useCommunitySocial() {
  const ctx = useContext(CommunitySocialContext);
  if (!ctx) {
    throw new Error('useCommunitySocial must be used within CommunitySocialProvider');
  }
  return ctx;
}
