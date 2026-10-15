// Mock of the TikTok endpoints we use, enforcing the media-transfer-guide rules.
import http from 'node:http';
const uploads = new Map(); // publish_id -> { size, chunkSize, total, received, status }
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const auth = req.headers.authorization || '';
  if (u.pathname === '/v2/oauth/token/') {
    const p = new URLSearchParams((await body(req)).toString());
    if (p.get('grant_type') === 'authorization_code' && p.get('code') !== 'GOODCODE') return json(res, 400, { error: 'invalid_grant', error_description: 'bad code', log_id: 'L1' });
    return json(res, 200, { open_id: 'open-123', scope: 'user.info.basic,video.upload,video.publish', access_token: 'AT-' + Date.now(), expires_in: 86400, refresh_token: 'RT-1', refresh_expires_in: 31536000, token_type: 'Bearer' });
  }
  if (!auth.startsWith('Bearer AT-')) return json(res, 401, { error: { code: 'access_token_invalid', message: 'bad token', log_id: 'L2' } });
  if (u.pathname === '/v2/user/info/') return json(res, 200, { data: { user: { open_id: 'open-123', display_name: 'Willson', username: 'willsonrai', avatar_url: 'https://example.invalid/a.png' } }, error: { code: 'ok' } });
  if (u.pathname === '/v2/post/publish/creator_info/query/') return json(res, 200, { data: { creator_avatar_url: 'https://example.invalid/a.png', creator_username: 'willsonrai', creator_nickname: 'Willson', privacy_level_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'], comment_disabled: false, duet_disabled: true, stitch_disabled: false, max_video_post_duration_sec: 180 }, error: { code: 'ok' } });
  if (u.pathname === '/v2/post/publish/video/init/' || u.pathname === '/v2/post/publish/inbox/video/init/') {
    const b = JSON.parse((await body(req)).toString());
    const si = b.source_info; const direct = u.pathname.includes('/video/init/') && !u.pathname.includes('inbox');
    if (direct && !b.post_info?.privacy_level) return json(res, 400, { error: { code: 'invalid_param', message: 'privacy_level required' } });
    if (direct && b.post_info.privacy_level !== 'SELF_ONLY') return json(res, 403, { error: { code: 'unaudited_client_can_only_post_to_private_accounts', message: 'private only' } });
    // chunk rules
    const minChunk = 5 * 1024 * 1024, maxChunk = 64 * 1024 * 1024;
    if (si.total_chunk_count !== Math.floor(si.video_size / si.chunk_size)) return json(res, 400, { error: { code: 'invalid_param', message: 'total_chunk_count must be floor(size/chunk)' } });
    if (si.video_size < minChunk && si.chunk_size !== si.video_size) return json(res, 400, { error: { code: 'invalid_param', message: '<5MB must be whole' } });
    if (si.video_size >= minChunk && (si.chunk_size < minChunk || si.chunk_size > maxChunk)) return json(res, 400, { error: { code: 'invalid_param', message: 'chunk size out of range' } });
    if (si.video_size > maxChunk && si.total_chunk_count < 2) return json(res, 400, { error: { code: 'invalid_param', message: '>64MB must be chunked' } });
    const id = 'pub-' + Math.random().toString(16).slice(2);
    uploads.set(id, { size: si.video_size, chunkSize: si.chunk_size, total: si.total_chunk_count, received: 0, chunks: 0, status: 'PROCESSING_UPLOAD', polls: 0, mode: direct ? 'direct' : 'inbox', postInfo: b.post_info || null });
    return json(res, 200, { data: { publish_id: id, upload_url: `http://127.0.0.1:4555/upload/?upload_id=${id}&upload_token=tok` }, error: { code: 'ok' } });
  }
  if (u.pathname === '/v2/post/publish/status/fetch/') {
    const { publish_id } = JSON.parse((await body(req)).toString());
    const up = uploads.get(publish_id); if (!up) return json(res, 400, { error: { code: 'invalid_publish_id', message: 'nope' } });
    up.polls++;
    if (up.received === up.size && up.polls >= 2) up.status = up.mode === 'direct' ? 'PUBLISH_COMPLETE' : 'SEND_TO_USER_INBOX';
    return json(res, 200, { data: { status: up.status, fail_reason: '', publicaly_available_post_id: up.status === 'PUBLISH_COMPLETE' ? [7123456789] : [], uploaded_bytes: up.received }, error: { code: 'ok' } });
  }
  json(res, 404, { error: { code: 'not_found', message: req.url } });
}).listen(4556, '127.0.0.1');

// upload host (open-upload.tiktokapis.com stand-in) — validates headers like TikTok does
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const up = uploads.get(u.searchParams.get('upload_id'));
  if (!up || req.method !== 'PUT') { res.writeHead(404); return res.end('no upload task'); }
  const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(req.headers['content-range'] || '');
  const data = await body(req);
  if (!m || req.headers['content-type'] !== 'video/mp4' || Number(req.headers['content-length']) !== data.length) { res.writeHead(400); return res.end('bad headers'); }
  const [, s, e, t] = m.map(Number);
  if (t !== up.size || s !== up.received || e - s + 1 !== data.length) { res.writeHead(416, { 'content-range': `bytes 0-${up.received}/${up.size}` }); return res.end('range mismatch'); }
  const isLast = up.chunks === up.total - 1;
  const expectLen = isLast ? up.size - s : up.chunkSize;
  if (data.length !== expectLen) { res.writeHead(400); return res.end(`chunk ${up.chunks} length ${data.length} != ${expectLen}`); }
  up.received = e + 1; up.chunks++;
  console.log(`[mock-upload] chunk ${up.chunks}/${up.total} bytes ${s}-${e} ok`);
  res.writeHead(up.received === up.size ? 201 : 206); res.end();
}).listen(4555, '127.0.0.1', () => console.log('mock tiktok up on 4556 (api) / 4555 (upload)'));
