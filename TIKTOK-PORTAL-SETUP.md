# TikTok for Developers — portal setup for Obito Studio

Do these in order. Total hands‑on time ≈ 30–45 min; TikTok's review waits are extra.
At the end you will have a **Client Key** and **Client Secret** to paste into `.env`.

Values you'll type more than once — keep them handy:

| Field | Value |
|---|---|
| Website URL | `https://obitostudio.willsonrai.com.np` |
| Redirect URI | `https://obitostudio.willsonrai.com.np/api/tiktok/callback` |
| Terms of Service URL | `https://obitostudio.willsonrai.com.np/terms.html` |
| Privacy Policy URL | `https://obitostudio.willsonrai.com.np/privacy.html` |
| Verification file (already served) | `https://obitostudio.willsonrai.com.np/tiktokNMFB0mn72gBCMpMILyd4QAAsAm2zZmz9.txt` |

> Before you start: deploy the `feature/tiktok-post` patch and rebuild, so the URLs above (especially the
> verification file and `/tiktok-connected.html`) are live. TikTok fetches them during verification.

> **Status 2026-10-16:** Steps 1–6 are DONE (app id `7696831141604771848`, products Login Kit + Content Posting
> API only, URLs verified, review text pasted, sandbox `obito-test` with the owner's TikTok account as target
> user, sandbox credentials on Suga, Direct Post "Only me" verified live). A **placeholder demo video** is
> uploaded in App review and must be replaced. Remaining: Step 7 (record + submit), Step 8 after approval.

---

## Step 1 — Developer account + organization (5 min)

1. Go to <https://developers.tiktok.com> → **Log in** with your TikTok account (the one you'll test with is fine).
2. Click your profile icon → **Manage apps**.
3. If asked, **create an organization** (e.g. "Obito Studio"). It's optional but TikTok recommends it; apps owned by an individual account get more scrutiny in review.

## Step 2 — Connect the app (5 min)

