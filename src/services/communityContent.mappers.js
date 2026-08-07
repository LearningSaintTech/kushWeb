/**
 * Map Community API content / profile payloads → UI card shapes.
 * Keeps screens free of raw API field names.
 */

import { logCommunity } from './communityApi.js';

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso)
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      .toUpperCase();
  } catch {
    return '';
  }
}

function formatPrice(item) {
  if (!item) return '';
  const price = item.price ?? item.discountedPrice;
  if (price == null) return '';
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

function mediaList(content) {
  const list = Array.isArray(content?.media) ? content.media : [];
  return list;
}

function primaryImageUrl(content) {
  const list = mediaList(content);
  const thumb = list.find((m) => m.kind === 'thumbnail' && m.url);
  if (thumb?.url) return thumb.url;
  const image = list.find((m) => m.kind === 'image' && m.url);
  if (image?.url) return image.url;
  const any = list.find((m) => m.url && !String(m.mimeType || '').startsWith('video/'));
  if (any?.url) return any.url;
  // Reel / video-only: prefer first url (often used as poster) or product image
  if (content?.item?.imageUrl) return content.item.imageUrl;
  return list[0]?.url || '';
}

function videoUrl(content) {
  const list = mediaList(content);
  const video = list.find((m) => m.kind === 'video' && m.url);
  if (video?.url) return video.url;
  return list.find((m) => String(m.mimeType || '').startsWith('video/'))?.url || '';
}

function mapItemChip(item, fallbackName) {
  if (!item && !fallbackName) return null;
  return {
    id: item?.itemId || item?._id || 'item',
    name: item?.name || fallbackName || 'Product',
    price: formatPrice(item) || '',
    originalPrice:
      item?.discountedPrice != null && item?.originalPrice != null
        ? `₹${Number(item.originalPrice).toLocaleString('en-IN')}`
        : null,
    image: item?.imageUrl || '',
    color: item?.color || null,
    colorHex: item?.colorHex || null,
    size: item?.size || null,
    raw: item || null,
  };
}

/**
 * API content → PostCard / detail shape used across community feed UI.
 */
export function mapContentToPost(content) {
  if (!content) return null;
  const images = mediaList(content)
    .filter((m) => m.kind === 'image' || (m.url && !String(m.mimeType || '').startsWith('video/')))
    .map((m) => m.url)
    .filter(Boolean);
  const image = primaryImageUrl(content) || images[0] || '';
  const chip = mapItemChip(content.item, content.itemName);

  const post = {
    id: content._id || content.id,
    author: {
      id: content.authorId || content.author?._id || content.author?.id,
      name: content.authorName || content.author?.name || 'Member',
      handle: content.authorUsername || content.author?.username || '',
      role: (content.authorRole || content.author?.role || 'creator').toUpperCase(),
      avatar:
        content.authorAvatar ||
        content.authorProfileImage ||
        content.author?.profileImage ||
        content.author?.avatar ||
        image,
      isFollowing: Boolean(content.isFollowing ?? content.authorIsFollowing),
    },
    image,
    images: images.length ? images : image ? [image] : [],
    videoUrl: videoUrl(content) || null,
    likes: formatCount(content.likeCount),
    likeCount: Number(content.likeCount) || 0,
    comments: formatCount(content.commentCount),
    commentCount: Number(content.commentCount) || 0,
    viewCount: Number(content.viewCount) || 0,
    date: formatDate(content.createdAt),
    designedBy: content.designedBy || content.item?.designedBy || '',
    caption: content.caption || '',
    hashtags: Array.isArray(content.hashtags) ? content.hashtags : [],
    taggedProducts: chip ? [chip] : [],
    isLiked: Boolean(content.isLiked),
    isSaved: Boolean(content.isSaved),
    status: content.status,
    type: content.type || 'post',
    itemId: content.itemId,
    commentList: [],
    raw: content,
  };

  logCommunity('mapContentToPost', { id: post.id, type: post.type, status: post.status });
  return post;
}

/**
 * API content → ReelCard shape.
 */
export function mapContentToReel(content) {
  const post = mapContentToPost(content);
  if (!post) return null;
  const video = post.videoUrl || post.image;
  return {
    id: post.id,
    video,
    videoUrl: video,
    poster: post.image,
    author: post.author,
    caption: post.caption,
    likes: post.likes,
    likeCount: post.likeCount,
    comments: post.comments,
    commentCount: post.commentCount,
    isLiked: post.isLiked,
    isSaved: post.isSaved,
    isFollowing: Boolean(post.author?.isFollowing),
    designedBy: post.designedBy,
    taggedProducts: post.taggedProducts,
    raw: content,
  };
}

/** purchased-items row → composer product chip */
export function mapPurchasedItem(item) {
  if (!item) return null;
  return {
    id: item.itemId || item._id,
    itemId: item.itemId || item._id,
    name: item.name || 'Product',
    thumb: item.imageUrl || '',
    price: formatPrice(item),
    originalPrice: item.originalPrice,
    discountedPrice: item.discountedPrice,
    color: item.color,
    size: item.size,
    deliveryStatus: item.deliveryStatus,
    raw: item,
  };
}

/** saves list item → post card */
export function mapSaveItem(row) {
  if (!row) return null;

  // Common shapes: { saveId, savedAt, content } | content itself | { contentId, content }
  const content =
    row.content ??
    row.post ??
    row.reel ??
    (row._id || row.id || row.media ? row : null);

  if (!content) {
    logCommunity('mapSaveItem skip — no content', { keys: Object.keys(row) });
    return null;
  }

  // Normalize id fields before mapping
  const normalized = {
    ...content,
    _id: content._id || content.id || row.contentId || row.content_id,
    isSaved: true,
  };

  const mapped = mapContentToPost(normalized);
  if (!mapped) return null;

  // Reels often lack image thumbs — use poster/thumbnail, then item image
  let image = mapped.image;
  if (!image) {
    const list = mediaList(normalized);
    image =
      list.find((m) => m.kind === 'thumbnail')?.url ||
      list.find((m) => m.kind === 'image')?.url ||
      normalized.item?.imageUrl ||
      mapped.videoUrl ||
      '';
  }

  return {
    ...mapped,
    id: mapped.id || normalized._id,
    image,
    poster: image,
    saveId: row.saveId || row._id || row.id,
    savedAt: row.savedAt || row.createdAt,
    isSaved: true,
    type: mapped.type || content.type || 'post',
  };
}

/** Normalize GET /saves payload → array of save rows */
export function extractSavesList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.saves)) return data.saves;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export function extractHashtagsFromCaption(caption = '') {
  const tags = [];
  const re = /#([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(caption))) {
    const t = m[1].toLowerCase();
    if (!tags.includes(t)) tags.push(t);
  }
  return tags;
}

