# "Post to TikTok" — implementation guide for Obito Studio

This adds a **Post to TikTok** button next to *Download Master Video*. The optimized master is sent
from **your server** straight to the creator's TikTok account using TikTok's official
**Login Kit + Content Posting API**. No browser extension, no TikTok password, no scraping.

Everything described here is already implemented in this working copy and was tested end‑to‑end
against a local mock of TikTok's endpoints (`tools/mock-tiktok.mjs`). What's left for you is the
TikTok developer‑portal side (Part 1) and real‑account testing (Part 5).

> **STATUS 2026-10-16 — drafts parked, Direct Post only.** The portal **cannot** remove
> `video.upload` (scopes are bundled with products and cannot be deleted individually), so Obito
> drops drafts on its own side: `TIKTOK_SCOPES=user.info.basic,video.publish`. Two real tests had
> the upload accepted but never reached `SEND_TO_USER_INBOX` (the second waited ~10 min), and the
> live server now reports `inboxUpload:false` on `/api/tiktok/config` — the sheet no longer offers
> drafts. The code below is unchanged and still supports drafts. To revive: add `video.upload` back
> to `TIKTOK_SCOPES`, restart, then Disconnect → Continue with TikTok. See `agent-docs/MIGRATION.md`
> CURRENT STATUS.

---

## 0. How it works (30‑second version)

```
 browser                      your server (server-rtx-online.js)                 TikTok
 ───────                      ──────────────────────────────────                ──────
 click "Post to TikTok"
   GET /api/tiktok/me  ───────► read stored token ─────────────────────────────► creator_info/query
   (not connected?)               │                                                 │
   click "Continue with TikTok"   │                                                 │
   GET /api/tiktok/connect ─────► signed state → authorize URL                      │
   popup → tiktok.com/v2/auth/authorize ───────────────────────────────────────────►│ user logs in & consents
   ◄─────────────────────────────── GET /api/tiktok/callback?code&state ◄───────────┘
                                  exchange code → tokens (encrypted on disk)
   fill form, click Post
   POST /api/jobs/:id/tiktok ───► validate TikTok UX rules → video/init ──────────► publish_id + upload_url
                                  PUT chunks of jobs/<id>/output.mp4 ─────────────► 206 … 201
   GET /api/jobs/:id/tiktok  ───► status/fetch (≤ 1 per 3 s) ─────────────────────► PUBLISH_COMPLETE
```

