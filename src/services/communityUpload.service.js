/**
 * Community fast upload — compress → presign → S3 PUT/multipart → publish → poll.
 * Per docs/FAST_UPLOAD_E2E.md (dummy UI “Fast (presign)” path).
 *
 * Flow log labels match §6:
 *   COMPRESS → POST /uploads/presign → PUT → S3 (direct) → POST /posts/publish → Poll #N
 *
 * Heavy bytes → S3 (not through gateway). In DEV, Vite `/__dev/s3-put` proxies the PUT
 * so localhost works when bucket CORS is not yet updated (set VITE_S3_DEV_PROXY=false to disable).
 *
 * Progress callbacks fire on S3 upload, not on /publish.
 */

import { communityService } from './community.service.js';
import {
  getCommunityErrorMessage,
  logCommunity,
  warnCommunity,
} from './communityApi.js';
import { debugError, debugLog } from '../utils/debugLog.js';

const DEFAULT_POLL_MS = 1500;
const DEFAULT_POLL_TIMEOUT_MS = 60000;
const MULTIPART_PARALLEL = 3;
/** Dummy-UI style: force put for small videos */
const SMALL_VIDEO_PUT_MAX_BYTES = 8 * 1024 * 1024;

const DEV_S3_PROXY_PATH = '/__dev/s3-put';

function useDevS3Proxy() {
  if (!import.meta.env.DEV) return false;
  const flag = String(import.meta.env.VITE_S3_DEV_PROXY ?? 'true').toLowerCase();
  return flag !== 'false' && flag !== '0';
}

function logUpload(step, payload) {
  // Mirror dummy-UI “Flow log” steps so upload is easy to trace in DevTools
  logCommunity(`[Upload] ${step}`, payload);
  if (payload !== undefined) {
    debugLog(`▶ ${step}`, payload);
  } else {
    debugLog(`▶ ${step}`);
  }
}

/**
 * Compress image via canvas → JPEG blob. (Step A — no server)
 * @returns {Promise<{ blob: Blob, mimeType: string, name: string, size: number, file: File }>}
 */
export async function compressImage(file, { maxEdge = 1440, quality = 0.8 } = {}) {
  logUpload('COMPRESS', {
    name: file?.name,
    type: file?.type,
    size: file?.size,
    maxEdge,
    quality,
  });

  if (!file || !file.type?.startsWith('image/')) {
    const out = {
      blob: file,
      mimeType: file?.type || 'application/octet-stream',
      name: file?.name || 'file',
      size: file?.size || 0,
      file,
    };
    logUpload('COMPRESS skip (non-image)', { size: out.size, mimeType: out.mimeType });
    return out;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image compress failed'))),
      'image/jpeg',
      quality,
    );
  });

  const baseName = (file.name || 'look').replace(/\.[^.]+$/, '') || 'look';
  const name = `${baseName}.jpg`;
  const compressedFile = new File([blob], name, { type: 'image/jpeg' });

  logUpload('COMPRESS done', {
    from: file.size,
    to: blob.size,
    width: w,
    height: h,
    name,
  });

  return {
    blob,
    mimeType: 'image/jpeg',
    name,
    size: blob.size,
    file: compressedFile,
  };
}

function s3CorsHint() {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';
  return (
    `S3 upload blocked (likely CORS). Add ${origin} to the community bucket CORS ` +
    `AllowedOrigins, allow PUT, ExposeHeaders: ETag — or keep VITE_S3_DEV_PROXY=true (default) in local DEV.`
  );
}

/** Normalize presign / sign-part payloads from various envelope shapes. */
export function normalizePresignSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s =
    raw.uploadUrl || raw.url
      ? raw
      : raw.session || raw.data || raw.result || raw;
  if (!s || typeof s !== 'object') return null;
  const uploadUrl = s.uploadUrl || s.url || s.signedUrl || null;
  return {
    ...s,
    mode: s.mode || 'put',
    key: s.key || null,
    uploadUrl,
    publicUrl: s.publicUrl || null,
    headers: s.headers && typeof s.headers === 'object' ? s.headers : {},
    uploadId: s.uploadId || null,
    partSize: s.partSize || null,
    expiresIn: s.expiresIn,
  };
}

