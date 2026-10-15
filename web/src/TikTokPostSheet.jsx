import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * "Post to TikTok" sheet. Implements TikTok's Content Sharing Guidelines UX, which the
 * Content Posting API audit checks for:
 *   - creator nickname/avatar from creator_info is shown ("Posting as …")
 *   - privacy selector built ONLY from privacy_level_options, with NO default selected
 *   - Allow comments / Duet / Stitch toggles OFF by default, disabled when the account disables them
 *   - commercial content disclosure OFF by default; when on, "Your brand" / "Branded content"
 *   - consent text + link to Music Usage Confirmation (and Branded Content Policy when applicable)
 *   - explicit "Post" click; progress shown; completion message says it may take minutes to appear
 *
 * Props: open, onClose, jobId, apiKey, fileName
 */
const PRIVACY_LABEL = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends (followers you follow back)',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me (private)',
};

export default function TikTokPostSheet({ open, onClose, jobId, apiKey, fileName }) {
  const headers = useCallback(() => ({ 'content-type': 'application/json', ...(apiKey ? { 'x-access-token': apiKey } : {}) }), [apiKey]);
  const [me, setMe] = useState(null);           // /api/tiktok/me payload
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState('direct');   // direct | inbox
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState('');   // '' = nothing selected (required by TikTok)
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [post, setPost] = useState(null);       // { state, uploaded, total, status, error, postIds }
  const pollRef = useRef(null);
  const popupRef = useRef(null);

  const loadMe = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/tiktok/me', { headers: headers() });
      const j = await r.json();
      setMe(j);
      if (j.connected && j.modes) setMode(j.modes.direct ? 'direct' : 'inbox');
    } catch { setErr('Could not reach the server.'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { if (open) { setPost(null); setConsent(false); setPrivacy(''); loadMe(); } }, [open, loadMe]);

  // The OAuth popup page posts {type:'obito-tiktok', ok} back to us and closes itself.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'obito-tiktok') return;
      if (e.data.ok) loadMe(); else setErr(e.data.reason || 'TikTok sign-in was cancelled.');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [loadMe]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const connect = async () => {
    setErr('');
    // Phones/tablets: TikTok's authorize page misbehaves inside a script-opened Safari tab (endless spinner),
    // so use a full-page redirect there; the Optimizer restores the job and reopens this sheet on return.
    // Desktop: open the popup synchronously inside the click so browsers don't block it.
    const touchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 1;
    popupRef.current = touchDevice ? null : window.open('about:blank', 'obito-tiktok-auth', 'popup=yes,width=520,height=720');
    try {
      const r = await fetch('/api/tiktok/connect', { headers: headers() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not start TikTok sign-in.');
      try { localStorage.setItem('obito.tiktokReturnJob', JSON.stringify({ jobId, fileName, at: Date.now() })); } catch { /* ignore */ }
      if (popupRef.current && !popupRef.current.closed) popupRef.current.location = j.url;
      else window.location.href = j.url; // popup blocked -> full redirect; Optimizer restores the job on return
    } catch (e) {
      popupRef.current?.close();
      setErr(e.message);
    }
  };

  const disconnect = async () => {
    await fetch('/api/tiktok/disconnect', { method: 'POST', headers: headers() }).catch(() => {});
    loadMe();
  };

  const startPoll = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}/tiktok`, { headers: headers() });
        const j = await r.json();
        setPost(j);
        if (j.state === 'complete' || j.state === 'failed') clearInterval(pollRef.current);
      } catch { /* keep polling */ }
    }, 3000);
  };

  const submit = async () => {
    setErr('');
    const body = {
      mode, consent, title, privacy_level: privacy,
      allow_comment: allowComment, allow_duet: allowDuet, allow_stitch: allowStitch,
      commercial: { enabled: commercial, your_brand: yourBrand, branded_content: brandedContent },
    };
    const r = await fetch(`/api/jobs/${jobId}/tiktok`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'TikTok rejected the request.'); return; }
    setPost({ state: 'uploading', uploaded: 0, total: 1, mode });
    startPoll();
  };

  if (!open) return null;

  const creator = me?.creator;
  const options = (creator?.privacy_level_options || []).filter((o) => me?.audited || o === 'SELF_ONLY' || mode === 'inbox');
  const brandedBlocksPrivate = commercial && brandedContent && privacy === 'SELF_ONLY';
  const canPost = me?.connected && consent && !post
    && (mode === 'inbox' || (privacy && (!commercial || yourBrand || brandedContent) && !brandedBlocksPrivate));

  return (
    <div className="tt-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Post to TikTok" onClick={onClose}>
      <div className="tt-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tt-sheet-head">
          <strong>Post to TikTok</strong>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading && <p className="tt-muted">Checking your TikTok connection…</p>}
        {err && <p className="tt-error" role="alert">{err}</p>}

        {!loading && me && !me.enabled && (
          <p className="tt-muted">Posting to TikTok is not configured on this server.</p>
        )}

        {/* ---- not connected ---- */}
        {!loading && me?.enabled && !me.connected && !post && (
          <div className="tt-connect">
            <p>Connect your TikTok account once. Obito only receives permission to upload videos you choose; it never reads your messages or posts on its own.</p>
            {me.reconnect && <p className="tt-muted">Your previous connection expired — please connect again.</p>}
            <button type="button" className="btn-primary" onClick={connect}>Continue with TikTok</button>
          </div>
        )}

        {/* ---- connected: the form ---- */}
        {!loading && me?.connected && !post && (
          <div className="tt-form">
            <div className="tt-creator">
              {creator?.creator_avatar_url && <img src={creator.creator_avatar_url} alt="" width={36} height={36} />}
              <div>
                <div>Posting as <strong>{creator?.creator_nickname || me.account?.display_name || me.account?.username}</strong>
                  {creator?.creator_username && <span className="tt-muted"> @{creator.creator_username}</span>}</div>
                <button type="button" className="tt-link" onClick={disconnect}>Not you? Disconnect</button>
              </div>
            </div>
            {me.creatorError && <p className="tt-error">{me.creatorError.message}</p>}

            <div className="tt-file tt-muted">Video: {fileName || 'optimized master'} </div>

            {me.modes?.direct && me.modes?.inbox && (
              <div className="tt-field">
                <label><input type="radio" name="tt-mode" checked={mode === 'direct'} onChange={() => setMode('direct')} /> Publish now</label>
                <label><input type="radio" name="tt-mode" checked={mode === 'inbox'} onChange={() => setMode('inbox')} /> Send to my TikTok drafts (finish in the TikTok app)</label>
              </div>
            )}

            {mode === 'direct' && (
              <>
                <label className="tt-field">
                  <span>Caption</span>
                  <textarea maxLength={2200} rows={3} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caption, #hashtags, @mentions" />
                </label>

                <fieldset className="tt-field">
                  <legend>Who can view this video <span className="tt-muted">(required)</span></legend>
                  {options.length === 0 && <p className="tt-muted">Loading your account's privacy options…</p>}
                  {options.map((o) => (
                    <label key={o}>
                      <input type="radio" name="tt-privacy" value={o} checked={privacy === o} onChange={() => setPrivacy(o)} /> {PRIVACY_LABEL[o] || o}
                    </label>
                  ))}
                  {!me.audited && <p className="tt-muted">While Obito's TikTok integration is in review, TikTok only allows "Only me" posts <strong>and your TikTok account must be set to Private</strong> at the moment of posting (TikTok app → Settings and privacy → Privacy → Private account). You can switch back to public right after. "Send to my TikTok drafts" has no such restriction.</p>}
                </fieldset>

                <fieldset className="tt-field">
                  <legend>Allow users to</legend>
                  <label><input type="checkbox" checked={allowComment} disabled={!!creator?.comment_disabled} onChange={(e) => setAllowComment(e.target.checked)} /> Comment</label>
                  <label><input type="checkbox" checked={allowDuet} disabled={!!creator?.duet_disabled} onChange={(e) => setAllowDuet(e.target.checked)} /> Duet</label>
                  <label><input type="checkbox" checked={allowStitch} disabled={!!creator?.stitch_disabled} onChange={(e) => setAllowStitch(e.target.checked)} /> Stitch</label>
                </fieldset>

                <fieldset className="tt-field">
                  <label><input type="checkbox" checked={commercial} onChange={(e) => { setCommercial(e.target.checked); if (!e.target.checked) { setYourBrand(false); setBrandedContent(false); } }} /> Disclose video content (this video promotes goods or services)</label>
                  {commercial && (
                    <div className="tt-indent">
                      <label><input type="checkbox" checked={yourBrand} onChange={(e) => setYourBrand(e.target.checked)} /> Your brand — promoting yourself or your own business</label>
                      <label><input type="checkbox" checked={brandedContent} onChange={(e) => setBrandedContent(e.target.checked)} /> Branded content — paid partnership with a brand</label>
                      {!yourBrand && !brandedContent && <p className="tt-muted">You need to indicate if your content promotes yourself, a third party, or both.</p>}
                      {brandedContent && <p className="tt-muted">Your video will be labeled "Paid partnership". Branded content cannot be set to "Only me".</p>}
                      {yourBrand && !brandedContent && <p className="tt-muted">Your video will be labeled "Promotional content".</p>}
                    </div>
                  )}
                </fieldset>
              </>
            )}

            {mode === 'inbox' && (
              <p className="tt-muted">The video will be sent to your TikTok inbox. Open the TikTok app, tap the notification, add your caption and settings, and post from there.</p>
            )}

            <label className="tt-field tt-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                By posting, you agree to TikTok's{' '}
                {commercial && brandedContent && <><a href={me.consent?.brandedContentUrl} target="_blank" rel="noopener noreferrer">Branded Content Policy</a> and </>}
                <a href={me.consent?.musicUrl} target="_blank" rel="noopener noreferrer">Music Usage Confirmation</a>.
              </span>
            </label>

            <button type="button" className="btn-primary" disabled={!canPost} onClick={submit}>
              {mode === 'direct' ? 'Post to TikTok' : 'Send to TikTok drafts'}
            </button>
          </div>
        )}

        {/* ---- progress / result ---- */}
        {post && (
          <div className="tt-progress" aria-live="polite">
            {post.state === 'uploading' && <p>Uploading to TikTok… {post.total > 1 ? Math.round((post.uploaded / post.total) * 100) : 0}%</p>}
            {post.state === 'processing' && (
              <>
                <p>Upload complete — TikTok is processing your video… ({Math.floor((post.elapsedMs || 0) / 60000)}:{String(Math.floor(((post.elapsedMs || 0) % 60000) / 1000)).padStart(2, '0')})</p>
                <p className="tt-status-raw">TikTok status: {post.status || 'waiting for first status'}{post.uploadedBytes != null ? ` · ${(post.uploadedBytes / 1e6).toFixed(1)} / ${(post.total / 1e6).toFixed(1)} MB received` : ''} · id {post.publishId}</p>
                {post.mode === 'inbox' && (
                  <p className="tt-hint">
                    Drafts sent by apps do <b>not</b> appear in Profile → Drafts. TikTok sends a notification to <b>Inbox → System notifications</b>
                    (“Your video from Obito Studio is ready…”) once processing finishes — usually 1–5 minutes, sometimes longer for HDR videos.
                    Keep this page open, or come back later: the notification arrives either way.
                  </p>
                )}
              </>
            )}
            {post.state === 'complete' && post.mode === 'direct' && (
              <p>Posted ✓ — it can take a few minutes to appear on your profile. Check the TikTok app.</p>
            )}
            {post.state === 'complete' && post.mode === 'inbox' && (
              <p>Sent to your TikTok inbox ✓ — open the TikTok app to finish and publish it.</p>
            )}
            {post.state === 'failed' && <p className="tt-error">TikTok post failed: {post.error || post.failReason || 'unknown error'}</p>}
            {(post.state === 'complete' || post.state === 'failed') && (
              <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
