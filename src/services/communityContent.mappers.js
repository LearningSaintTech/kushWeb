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
    id: item?.itemId || item?._id || item?.id || 'item',
    name: item?.name || fallbackName || 'Product',
    price: formatPrice(item) || item?.price || '',
    originalPrice:
      item?.discountedPrice != null && item?.originalPrice != null
        ? `₹${Number(item.originalPrice).toLocaleString('en-IN')}`
        : null,
    image: item?.imageUrl || item?.image || item?.thumb || '',
    color: item?.color || null,
    colorHex: item?.colorHex || null,
    size: item?.size || null,
    raw: item || null,
  };
}

function mapTaggedProducts(content) {
  // API feed returns all tagged products on `items` (itemIds[]); keep legacy fallbacks
  const sources = [
    content?.items,
    content?.taggedProducts,
    content?.taggedItems,
  ];

  for (const source of sources) {
    if (!Array.isArray(source) || !source.length) continue;
    const mapped = source.map((p) => mapItemChip(p)).filter(Boolean);
    if (mapped.length) {
      // De-dupe by itemId
      const seen = new Set();
      return mapped.filter((p) => {
        const key = String(p.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  const chip = mapItemChip(content?.item, content?.itemName);
  return chip ? [chip] : [];
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
    designedBy:
      content.designedBy ||
      content.item?.designedBy ||
      content.items?.find((i) => i?.designedBy)?.designedBy ||
      '',
    caption: content.caption || '',
    hashtags: Array.isArray(content.hashtags) ? content.hashtags : [],
    taggedProducts: mapTaggedProducts(content),
    isLiked: Boolean(content.isLiked),
    isSaved: Boolean(content.isSaved),
    isBlocked: Boolean(content.isBlocked),
    isReported: Boolean(content.isReported),
    canBlock: content.canBlock !== false && content.isOwn !== true,
    canReport: content.canReport !== false && content.isOwn !== true,
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
    ...post,
    type: 'reel',
    video,
    videoUrl: video,
    poster: post.image,
    isFollowing: Boolean(post.author?.isFollowing),
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
  const authorId =
    row.authorId ||
    author._id ||
    author.id ||
    author.userId ||
    null;
  return {
    id: row._id || row.id || `${row.createdAt}-${row.text}`,
    authorId,
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
    isBlocked: Boolean(row.isBlocked),
    isReported: Boolean(row.isReported),
    canBlock: row.canBlock !== false,
    canReport: row.canReport !== false,
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

  // Tagged tab only — do not treat post/reel content as products just because
  // they carry itemId / imageUrl (almost every community post does).
  if (typeHint === 'tagged') {
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
  if (!mapped?.id) return null;
  return {
    id: mapped.id,
    type: typeHint === 'reel' || mapped.type === 'reel' ? 'reel' : 'post',
    image: mapped.image || mapped.poster || primaryImageUrl(content) || '',
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
    isBlocked: Boolean(raw.isBlocked),
    isReported: Boolean(raw.isReported),
    canBlock: raw.canBlock !== false && !raw.isOwnProfile,
    canReport: raw.canReport !== false && !raw.isOwnProfile,
    stats: {
      posts: formatCount(counts.posts),
      followers: formatCount(counts.followers),
      following: formatCount(counts.following),
      likes: formatCount(counts.likes ?? raw.likesCount),
      views: formatCount(counts.views ?? raw.viewsCount),
    },
    statsRaw: {
      posts: Number(counts.posts) || 0,
      followers: Number(counts.followers) || 0,
      following: Number(counts.following) || 0,
      likes: Number(counts.likes ?? raw.likesCount) || 0,
      views: Number(counts.views ?? raw.viewsCount) || 0,
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

const PROJECT_FALLBACK_STYLES = [
  'bg-[linear-gradient(145deg,#a23eea_0%,#e94cc1_34%,#00c3e8_68%,#086acf_100%)]',
  'bg-[linear-gradient(155deg,#1b7cc1_0%,#2ad3d1_45%,#7356e8_100%)]',
  'bg-[linear-gradient(160deg,#0f0f10_0%,#2a2a2e_55%,#6b5cff_100%)]',
  'bg-[linear-gradient(135deg,#f4d4b8_0%,#e8a87c_50%,#c38d9e_100%)]',
  'bg-[linear-gradient(145deg,#e8f5e9_0%,#81c784_45%,#2e7d32_100%)]',
  'bg-[linear-gradient(145deg,#fff3e0_0%,#ffb74d_50%,#ef6c00_100%)]',
];

function formatProjectViews(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(num));
}

/** API project → DesignerProjects card shape */
export function mapProject(raw) {
  if (!raw) return null;
  const id = raw._id || raw.id || raw.projectId;
  if (!id) return null;
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter(Boolean)
    : raw.category
      ? [raw.category]
      : [];
  const cover = raw.cover || raw.hero || null;
  const image =
    cover?.url ||
    cover?.publicUrl ||
    raw.heroImageUrl ||
    raw.imageUrl ||
    raw.publicUrl ||
    raw.heroImage ||
    raw.image ||
    raw.media?.url ||
    '';
  const styleIndex = String(id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    id: String(id),
    title: raw.title || raw.name || 'Untitled Project',
    category: categories[0] || raw.category || 'Fashion',
    categories,
    description: raw.description || '',
    tools: Array.isArray(raw.tools) ? raw.tools : [],
    status: raw.status || 'pending',
    image,
    heroImageKey: cover?.key || raw.heroImageKey || raw.imageKey || raw.key || null,
    existingCover: cover?.key
      ? { key: cover.key, mimeType: cover.mimeType || 'image/jpeg' }
      : null,
    views: formatProjectViews(raw.viewCount ?? raw.views ?? 0),
    viewCount: Number(raw.viewCount ?? raw.views) || 0,
    style: PROJECT_FALLBACK_STYLES[styleIndex % PROJECT_FALLBACK_STYLES.length],
    raw,
  };
}

/** Normalize GET /projects/categories list → string names */
export function extractProjectCategoryNames(payload) {
  if (!payload) return [];
  const list = Array.isArray(payload)
    ? payload
    : payload.items ||
      payload.categories ||
      payload.results ||
      payload.data?.items ||
      payload.data?.categories ||
      [];
  return (Array.isArray(list) ? list : [])
    .map((item) => (typeof item === 'string' ? item : item?.name || item?.title || ''))
    .map((name) => String(name).trim())
    .filter(Boolean);
}

export function extractProjectsList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.map(mapProject).filter(Boolean);
  const list =
    payload.items ||
    payload.projects ||
    payload.results ||
    payload.data?.items ||
    payload.data?.projects ||
    [];
  return (Array.isArray(list) ? list : []).map(mapProject).filter(Boolean);
}

export function unwrapProject(payload) {
  if (!payload) return null;
  const raw =
    payload.project ||
    payload.item ||
    payload.data?.project ||
    payload.data ||
    payload;
  return mapProject(raw);
}