1. **Manage apps → Connect an app**.
2. **Select the app owner** → your organization → **Confirm**.
3. You land on the app page. Note the toggle at the top: **Production / Sandbox**. Stay in **Production** for the next steps (we'll clone to a sandbox later).
4. Fill **App details → Basic information**:
   - **App name:** Obito Studio
   - **App icon:** your 512×512 logo (`web/public/icon-512.png`)
   - **Category:** Photo & Video (or Productivity)
   - **Description** (reviewers read this — be concrete):
     > Obito Studio is a web tool for TikTok creators. It repackages a creator's own exported video (no re‑encoding) so that 60/120 fps and HDR survive TikTok's upload processing. After optimizing, the creator can post the result to their own TikTok account directly from Obito Studio, choosing privacy and interaction settings themselves.
   - **Terms of Service URL** / **Privacy Policy URL:** from the table above.
5. **Platforms → + Add platform → Web** → **Website URL:** `https://obitostudio.willsonrai.com.np`.
6. Click **Save** (top right). Do this after every section — the portal does not autosave.

## Step 3 — Add products (5 min)

In **Products → + Add products**:

### 3a. Login Kit
- Add it. Under its settings enter **Redirect URI:** `https://obitostudio.willsonrai.com.np/api/tiktok/callback`
  (exact string — https, no trailing slash, no uppercase).
- Scope `user.info.basic` is included automatically.

### 3b. Content Posting API
- Add it. Inside the product you'll see two configurations:
  - **Direct Post** — turn **ON** (this is the "post from the site" button).
  - **Upload** (inbox/draft) — **cannot be turned off.** TikTok bundles it into the product ("By default, Upload to TikTok is enabled, allowing you to upload content to TikTok as a draft…"). Ignore it.
- Scopes appear in the **Scopes** list on the app page. `user.info.basic`, `video.publish` and `video.upload` are all **granted by the products** ("Included in Login Kit" / "Included in Content Posting API") — the list only offers **+ Add scopes**, there is **no per-scope remove**. Do **not** delete the Content Posting API product to get rid of `video.upload`; that takes Direct Post with it.
- Obito drops drafts on its own side: since 2026-10-16 the server requests `TIKTOK_SCOPES=user.info.basic,video.publish`, so `video.upload` is never asked for in the consent screen the reviewer watches. Details: `agent-docs/MIGRATION.md` CURRENT STATUS.
- Each scope asks "How will your app use this?". Suggested text:
  - **video.upload:** "Sends the video the creator just optimized in Obito Studio to the creator's own TikTok inbox as a draft, so they can finish and publish it in the TikTok app."
  - **video.publish:** "Lets the creator publish the video they just optimized to their own TikTok profile from Obito Studio. The creator sees the account name, picks the privacy level (no default), chooses comment/duet/stitch settings, discloses commercial content, and accepts the Music Usage Confirmation before posting."
- **Save**.

## Step 4 — Verify URL ownership (5 min)

Content Posting API apps must verify their URLs; apps created after Sept 2024 must also verify the Terms, Privacy and Website URLs. One **domain** verification covers all of them.

1. Click **URL properties** (top of the app page) → **Verify properties**.
2. Choose **Domain** → enter `obitostudio.willsonrai.com.np` → **Verify**.
   - TikTok shows a **TXT record** → add it in your DNS for `obitostudio.willsonrai.com.np` → wait a few minutes → **Continue to verify**.
   - *If you can't edit DNS*, choose **URL prefix** instead → enter `https://obitostudio.willsonrai.com.np/` → download the signature file. You already have one (`tiktokNMFB0mn72gBCMpMILyd4QAAsAm2zZmz9.txt`) — if the portal gives you a **different** file name, put the new file in `web/public/`, rebuild, and verify it opens in a browser before clicking **Verify**.
3. Status should read **Verified**. The Terms/Privacy/Website/Redirect URLs on the app page now show a green check.

## Step 5 — Sandbox for testing (10 min)

A sandbox lets you test with your own account **without waiting for review**.

1. Flip the top toggle to **Sandbox** → **Create Sandbox** → name it "obito-test" → tick **clone from Production** → **Confirm**.
2. Check **App details** and **Products** were cloned (Login Kit with the redirect URI, Content Posting API with Direct Post on).
3. **Sandbox settings → Target users → Add account** → log in with the TikTok account you'll test with → accept the Developer Terms. Add up to 10 accounts (your own, a friend's).
4. **Apply changes**.
5. In **App details → Credentials** (still in Sandbox mode) copy the **Client key** and **Client secret** — **these are the sandbox credentials**; they differ from Production.

Sandbox limits you'll hit: posts are **private only** (SELF_ONLY), only **target users** can log in, max 5 posting users / 24 h.

## Step 6 — Put the credentials in `.env` and test

On the server:

```ini
TIKTOK_CLIENT_KEY=<sandbox client key>
TIKTOK_CLIENT_SECRET=<sandbox client secret>
TIKTOK_REDIRECT_URI=https://obitostudio.willsonrai.com.np/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.publish
# drafts parked 2026-10-16 — video.upload cannot be removed in the portal (see Step 3b); re-add it here to revive drafts
TIKTOK_AUDITED=false
```

Restart → `curl https://obitostudio.willsonrai.com.np/api/tiktok/config` must return `"enabled":true`.

Test (with a target‑user TikTok account):
1. Optimize a short 60 fps clip → **Post to TikTok** → **Continue with TikTok** → log in → **Authorize**.
2. Sheet shows "Posting as @you". Pick **Only me** → tick consent → **Post to TikTok**.
3. Wait for "Posted ✓" → open the TikTok app → Profile → the private video should be there.
4. Drafts is parked (2026-10-16): `video.upload` may still sit in the portal's scope list, but the server doesn't request it and the sheet hides it — don't test or demo it.
5. Paste the post link into Obito's **Inspector** tab → confirm fps/HDR survived.

Common errors at this stage:

| Message | Cause → fix |
|---|---|
| `redirect_uri` mismatch / "Something went wrong" on TikTok's page | The URI in Login Kit ≠ `TIKTOK_REDIRECT_URI` byte‑for‑byte. Fix one of them. |
| "This app is in sandbox, only target users…" | The TikTok account isn't added under Target users. |
| `scope_not_authorized` | The scope isn't added in the sandbox's product config → add, **Apply changes**, disconnect & reconnect. |
| `unaudited_client_can_only_post_to_private_accounts` | Expected until audit. Keep `TIKTOK_AUDITED=false`. |
| `url_ownership_unverified` | Step 4 not complete for Production (sandbox doesn't need it except for Content Posting URLs). |

## Step 7 — Submit for App Review (Production)

Only when the sandbox test works.

1. Toggle to **Production**. If you changed anything in the sandbox, **Draft → Import → from sandbox**.
2. **App review** section:
   - For **each product and scope**, explain how it's used (reuse Step 3 texts).
   - **Demo video(s)** (max 5, ≤ 50 MB each). Plan as of 2026-10-16 — **one** uncut iPhone screen recording (mic off), Direct Post only; drafts is parked (see `agent-docs/MIGRATION.md` CURRENT STATUS).
     - **Prep:** TikTok app → Settings and privacy → Privacy → Private account ON. Safari → Settings → Advanced → Website Data → delete `tiktok` entries (avoids the app-handoff loop). In the sheet press **Not you? Disconnect** so the consent page appears on camera.
     - **Clip 1 (Login Kit + video.publish):** open site → log in → drop a short clip → optimize → **Post to TikTok** → **Continue with TikTok** → TikTok login (phone/email) → consent screen → Authorize → sheet shows the account name → caption → privacy **Only me** (show nothing was pre‑selected) → toggles → consent checkbox → Post → "Posted ✓" → TikTok app → Profile → the video.
     - Keep it under 50 MB (Photos → ⓘ shows the size; trim idle waiting in Photos → Edit if needed). Reviewers need to see the consent screen and the posted result; they don't care about length. If a reviewer later asks about drafts (`video.upload` sits in the Scopes list), resubmit with a drafts clip or state that drafts is not offered yet.
3. Delete the placeholder video, upload the clips, **Save → Submit for review**. Set the TikTok account back to public afterwards.
4. Watch the **App review status** (and your email). If rejected, the reason is shown; fix and resubmit.

## Step 8 — Content Posting API audit (public posting)

Separate from app review. Until this passes, Direct Post stays private‑only.

1. **Products → Content Posting API → Direct Post → Apply** (sometimes labelled *Request audit*).
2. Upload the same demo video and answer the questionnaire. TikTok checks the **Content Sharing Guidelines "Required UX implementation"** points 1–5 — all implemented in the sheet:
   1. creator nickname shown; 2. privacy selector **with no default**; 3. comment/duet/stitch **off by default**; 4. commercial‑content disclosure; 5. consent text with Music Usage Confirmation / Branded Content Policy links.
3. Don't describe the app as "a tool to upload to accounts I manage" — TikTok rejects that use case. Describe it as a creator product (any TikTok user can sign up and post their own videos).
4. When approved: switch `.env` to the **Production** client key/secret, set `TIKTOK_AUDITED=true`, restart. The sheet now offers all privacy levels.

## Step 9 — After launch

- Any change to products/scopes/URLs in Production needs a re‑review (**Draft → edit → Submit**).
- Keep `TIKTOK_TOKEN_KEY` backed up — losing it means every creator must reconnect.
- Add a short "TikTok" paragraph to `privacy.html` (what's stored, that it's only used to post videos the creator chooses, how to disconnect) — reviewers read it.

---

### Quick checklist

- [ ] Organization + app created (Production)
- [ ] Basic info, Terms/Privacy URLs, Web platform saved
- [ ] Login Kit with redirect URI
- [ ] Content Posting API, Direct Post ON (`video.upload` stays listed — bundled with the product, cannot be removed)
- [ ] Domain / URL prefix verified
- [ ] Sandbox cloned, target user added, sandbox key/secret copied
- [ ] `.env` filled (`TIKTOK_SCOPES=user.info.basic,video.publish`), `/api/tiktok/config` → `enabled:true`, `inboxUpload:false`
- [ ] Sandbox post works (private) + Inspector confirms fps/HDR
- [ ] App review submitted with the demo (one clip, Direct Post only)
- [ ] Direct Post audit applied
- [ ] Approved → production credentials, `TIKTOK_AUDITED=true`