/**
 * PUT binary to S3 with optional progress. (Step C)
 * @returns {Promise<{ etag: string | null }>}
 */
export async function putToS3(uploadUrl, body, headers = {}, { onProgress } = {}) {
  if (!uploadUrl) {
    throw new Error('Missing S3 uploadUrl from presign');
  }

  const viaProxy = useDevS3Proxy();
  const requestUrl = viaProxy ? DEV_S3_PROXY_PATH : uploadUrl;

  logUpload('PUT → S3 (direct)', {
    uploadUrl: String(uploadUrl).slice(0, 120) + '…',
    viaDevProxy: viaProxy,
    headers,
    size: body?.size ?? body?.byteLength ?? null,
    pageOrigin: typeof window !== 'undefined' ? window.location.origin : null,
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', requestUrl);
    // Never send cookies cross-origin — that breaks S3 CORS when ACAO is "*".
    xhr.withCredentials = false;
    if (viaProxy) {
      xhr.setRequestHeader('x-s3-upload-url', uploadUrl);
    }
    Object.entries(headers || {}).forEach(([k, v]) => {
      if (v != null) xhr.setRequestHeader(k, String(v));
    });
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      onProgress?.(pct, e.loaded, e.total);
      if (pct === 0 || pct === 100 || pct % 25 === 0) {
        logUpload('PUT → S3 progress', { pct, loaded: e.loaded, total: e.total });
      }
    };
    xhr.onload = () => {
      const etag = xhr.getResponseHeader('ETag');
      logUpload('PUT → S3 done', { status: xhr.status, etag, viaDevProxy: viaProxy });
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ etag });
      } else {
        const detail = (xhr.responseText || '').slice(0, 200);
        reject(
          new Error(
            `S3 upload failed (${xhr.status})${detail ? `: ${detail}` : ''}`,
          ),
        );
      }
    };
    xhr.onerror = () => {
      debugError('[Community][Upload] PUT → S3 network error', {
        pageOrigin: typeof window !== 'undefined' ? window.location.origin : null,
        viaDevProxy: viaProxy,
        uploadHost: (() => {
          try {
            return new URL(uploadUrl).host;
          } catch {
            return null;
          }
        })(),
      });
      reject(new Error(s3CorsHint()));
    };
    xhr.send(body);
  });
}

async function uploadPutSession(session, fileOrBlob, { onProgress } = {}) {
  const normalized = normalizePresignSession(session);
  if (!normalized?.uploadUrl) {
    throw new Error('Presign response missing uploadUrl');
  }
  await putToS3(normalized.uploadUrl, fileOrBlob, normalized.headers || {}, {
    onProgress,
  });
  return { key: normalized.key, mode: 'put' };
}

/**
 * Multipart upload: sign-part → PUT chunks (parallel) → complete.
 */
export async function uploadMultipartSession(session, fileOrBlob, { onProgress, signal } = {}) {
  const normalized = normalizePresignSession(session) || session;
  const { key, uploadId, partSize } = normalized;
  if (!key || !uploadId || !partSize) {
    throw new Error('Invalid multipart session');
  }

  const blob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob]);
  const totalParts = Math.ceil(blob.size / partSize) || 1;
  logUpload('MULTIPART start', { key, uploadId, partSize, totalParts, size: blob.size });

  const parts = [];
  let completedBytes = 0;

  async function uploadPart(partNumber) {
    if (signal?.aborted) throw new Error('Upload aborted');
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, blob.size);
    const chunk = blob.slice(start, end);

    const signedRaw = await communityService.signMultipartPart({
      key,
      uploadId,
      partNumber,
    });
    const signed = normalizePresignSession(signedRaw) || signedRaw;

    const { etag } = await putToS3(signed.uploadUrl, chunk, signed.headers || {}, {
      onProgress: (pct, loaded) => {
        const overall = Math.round(((completedBytes + loaded) / blob.size) * 100);
        onProgress?.(Math.min(99, overall));
      },
    });

    completedBytes += chunk.size;
    onProgress?.(Math.min(99, Math.round((completedBytes / blob.size) * 100)));

    const PartNumber = partNumber;
    const ETag = etag || signed.etag || signed.ETag;
    if (!ETag) warnCommunity('[Upload] missing ETag for part', { partNumber });
    parts.push({ PartNumber, ETag });
    logUpload('MULTIPART part done', { partNumber, ETag });
  }

  const queue = Array.from({ length: totalParts }, (_, i) => i + 1);
  const workers = Array.from({ length: Math.min(MULTIPART_PARALLEL, totalParts) }, async () => {
    while (queue.length) {
      const n = queue.shift();
      if (n == null) break;
      await uploadPart(n);
    }
  });
  await Promise.all(workers);

  parts.sort((a, b) => a.PartNumber - b.PartNumber);
  await communityService.completeMultipart({ key, uploadId, parts });
  onProgress?.(100);
  logUpload('MULTIPART complete', { key, parts: parts.length });
  return { key, mode: 'multipart' };
}