Two posting modes are supported (TikTok's terms):

| Mode | Scope | What the creator sees | Unaudited app |
|---|---|---|---|
| **Direct Post** | `video.publish` | Video appears on their profile with the caption/privacy you send | Only `SELF_ONLY` (private) posts, max 5 creators / 24 h |
| **Upload to inbox (draft)** | `video.upload` | TikTok notification → video opens in the TikTok editor, they add caption/sound and post | No privacy restriction |

> **Obito today (2026-10-16): Direct Post only.** Drafts is parked (see the status note at the top).
> The live consent screen requests only `user.info.basic,video.publish`. Note the trade: while
> unaudited, *every* post is forced private ("Only me" + account Private) until the Direct Post audit
> passes — drafts would have been the only public path and it is currently off.

---

## 1. TikTok developer portal (one‑time, ~30 min + review wait)

1. **Create the app** at <https://developers.tiktok.com> → *Manage apps* → *Connect an app*.
   Fill in name "Obito Studio", icon, category, description.
2. **Add products:** *Login Kit* and *Content Posting API*. In Content Posting API enable the
   **Direct Post** configuration (*Upload* is bundled and cannot be switched off — ignore it).
3. **Platform:** add **Web** and set the Redirect URI to exactly
   `https://obitostudio.willsonrai.com.np/api/tiktok/callback` (https required; TikTok compares the string byte‑for‑byte).
4. **Scopes:** `user.info.basic` (added by default) and `video.publish` are what Obito actually uses;
   `video.upload` also appears because it ships with Content Posting API and **cannot be removed**.
   For each one you must write *why* you need it — e.g. "video.publish: lets the creator publish the
   video they just optimized in Obito Studio to their own account after choosing privacy and settings."
5. **Verify URL ownership** (required for Content Posting API). You already generated the file
   `tiktokNMFB0mn72gBCMpMILyd4QAAsAm2zZmz9.txt` — but it was sitting in the repo root where Express
   never serves it. It is now in `web/public/` (so `vite build` keeps it) and `public/`; check
   `https://obitostudio.willsonrai.com.np/tiktokNMFB0mn72gBCMpMILyd4QAAsAm2zZmz9.txt` returns 200 and
   click **Verify** in the portal.
6. **Terms & Privacy URLs:** point to `/terms.html` and `/privacy.html`. Add a paragraph to
   `privacy.html` saying: Obito stores the creator's TikTok access token (encrypted) only to upload
   videos they explicitly choose; it never reads messages or posts automatically; tokens are deleted
   on *Disconnect*.
7. **Sandbox:** create a Sandbox in the app and add your own TikTok account(s) as *target users*
   (up to 10). Sandbox credentials have their own client key/secret — use those in `.env` during development.
8. **Submit for review**, then (separately) the **Content Posting API audit**. The audit wants a
   **demo video** of the complete flow: connect → see creator name → pick privacy (no default) →
   toggles off by default → commercial disclosure → consent text → post → video visible on TikTok.
   TikTok explicitly rejects *"a utility tool to help upload content to the account(s) you or your team manages"*,
   so demo it as a creator product (sign‑up with a referral code, optimize, post), not as your own uploader.
   Review times are not published; budget days‑to‑weeks.

Until the audit passes, set `TIKTOK_AUDITED=false` (the UI then only offers "Only me" for Direct Post and explains why).

---

## 2. Server configuration

Add to `.env` (see `.env.example`):

```ini
TIKTOK_CLIENT_KEY=aw…                      # from the portal (sandbox key while testing)
TIKTOK_CLIENT_SECRET=…
TIKTOK_REDIRECT_URI=https://obitostudio.willsonrai.com.np/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.publish   # drafts parked — add ,video.upload to revive (see status note at the top)
TIKTOK_AUDITED=false
TIKTOK_STATE_SECRET=$(openssl rand -hex 32)   # signs the OAuth state
TIKTOK_TOKEN_KEY=$(openssl rand -hex 32)      # AES-256-GCM key for stored tokens — keep it, losing it = everyone reconnects
# optional
# TIKTOK_FORCE_CONSENT=1                      # adds disable_auto_auth=1 — DO NOT USE: TikTok's page loops (see §6)
# TIKTOK_GIST_ID= / TIKTOK_GIST_TOKEN=        # override the members Gist used to mirror tiktok-accounts.json
```

**Persistence (2026-10-16):** the Suga container disk is wiped on every redeploy, so `tiktok-accounts.json` is
mirrored (encrypted records only) into the private Gist configured by `MEMBERS_GIST_ID` / `MEMBERS_GIST_TOKEN`
and restored on boot when the local file is missing. Without `TIKTOK_TOKEN_KEY` the mirror stays off.

Restart the service. The log shows `[tiktok] enabled · scopes … · audited=false · redirect …`.
If the three main vars are missing the feature is simply off (`/api/tiktok/config` → `enabled:false`, no button rendered).

Add `tiktok-routes.js`, `tiktok-store.js` and `lib/tiktok-api.js` to **both** Dockerfiles' `COPY` lines
(and remember `DATA_DIR` must be on a volume — the token file lives there).

---

## 3. What was added (file by file)

| File | Role |
|---|---|
| `lib/tiktok-api.js` | Pure API client: `buildAuthorizeUrl`, `exchangeCode`, `refreshAccessToken`, `revokeToken`, `getUserInfo`, `queryCreatorInfo`, `chunkPlan`, `initDirectPost`, `initInboxUpload`, `uploadFileChunked`, `fetchPublishStatus`, `describeError`. No Express, no job store. |
| `tiktok-store.js` | One TikTok account per Obito identity (`owner` or `client:<id>`) in `DATA_DIR/tiktok-accounts.json`, tokens AES‑GCM encrypted, auto‑refresh 5 min before expiry, read‑modify‑write inside the lock. |
| `tiktok-routes.js` | The 7 routes (below) + server‑side enforcement of TikTok's UX rules. |
| `server-rtx-online.js` | 3 lines: import, guard exemption for `/tiktok/callback` + `/tiktok/config`, `mountTikTokRoutes(app, { jobs, validJobId })`. |
| `web/src/TikTokPostSheet.jsx` | The sheet UI (connect → form → progress). |
| `web/src/Optimizer.jsx` | Button in the done‑state, `?tiktok=` return handling (restores the finished job after a full‑page OAuth redirect). |
| `web/public/tiktok-connected.html` | OAuth landing page: `postMessage` to the opener and close (popup flow) or redirect back to `/#optimizer`. |
| `web/public/tiktokNMFB…txt` | URL‑ownership verification file (now actually served). |
| `tools/mock-tiktok.mjs` | Local stand‑in for TikTok's endpoints that enforces the chunk rules — see Part 5. |

### Routes

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/tiktok/config` | public | `{ enabled, directPost, inboxUpload, audited }` — frontend hides the button when disabled |
| `GET /api/tiktok/connect` | Obito token | returns `{ url }` of TikTok's authorize page with an HMAC‑signed, single‑use, 10‑min `state` bound to the Obito identity |
| `GET /api/tiktok/callback` | **none** (exempt in the guard) | TikTok redirects here; verifies `state`, exchanges `code`, stores tokens, redirects to `/tiktok-connected.html` |
| `GET /api/tiktok/me` | Obito token | connection status, profile, **fresh `creator_info`** (privacy options, interaction flags, max duration), consent URLs |
| `POST /api/tiktok/disconnect` | Obito token | revoke + delete tokens |
| `POST /api/jobs/:id/tiktok` | Obito token | validate → `init` → **202** `{ publishId }`; upload continues in the background |
| `GET /api/jobs/:id/tiktok` | Obito token | `{ state: uploading\|processing\|complete\|failed, uploaded, total, status, failReason, postIds, error }` |

Why the callback must be exempt from the `/api` guard: the browser arrives from tiktok.com with no
`x-access-token` header. Identity is carried in the signed `state` instead, which is why forging or
replaying it is rejected (tested).

### Request body for `POST /api/jobs/:id/tiktok`

```json
{
  "mode": "direct",                 // or "inbox"
  "consent": true,                  // Music Usage Confirmation acknowledged (required)
  "title": "caption #tags @mentions",   // ≤ 2200 chars, direct only
  "privacy_level": "SELF_ONLY",     // MUST be one of creator_info.privacy_level_options, direct only
  "allow_comment": false, "allow_duet": false, "allow_stitch": false,   // default OFF (TikTok rule)
  "commercial": { "enabled": false, "your_brand": false, "branded_content": false },
  "is_aigc": false,
  "cover_ms": 1000
}
```

Server‑side checks (all tested): consent present · privacy chosen and allowed for the account ·
`SELF_ONLY` enforced while unaudited · commercial on ⇒ at least one of your‑brand/branded‑content ·
branded content ⇒ not `SELF_ONLY` · interaction toggles forced off when the account disables them ·
**duration ≤ `max_video_post_duration_sec`** (see the Obito‑specific note below) · one in‑flight post per job.

---

## 4. The TikTok UX rules the UI follows (the audit checks these)

`TikTokPostSheet.jsx` implements TikTok's Content Sharing Guidelines:

1. **Creator identity shown** — "Posting as *nickname* @username" from `creator_info/query`, with a *Disconnect* link.
2. **Privacy selector with no default**, options come only from `privacy_level_options`. While unaudited only *Only me* is offered, with an explanation.
3. **Allow comments / Duet / Stitch** are checkboxes, **off by default**, disabled when `comment_disabled` / `duet_disabled` / `stitch_disabled` is true for the account.
4. **Commercial content disclosure** toggle, off by default. When on: *Your brand* and/or *Branded content*; hint texts ("Promotional content" / "Paid partnership"); branded content blocks *Only me*.
5. **Consent text with links:** "By posting, you agree to TikTok's Music Usage Confirmation" — and *Branded Content Policy* when branded content is selected. The Post button is disabled until the box is ticked.
6. **Explicit action**, progress states, and a completion message saying the post may take a few minutes to appear.
7. For inbox mode the sheet tells the creator the video goes to their TikTok inbox and they finish in the app.

Keep these when you restyle the sheet to the house look — the audit reviewer compares your demo video against this list.

---

## 5. Testing

### 5a. Offline, against the mock (no TikTok account needed)

```bash
# terminal 1 — mock TikTok (api on :4556, upload host on :4555)
node tools/mock-tiktok.mjs

# terminal 2 — Obito pointed at the mock
ACCESS_TOKEN=test DATA_DIR=/tmp/obito-data \
TIKTOK_CLIENT_KEY=x TIKTOK_CLIENT_SECRET=y TIKTOK_REDIRECT_URI=http://127.0.0.1:3005/api/tiktok/callback \
TIKTOK_OPEN_API_BASE=http://127.0.0.1:4556 TIKTOK_TOKEN_KEY=$(openssl rand -hex 32) \
node server-rtx-online.js

# terminal 3 — "sign in" (the mock accepts code=GOODCODE), then optimize a clip in the UI and press Post
STATE=$(curl -s -H 'x-access-token: test' localhost:3005/api/tiktok/connect | python3 -c "import sys,json,urllib.parse as u;print(u.parse_qs(u.urlparse(json.load(sys.stdin)['url']).query)['state'][0])")
curl -si "localhost:3005/api/tiktok/callback?code=GOODCODE&state=$STATE" | grep -i location
```

The mock enforces TikTok's chunk rules (5 MB ≤ chunk ≤ 64 MB, `total_chunk_count = floor(size/chunk)`,
sequential `Content-Range`, 206/201/416 semantics). Verified here: a 10 MB master → 1 chunk,
a 75 MB master → 7 chunks with the remainder merged into the last one, memory stays bounded.

### 5b. Real TikTok (sandbox)

1. Use the **sandbox** client key/secret and add your TikTok account as a sandbox target user.
2. Run the service on the real HTTPS domain (TikTok will not redirect to `http://localhost`;
   use the production host or a tunnel such as `cloudflared`/`ngrok` with the tunnel URL registered as redirect URI).
