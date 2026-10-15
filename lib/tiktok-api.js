/**
 * TikTok Login Kit + Content Posting API client (Node 20+, no dependencies).
 *
 * Docs (developers.tiktok.com):
 *   Login Kit (web)        /doc/login-kit-web
 *   Manage user tokens     /doc/oauth-user-access-token-management
 *   Direct Post            /doc/content-posting-api-reference-direct-post
 *   Upload (inbox/draft)   /doc/content-posting-api-reference-upload-video
 *   Media transfer guide   /docs/en/content-posting-api-media-transfer-guide
 *   Query creator info     /doc/content-posting-api-reference-query-creator-info
 *   Get post status        /doc/content-posting-api-reference-get-video-status
 *
 * Nothing in here touches Express or the job store; tiktok-routes.js wires it up.
 */
import { open } from 'node:fs/promises';

// Overridable so the whole flow can be exercised against a local mock (see TIKTOK-UPLOAD-GUIDE.md).
const OPEN_API_BASE = (process.env.TIKTOK_OPEN_API_BASE || 'https://open.tiktokapis.com').replace(/\/$/, '');
export const TIKTOK_AUTHORIZE_URL = process.env.TIKTOK_AUTHORIZE_URL || 'https://www.tiktok.com/v2/auth/authorize/';
export const TIKTOK_TOKEN_URL = `${OPEN_API_BASE}/v2/oauth/token/`;
export const TIKTOK_REVOKE_URL = `${OPEN_API_BASE}/v2/oauth/revoke/`;
export const TIKTOK_API = `${OPEN_API_BASE}/v2`;

// Media transfer guide limits. TikTok says "5 MB" / "64 MB" without defining MB, so we use the
// stricter reading for every bound: >= 5 MiB per chunk, <= 64,000,000 bytes per chunk.
const CHUNK_MIN = 5 * 1024 * 1024;        // 5,242,880
const WHOLE_MAX = 64_000_000;             // above this the file MUST be chunked
const CHUNK_SIZE = 10_000_000;            // same value TikTok uses in its own example
const CHUNK_MAX_COUNT = 1000;

export class TikTokApiError extends Error {
  constructor(message, { code = 'unknown', httpStatus = 0, logId = null, retryable = false } = {}) {
    super(message);
    this.name = 'TikTokApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.logId = logId;
    this.retryable = retryable;
  }
}

// ---------------------------------------------------------------------------
// OAuth (Login Kit)
// ---------------------------------------------------------------------------

/** Authorization URL the browser is sent to. `scopes` is an array, e.g. ['user.info.basic','video.publish']. */
export function buildAuthorizeUrl({ clientKey, redirectUri, scopes, state }) {
  const u = new URL(TIKTOK_AUTHORIZE_URL);
  u.searchParams.set('client_key', clientKey);
  u.searchParams.set('scope', scopes.join(','));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

async function tokenRequest(params) {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  // The token endpoint uses a flat error shape: { error, error_description, log_id }
  if (!res.ok || json.error) {
    throw new TikTokApiError(json.error_description || json.error || `token endpoint HTTP ${res.status}`, {
      code: json.error || 'token_error', httpStatus: res.status, logId: json.log_id || null,
    });
  }
  return json; // { open_id, scope, access_token, expires_in, refresh_token, refresh_expires_in, token_type }
}

/** Exchange the authorization code (valid 5 min, single use). */
export function exchangeCode({ clientKey, clientSecret, code, redirectUri }) {
  return tokenRequest({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri });
}

/** Access tokens last 24 h; refresh tokens 365 d and MAY rotate — always persist the returned refresh_token. */
export function refreshAccessToken({ clientKey, clientSecret, refreshToken }) {
  return tokenRequest({ client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken });
}

export async function revokeToken({ clientKey, clientSecret, token }) {
  const res = await fetch(TIKTOK_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token }),
    signal: AbortSignal.timeout(15000),
  });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Open API helpers
// ---------------------------------------------------------------------------

