/**
 * Map Community API content / profile payloads → UI card shapes.
 * Keeps screens free of raw API field names.
 */

import { logCommunity } from '../../../services/communityApi.js';

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
  return any?.url || list[0]?.url || '';
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
    id: content._id,
    author: {
      id: content.authorId,
      name: content.authorName || 'Member',
      handle: content.authorUsername || '',
      role: (content.authorRole || 'creator').toUpperCase(),
      avatar: content.authorAvatar || content.authorProfileImage || image,
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
  const content = row?.content ?? row;
  const mapped = mapContentToPost(content);
  if (!mapped) return null;
  return {
    ...mapped,
    saveId: row?.saveId,
    savedAt: row?.savedAt,
    isSaved: true,
  };
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
