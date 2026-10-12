# Agent Instructions: Obito Studio (vague-transcode)

> **FOR ANY NEW AI AGENT ASSIGNED TO THIS PROJECT**:
> If the user asks you to inspect or work on this repository, you do not need them to explain the context from scratch. Follow the rules below and consult `AGENTS.md` for full depth.

---

### 1. Essential Context at a Glance
* **Project**: Obito Studio (`vague-transcode`) — Lossless 60fps/120fps TikTok remuxing & video mastering suite.
* **Production Host**: Linux system on port `3005` (`server-rtx-online.js`), managed by systemd `obito-studio.service`.
* **Live Domain**: `https://obitostudio.willsonrai.com.np`
* **Frontend**: React 18 + Vite SPA located in `web/`. Outputs compiled bundle to `public/`.
* **Git Branches**: `online-rtx-service` is the primary working branch, mirrored to `main`.
* **Clone Repo**: Keep `/home/willson/Desktop/vague-infinity-clone` updated in sync.

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
   - Always reply in few, concise, detailed, and understandable bullet points.
   - Remember instructions across turns without making the user repeat themselves.

---

### 3. Key Commands
```bash
# Build frontend
npm --prefix web run build

# Restart production server (runs under user willson with systemd Restart=always)
kill $(pgrep -f "node server-rtx-online.js")

# Git sync
git add -A
git commit -m "<message>"
git push origin online-rtx-service
git push origin online-rtx-service:main
```

For complete architectural details, pipelines, and technical references, read [AGENTS.md](file:///home/willson/Desktop/vague-transcode/AGENTS.md).