async function apiPost(accessToken, path, body) {
  const res = await fetch(TIKTOK_API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  const err = json.error || {};
  // Open API envelope: { data: {...}, error: { code: 'ok' | '...', message, log_id } }
  if (!res.ok || (err.code && err.code !== 'ok')) {
    throw new TikTokApiError(err.message || `TikTok API HTTP ${res.status}`, {
      code: err.code || `http_${res.status}`,
      httpStatus: res.status,
      logId: err.log_id || null,
      retryable: res.status >= 500 || err.code === 'internal_error' || err.code === 'rate_limit_exceeded',
    });
  }
  return json.data ?? {};
}

/** Basic profile (scope user.info.basic). */
export async function getUserInfo(accessToken) {
  const fields = 'open_id,union_id,avatar_url,display_name,username';
  const res = await fetch(`${TIKTOK_API}/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
    throw new TikTokApiError(json.error?.message || `user/info HTTP ${res.status}`, { code: json.error?.code || `http_${res.status}`, httpStatus: res.status, logId: json.error?.log_id });
  }
  return json.data?.user ?? {};
}

/**
 * MUST be called when rendering the post UI (TikTok UX requirement) — returns
 * { creator_avatar_url, creator_username, creator_nickname, privacy_level_options[],
 *   comment_disabled, duet_disabled, stitch_disabled, max_video_post_duration_sec }
 * Rate limit: 20 req/min per user token.
 */
export function queryCreatorInfo(accessToken) {
  return apiPost(accessToken, '/post/publish/creator_info/query/', {});
}

/**
 * Chunk plan per the media transfer guide:
 *  - < 5 MB: whole file in one chunk (chunk_size == video_size)
 *  - <= 64 MB: may be sent whole, which we do (one chunk)
 *  - > 64 MB: 10,000,000-byte chunks; total_chunk_count = floor(size / chunk); the trailing
 *    remainder is merged into the LAST chunk (allowed up to 128 MB).
 */
export function chunkPlan(videoSize) {
  if (!Number.isInteger(videoSize) || videoSize <= 0) throw new Error('chunkPlan: bad video size');
  if (videoSize <= WHOLE_MAX) return { chunkSize: videoSize, totalChunkCount: 1 };
  const totalChunkCount = Math.floor(videoSize / CHUNK_SIZE);
  if (totalChunkCount > CHUNK_MAX_COUNT) throw new Error('chunkPlan: file too large for 1000 chunks');
  return { chunkSize: CHUNK_SIZE, totalChunkCount };
}

/** Byte ranges for chunk i (0-based) of a plan — exported so it can be unit-tested. */
export function chunkRange(i, videoSize, { chunkSize, totalChunkCount }) {
  const start = i * chunkSize;
  const end = i === totalChunkCount - 1 ? videoSize - 1 : start + chunkSize - 1;
  return { start, end, length: end - start + 1 };
}

/**
 * Direct Post (scope video.publish). Publishes straight to the creator's profile.
 * Unaudited apps: privacy_level must be SELF_ONLY and max 5 distinct users / 24 h.
 * Rate limit: 6 init requests / min per user token.
 */
export function initDirectPost(accessToken, { postInfo, videoSize, plan }) {
  return apiPost(accessToken, '/post/publish/video/init/', {
    post_info: postInfo,
    source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: plan.chunkSize, total_chunk_count: plan.totalChunkCount },
  }); // -> { publish_id, upload_url }
}

/**
 * Upload to inbox / draft (scope video.upload). The creator gets a TikTok notification,
 * opens the video in the TikTok editor and publishes it themselves. No post_info here.
 */
export function initInboxUpload(accessToken, { videoSize, plan }) {
  return apiPost(accessToken, '/post/publish/inbox/video/init/', {
    source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: plan.chunkSize, total_chunk_count: plan.totalChunkCount },
  }); // -> { publish_id, upload_url }
}

/**
 * PUT the file to upload_url chunk by chunk (sequentially — required by TikTok).
 * Memory: one chunk buffer at a time (<= ~20 MB). upload_url expires after 1 hour.
 * Responses: 206 = chunk accepted, 201 = all parts received, 416 = our Content-Range is out
 * of sync (header Content-Range: bytes 0-{uploaded}/{total} tells us where TikTok is).
 */
export async function uploadFileChunked({ uploadUrl, filePath, videoSize, plan, mime = 'video/mp4', onProgress, signal }) {
  const fh = await open(filePath, 'r');
  try {
    for (let i = 0; i < plan.totalChunkCount; i++) {
      const { start, end, length } = chunkRange(i, videoSize, plan);
      const buf = Buffer.allocUnsafe(length);
      const { bytesRead } = await fh.read(buf, 0, length, start);
      if (bytesRead !== length) throw new TikTokApiError(`short read at chunk ${i} (${bytesRead}/${length})`, { code: 'local_read_error' });

      let attempt = 0;
      for (;;) {
        attempt++;
        let res;
        try {
          res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': mime,
              'Content-Length': String(length),
              'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            },
            body: buf,
            signal: signal ?? AbortSignal.timeout(10 * 60 * 1000),
          });
        } catch (e) {
          if (attempt < 4 && !signal?.aborted) { await sleep(1500 * attempt); continue; }
          throw new TikTokApiError(`network error uploading chunk ${i + 1}/${plan.totalChunkCount}: ${e.message}`, { code: 'upload_network_error', retryable: true });
        }
        if (res.status === 201 || res.status === 206 || res.status === 200) break;
        const text = await res.text().catch(() => '');
        if (res.status >= 500 && attempt < 4) { await sleep(1500 * attempt); continue; }
        const code = res.status === 403 ? 'upload_url_expired'
          : res.status === 416 ? 'upload_range_mismatch'
          : res.status === 404 ? 'upload_task_not_found'
          : `upload_http_${res.status}`;
        throw new TikTokApiError(`chunk ${i + 1}/${plan.totalChunkCount} rejected (HTTP ${res.status}) ${text.slice(0, 200)}`, { code, httpStatus: res.status });
      }
      onProgress?.({ uploaded: end + 1, total: videoSize, chunk: i + 1, chunks: plan.totalChunkCount });
    }
  } finally {
    await fh.close().catch(() => {});
  }
}

/**
 * Poll after upload. Rate limit: 30 req/min per user token — poll every >= 3 s.
 * data: { status: PROCESSING_UPLOAD | PROCESSING_DOWNLOAD | SEND_TO_USER_INBOX | PUBLISH_COMPLETE | FAILED,
 *         fail_reason, publicaly_available_post_id: [], uploaded_bytes }
 */
export function fetchPublishStatus(accessToken, publishId) {
  return apiPost(accessToken, '/post/publish/status/fetch/', { publish_id: publishId });
}

export const PRIVACY_LEVELS = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'];

/** Human-readable messages for the error codes the UI is most likely to hit. */
export function describeError(err) {
  const code = err?.code || '';
  const map = {
    unaudited_client_can_only_post_to_private_accounts: 'This app is not audited by TikTok yet — only "Only me" (private) posts are allowed for now.',
    reached_active_user_cap: 'This app is still unaudited: TikTok allows only 5 different creators per 24 hours. Try again tomorrow.',
    spam_risk_too_many_posts: 'TikTok says this account has hit its daily posting limit via apps. Try again later.',
    spam_risk_user_banned_from_posting: 'TikTok has restricted posting for this account.',
    privacy_level_option_mismatch: 'That privacy option is not available for this account — pick another one.',
    access_token_invalid: 'TikTok connection expired. Reconnect your TikTok account.',
    scope_not_authorized: 'Your TikTok connection is missing a permission. Disconnect and connect again.',
    rate_limit_exceeded: 'Too many requests to TikTok — wait a minute and try again.',
    upload_url_expired: 'The TikTok upload window (1 hour) expired. Start the post again.',
    duration_check_failed: 'The video is longer than TikTok allows for this account.',
    frame_rate_check_failed: 'TikTok only accepts 23–60 fps videos.',
    picture_size_check_failed: 'TikTok only accepts videos between 360 px and 4096 px per side.',
    file_format_check_failed: 'TikTok rejected the file format (needs MP4/MOV/WebM, H.264/H.265).',
    video_pull_failed: 'TikTok could not fetch the video.',
    internal: 'TikTok had an internal error while processing. Try again.',
  };
  return map[code] || err?.message || 'TikTok request failed.';
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