/**
 * Presign + upload one file. Returns { key, mimeType }.
 */
export async function uploadCommunityFile(file, {
  purpose = 'post',
  mode,
  onProgress,
  compress = true,
  signal,
} = {}) {
  let uploadFile = file;
  let mimeType = file?.type || 'application/octet-stream';
  let fileName = file?.name || 'file';
  let fileSize = file?.size || 0;

  if (compress && purpose !== 'reel' && mimeType.startsWith('image/')) {
    const compressed = await compressImage(file);
    uploadFile = compressed.file;
    mimeType = compressed.mimeType;
    fileName = compressed.name;
    fileSize = compressed.size;
  }

  const requestedMode =
    mode ||
    (purpose === 'reel' && fileSize > SMALL_VIDEO_PUT_MAX_BYTES ? undefined : 'put');

  const body = {
    purpose,
    mimeType,
    fileName,
    fileSize,
    ...(requestedMode ? { mode: requestedMode } : {}),
  };

  logUpload('POST /uploads/presign', body);
  const sessionRaw = await communityService.presignUpload(body);
  const session = normalizePresignSession(sessionRaw);
  const sessionMode = session?.mode || requestedMode || 'put';
  logUpload('POST /uploads/presign response', {
    mode: sessionMode,
    key: session?.key,
    hasUploadUrl: Boolean(session?.uploadUrl),
    partSize: session?.partSize,
    headerKeys: session?.headers ? Object.keys(session.headers) : [],
  });

  if (!session?.key) {
    throw new Error('Presign response missing key');
  }
  if (sessionMode !== 'multipart' && !session.uploadUrl) {
    throw new Error('Presign response missing uploadUrl');
  }

  if (sessionMode === 'multipart') {
    await uploadMultipartSession(session, uploadFile, { onProgress, signal });
  } else {
    await uploadPutSession(session, uploadFile, { onProgress });
  }

  return { key: session.key, mimeType, publicUrl: session.publicUrl };
}

/**
 * Poll GET /content/:id until published | draft | timeout. (Step E)
 */