3. Connect, optimize a short 60 fps iPhone clip, post with **Only me**.
4. **Verify the whole point of Obito survived:** open the posted video's link in the **Inspector** tab
   (`/api/inspect-link`) and compare fps/HDR against the same file uploaded through TikTok Studio.
   The RTX timing trick was only ever validated through Studio uploads; API ingestion *may* normalize
   differently. Do this before investing in polish — if the API path loses the 60 fps result, Direct
   Post is pointless for Obito and inbox/draft (which goes through the app's publish path) is the one to keep.
5. Also test a clip whose master has **two audio tracks** (the pipeline adds a second AAC track) — the
   API docs say "1 video"; confirm TikTok accepts the extra audio track rather than failing with `file_format_check_failed`.

---

## 6. Obito‑specific gotchas

* **Runtime doubles.** The RTX timing method makes a 60 fps source play at 30 fps container speed,
  so the master's duration is ~2× the source (a 3 s clip became 5.98 s in testing). TikTok rejects
  anything over `max_video_post_duration_sec` (180 s for most accounts, 300/600 for some). The route
  checks this with ffprobe and returns a clear error; surface the limit in the UI *before* optimizing
  (e.g. "sources longer than 90 s cannot be posted directly from Obito on a 3‑minute account").
* **Job TTL.** Masters are deleted 1 h after completion. The TikTok upload reads `jobs/<id>/output.mp4`
  — a slow 600 MB upload started at minute 55 could lose its file. Either bump `JOB_TTL_MS` or mark
  jobs with an in‑flight `tiktok.state` as not‑expirable in the cleanup timer.
* **Jobs are not owner‑scoped** (see the earlier review). Posting uses the *caller's* TikTok account,
  so a leaked job id lets someone post your video to *their* account — annoying rather than dangerous,
  but add `job.ownerSubject` and check it in `/api/jobs/:id/tiktok` when you do the ownership fix.
* **Rate limits:** `creator_info` 20/min, `init` 6/min, `status/fetch` 30/min per user token. The
  routes poll status at most every 3 s per job; the UI polls every 3 s. TikTok also has a per‑creator
  daily cap across all apps (≈15 posts) → `spam_risk_too_many_posts`.
* **Token lifetimes:** access 24 h, refresh 365 d (rotates on refresh — the store persists the new one).
  Authorization codes are single‑use and expire in 5 min.
* **Upload URL expires after 1 h** and chunks must be sequential — the uploader retries 5xx/network
  errors per chunk but a 403/416 means "start a new init" (`upload_url_expired`).
* **Popup vs redirect.** The sheet opens TikTok in a popup and listens for `postMessage`. When a browser
  blocks the popup it falls back to a full redirect and the Optimizer restores the finished job from
  `localStorage` + `GET /api/jobs/:id` on return (`?tiktok=connected`).
* **Every TikTok identity maps to one Obito identity** (`owner` or `client:<clientId>`). In open/dev
  mode with no access control everyone shares `anonymous` — don't run it that way in production.
* **`disable_auto_auth=1` loops (Oct 2026, sandbox key).** TikTok documents it as "always show the consent
  page", but the authorize page answered with an endless `…/v2/auth/authorize/&error=invalid_request&logid=…`
  reload loop on desktop and iPhone. It is off by default (`TIKTOK_FORCE_CONSENT`). To show the consent page
  again, **Disconnect** (now awaits `POST /v2/oauth/revoke/`, refreshing the token first if needed) or remove
  the app in TikTok → Settings and privacy → Security & permissions → Apps and services.
* **iPhone Safari handoff.** With an existing tiktok.com web session, TikTok's mobile authorize page hands the
  request to the TikTok app, which rejects the sandbox client key → the same loop. Workaround until approval:
  Settings → Safari → Advanced → Website Data → delete the `tiktok` entries, then log in with phone/email.
  Touch devices use a full-page redirect (`TikTokPostSheet.connect()`), desktops a popup; both return via
  `/tiktok-connected.html`.
* **Drafts land in Inbox → System notifications**, not in Profile → Drafts. Status stays `PROCESSING_UPLOAD`
  until TikTok has processed the file (minutes; HDR seems slower), then `SEND_TO_USER_INBOX`. The sheet shows
  the raw status, bytes received and elapsed time; the server logs every status change. As of 2026-10-16
  `SEND_TO_USER_INBOX` has not been observed yet — investigate with those lines if it keeps failing.
* **Server restart mid-post.** Jobs live in memory; after a redeploy `GET /api/jobs/:id/tiktok` is 404 and the
  sheet shows "Lost track of this upload…" (TikTok keeps processing on its side).
* **Unaudited rule, confirmed live:** Direct Post needs `SELF_ONLY` **and** the creator's account set to Private
  at posting time (TikTok app → Settings and privacy → Privacy → Private account), max 5 creators / 24 h.
  Drafts are exempt. The account can go public again afterwards.

---

## 7. Rollout checklist

- [x] Portal app created, Login Kit + Content Posting API added, Web redirect URI set
- [x] URL verification file reachable at the root and verified
- [x] privacy.html / terms.html updated and linked in the portal
- [x] Sandbox credentials on Suga, `/api/tiktok/config` → `enabled:true`
- [x] Connect flow works on the real domain (desktop popup; iPhone redirect — see the Safari note in §6)
- [ ] Parked (2026-10-16): inbox/draft post never reached `SEND_TO_USER_INBOX` (2 tests, incl. ~10 min wait). `video.upload` dropped from `TIKTOK_SCOPES`; code kept, not advertised.
- [x] Direct post (Only me) completes → `PUBLISH_COMPLETE` (2026-10-16)
- [ ] Inspector confirms the published video kept 60 fps / HDR (user: a private→public switch seemed to lose HDR; parked)
- [ ] Demo clip recorded (one, Direct Post only) and app review submitted
- [ ] After approval: production credentials, `TIKTOK_AUDITED=true`, redeploy
- [ ] Then: "Connected accounts" dashboard section (linked TikTok name/avatar + Disconnect)
