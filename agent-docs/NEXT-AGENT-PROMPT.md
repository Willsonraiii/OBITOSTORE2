# Agent Instructions: Obito Studio (vague-transcode)

> **FOR ANY NEW AI AGENT ASSIGNED TO THIS PROJECT**:
> If the user asks you to inspect or work on this repository, you do not need them to explain the context from scratch. Follow the rules below and consult `AGENTS.md` for full depth.

---

### 1. Essential Context at a Glance
* **Project**: Obito Studio (`vague-transcode`) — Lossless 60fps/120fps TikTok remuxing & video mastering suite.
* **Production Host**: **Suga Cloud** container (project `obitoo`, service `vague-transcode`) running `server-rtx-online.js` on port `3005`; it **auto-deploys on every push to `origin/online-rtx-service`** (commit built `public/` assets). A redeploy wipes the disk — members + TikTok connections are mirrored in a private Gist. The systemd/Tailscale setup in COMMANDS.md is the optional self-hosted variant.
* **Live Domain**: `https://obitostudio.willsonrai.com.np`
* **Frontend**: React 18 + Vite SPA located in `web/`. Outputs compiled bundle to `public/`.
* **Git Branches**: `online-rtx-service` is the primary working branch, mirrored to `main`.
* **Clone Repo**: Keep `/home/willson/Desktop/vague-infinity-clone` updated in sync.
* **How changes ship**: the agent cannot push. It commits on top of the current upstream tip and hands over a `.patch` (say how many commits it holds); the user runs `git am --3way <patch>` then `git push origin online-rtx-service` — Windows PowerShell and Linux commands in `COMMANDS.md` §P.
* **Current focus (2026-10-16)**: TikTok "Post to TikTok" is live (sandbox, **Direct Post only** — drafts parked, `TIKTOK_SCOPES=user.info.basic,video.publish`). App review **submitted** 2026-10-16 (one clip), awaiting TikTok. The Dashboard **"Connected Accounts"** section ships in the pending patch; optional "post to drafts" stays parked. Details: `MIGRATION.md` CURRENT STATUS, `TIKTOK-PORTAL-SETUP.md`, `TIKTOK-UPLOAD-GUIDE.md`.

---

### 2. User Non-Negotiables & Strict Invariants
1. **Never use AI-generated / "vibe-coded" aesthetics**:
   - Strictly NO sparkle emojis (`✨`).
   - NO purple/blue gradient text or gradient titles.
   - NO tacky badge pills (like "CREATOR MASTERCLASS").
   - Follow a professional studio hardware design (Apple / DaVinci Resolve aesthetic: solid white `#ffffff` headers, dark liquid glass, clean slate/cyan accents).
2. **100% Lossless Remuxing (`-c copy`)**:
   - Never transcode or recompress pixels unless the user explicitly checks the H.264 fallback checkbox.
   - Retain 19200 timescale harmonization and color transfer atoms.
3. **Zero Cloud RAM Spikes**:
   - Remote TikTok link inspection uses HTTP Range header probing (`bytes=0-1572863`, 1.5MB) to extract stream metadata via `ffprobe` in ~0.05 seconds. Never download full 50MB+ videos into RAM.
4. **Port Invariant**:
   - Never touch port `3005` or production files when asked to work on experimental copies (e.g. `part-2` runs on port `3006`).
5. **Communication Style**:
   - The user dislikes long, bloated paragraphs with repetitive categories.
   - Always reply in few, concise, detailed, and understandable bullet points; put detail into files, not chat.
   - Remember instructions across turns without making the user repeat themselves.
6. **Product decisions already made** (do not reopen): no color-grade presets; only two TikTok products (Login Kit + Content Posting API); legal contact `resume@willsonrai.com.np`; never commit or print a real `ACCESS_TOKEN` / client secret / Gist token.
7. **Workspace hygiene**: never leave test videos or job outputs in the repo or agent workspace; keep fixtures in `/tmp`.

---

### 3. Key Commands
```bash
# Build frontend (commit the result — Suga serves public/ as committed)
npm --prefix web run build

# Apply an agent patch and ship it (Linux bash)
cd ~/Desktop/vague-transcode && git am --3way ~/Downloads/<name>.patch && git push origin online-rtx-service
```
```powershell
# Same on Windows PowerShell (no &&)
cd "$HOME\Desktop\vague-transcode-4k-test"   # or "$HOME\Desktop\vague-transcode" — whichever exists
git am --3way "$HOME\Downloads\<name>.patch"
git push origin online-rtx-service
```
```bash
# Self-hosted variant only: restart the local server (systemd Restart=always)
kill $(pgrep -f "node server-rtx-online.js")
# Optional mirror
git push origin online-rtx-service:main
```

For complete architectural details, pipelines, and technical references, read [AGENTS.md](file:///home/willson/Desktop/vague-transcode/AGENTS.md).