export async function waitUntilPublished(contentId, {
  intervalMs = DEFAULT_POLL_MS,
  timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  onPoll,
} = {}) {
  const started = Date.now();
  let n = 0;
  logUpload('POLL start', { contentId, intervalMs, timeoutMs });

  while (Date.now() - started < timeoutMs) {
    n += 1;
    const data = await communityService.getContent(contentId);
    const status = data?.status;
    logUpload(`Poll #${n} status=${status || 'unknown'}`, { contentId });
    onPoll?.(data, n);
    if (status === 'published') return data;
    if (status === 'draft') {
      throw new Error('Upload incomplete — content stayed in draft');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for content to publish');
}

/**
 * Full fast create post flow — FAST_UPLOAD_E2E Steps A–E.
 * @param {{ itemId: string, caption?: string, hashtags?: string[], imageFiles: File[], onProgress?: (pct: number, phase: string) => void }} opts
 */
export async function createPostFast({
  itemId,
  caption = '',
  hashtags = [],
  imageFiles = [],
  onProgress,
} = {}) {
  logUpload('createPostFast start', {
    itemId,
    captionLen: caption?.length,
    hashtags,
    files: imageFiles?.length,
    devS3Proxy: useDevS3Proxy(),
  });

  if (!itemId) throw new Error('Pick a purchased product before posting');
  if (!imageFiles?.length) throw new Error('Add at least one image');

  const media = [];
  const total = imageFiles.length;
  for (let i = 0; i < imageFiles.length; i += 1) {
    const file = imageFiles[i];
    const { key, mimeType } = await uploadCommunityFile(file, {
      purpose: 'post',
      mode: 'put',
      compress: true,
      onProgress: (pct) => onProgress?.(Math.round(((i + pct / 100) / total) * 90), 'upload'),
    });
    media.push({ key, mimeType, kind: 'image' });
  }

  onProgress?.(92, 'publish');
  logUpload('POST /posts/publish', { itemId, mediaKeys: media.map((m) => m.key) });
  const created = await communityService.publishPost({
    itemId,
    caption,
    hashtags,
    media,
  });
  logUpload('POST /posts/publish accepted', { id: created?._id, status: created?.status });

  const id = created?._id;
  if (!id) return created;

  onProgress?.(95, 'poll');
  try {
    const published = await waitUntilPublished(id, {
      onPoll: () => onProgress?.(97, 'poll'),
    });
    onProgress?.(100, 'done');
    logUpload('createPostFast done', { id, status: published?.status });
    return published;
  } catch (err) {
    warnCommunity('[Upload] poll failed — returning processing payload', {
      id,
      message: err?.message,
    });
    return created;
  }
}

/**
 * Full fast create reel flow (FAST_UPLOAD_E2E §4).
 * @param {{ itemId: string, caption?: string, hashtags?: string[], videoFile: File, thumbnailFile?: File, onProgress?: Function }} opts
 */
export async function createReelFast({
  itemId,
  caption = '',
  hashtags = [],
  videoFile,
  thumbnailFile,
  onProgress,
} = {}) {
  logUpload('createReelFast start', {
    itemId,
    captionLen: caption?.length,
    hashtags,
    video: videoFile?.name,
    thumb: thumbnailFile?.name,
    devS3Proxy: useDevS3Proxy(),
  });

  if (!itemId) throw new Error('Pick a purchased product before posting');
  if (!videoFile) throw new Error('Add a video');

  onProgress?.(5, 'upload-video');
  const video = await uploadCommunityFile(videoFile, {
    purpose: 'reel',
    compress: false,
    onProgress: (pct) => onProgress?.(Math.round(pct * 0.7), 'upload-video'),
  });

  let thumbnail;
  if (thumbnailFile) {
    onProgress?.(75, 'upload-thumb');
    thumbnail = await uploadCommunityFile(thumbnailFile, {
      purpose: 'thumbnail',
      mode: 'put',
      compress: true,
      onProgress: (pct) => onProgress?.(70 + Math.round(pct * 0.15), 'upload-thumb'),
    });
  }

  onProgress?.(90, 'publish');
  const body = {
    itemId,
    caption,
    hashtags,
    video: { key: video.key, mimeType: video.mimeType },
    ...(thumbnail
      ? { thumbnail: { key: thumbnail.key, mimeType: thumbnail.mimeType } }
      : {}),
  };
  logUpload('POST /reels/publish', {
    itemId,
    videoKey: video.key,
    hasThumb: Boolean(thumbnail),
  });
  const created = await communityService.publishReel(body);
  logUpload('POST /reels/publish accepted', { id: created?._id, status: created?.status });

  const id = created?._id;
  if (!id) return created;

  onProgress?.(95, 'poll');
  try {
    const published = await waitUntilPublished(id);
    onProgress?.(100, 'done');
    return published;
  } catch (err) {
    warnCommunity('[Upload] reel poll failed — returning processing payload', {
      id,
      message: err?.message,
    });
    return created;
  }
}

export { getCommunityErrorMessage };