function formatCommentTime(iso) {
  if (!iso) return '';
  try {
    const then = new Date(iso).getTime();
    const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/** API comment row → CommentRow UI shape */
export function mapComment(row) {
  if (!row) return null;
  const author = row.author || {};
  return {
    id: row._id || row.id || `${row.createdAt}-${row.text}`,
    name:
      row.authorName ||
      author.name ||
      author.fullName ||
      author.username ||
      'Member',
    avatar:
      row.authorAvatar ||
      row.authorProfileImage ||
      author.profileImage ||
      author.avatar ||
      '',
    text: row.text || row.body || row.comment || '',
    time: formatCommentTime(row.createdAt || row.updatedAt),
    raw: row,
  };
}

/** Normalize GET comments payload → array */
export function extractCommentsList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.comments)) return data.comments;
  if (Array.isArray(data.results)) return data.results;
  return [];
}


/** Grid tile for profile Posts / Reels / Tagged tabs */
function toGridItem(content, typeHint) {
  if (!content) return null;
  if (typeHint === 'tagged' || content.itemId || content.imageUrl) {
    const id = content.itemId || content._id || content.id;
    const image =
      content.imageUrl ||
      content.item?.imageUrl ||
      primaryImageUrl(content) ||
      '';
    return {
      id: id || `tagged-${image}`,
      type: 'tagged',
      image,
      name: content.itemName || content.name || content.item?.name || 'Product',
      post: null,
    };
  }
  const mapped =
    typeHint === 'reel' || content.type === 'reel'
      ? mapContentToReel(content)
      : mapContentToPost(content);
  if (!mapped) return null;
  return {
    id: mapped.id,
    type: mapped.type === 'reel' ? 'reel' : 'post',
    image: mapped.image || mapped.poster || '',
    post: mapped,
  };
}

/**
 * GET /community/profile/me | /profile/:userId → UI profile shape.
 * Covers name, bio, counts (posts/followers/following), posts, reels, tagged.
 */
export function mapSocialProfile(raw) {
  if (!raw) return null;

  const counts = raw.counts || {};
  const posts = Array.isArray(raw.posts) ? raw.posts : [];
  const reels = Array.isArray(raw.reels) ? raw.reels : [];
  const tagged = Array.isArray(raw.taggedProducts) ? raw.taggedProducts : [];

  const postsGrid = posts.map((c) => toGridItem(c, 'post')).filter(Boolean);
  const reelsGrid = reels.map((c) => toGridItem(c, 'reel')).filter(Boolean);
  const taggedGrid = tagged.map((c) => toGridItem(c, 'tagged')).filter(Boolean);

  const profile = {
    id: raw.userId || raw._id || raw.id,
    name: raw.fullName || raw.name || 'Member',
    handle: String(raw.username || '')
      .replace(/^@/, '')
      .trim(),
    bio: raw.shortBio || raw.bio || '',
    avatar: raw.profileImage || '',
    isCreator: Boolean(raw.isCreator),
    isDesigner: Boolean(raw.isDesigner),
    designerVerificationStatus: raw.designerVerificationStatus || null,
    isFollowing: Boolean(raw.isFollowing),
    isOwnProfile: Boolean(raw.isOwnProfile),
    stats: {
      posts: formatCount(counts.posts),
      followers: formatCount(counts.followers),
      following: formatCount(counts.following),
    },
    statsRaw: {
      posts: Number(counts.posts) || 0,
      followers: Number(counts.followers) || 0,
      following: Number(counts.following) || 0,
    },
    posts: posts.map(mapContentToPost).filter(Boolean),
    reels: reels.map(mapContentToReel).filter(Boolean),
    taggedProducts: tagged,
    mediaByTab: {
      Posts: postsGrid,
      Reels: reelsGrid,
      Tagged: taggedGrid,
    },
    postsNextCursor: raw.postsNextCursor ?? null,
    postsHasMore: Boolean(raw.postsHasMore),
    reelsNextCursor: raw.reelsNextCursor ?? null,
    reelsHasMore: Boolean(raw.reelsHasMore),
    raw,
  };

  logCommunity('mapSocialProfile', {
    id: profile.id,
    stats: profile.statsRaw,
    posts: postsGrid.length,
    reels: reelsGrid.length,
    tagged: taggedGrid.length,
  });

  return profile;
}

