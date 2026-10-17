# Obito Studio (vague-transcode)

> **Lossless TikTok video remux & creator suite**
> Keeps the source frame rate in the output and packages a single primary audio track without re-encoding video frames. TikTok may still re-encode uploads.

**Live Production:** [https://obitostudio.willsonrai.com.np](https://obitostudio.willsonrai.com.np)  
**Production Port:** `3005` (Managed via systemd `obito-studio.service`)

---

## ⚡ What It Solves

Obito Studio prepares the file before upload with a lossless video remux:
* Retains the source video frame rate and copies video packets without re-encoding.
* Outputs one audio track (the primary track when the source contains multiple tracks).
* Applies fast-start container layout and the selected HDR/Dolby Vision handling.
* Probes local files and remote TikTok links in **0.05 seconds** with virtually zero RAM usage via HTTP Range header inspection.

---

## 🛠️ System Architecture

* **Frontend (`web/`)**: Modern React 18 SPA built with Vite.
  * **Optimizer**: Drag-and-drop mastering dropzone with real-time terminal output, tactile mode switcher, and fast direct download.
  * **Inspector**: Dual-mode container diagnostics (supports local drag-and-drop files or remote TikTok links via Range probing).
  * **Creator Guide**: Production export cheatsheets for DaVinci Resolve, Premiere Pro, and CapCut.
  * **Library**: Historical mastering records and stream telemetry.
  * **Liquid Glass UI**: Fluid 60fps animations, iOS-style tactile bottom dock with multi-tab sweep gestures, and high-contrast pro hardware aesthetic.
* **Backend (`server-rtx-online.js`)**: Production Express server on Node.js.
  * Manages `/api/optimize`, `/api/inspect`, `/api/inspect-link`, auth, and jobs queue.
  * Integrates `tools/rtx-pipeline.js` for lossless fast-start remuxing while retaining source frame timing and a single primary audio track.
  * Integrates `lib/timecode-injector.js` for atom-level timecode synthesis.
  * Uses HTTP Range request probing (`bytes=0-1572863`) to inspect remote links instantly with zero server memory overhead.

---

## 🚀 Quick Start & Development

### 1. Requirements
* **Node.js** v20+ (Node v24 recommended)
* **FFmpeg** & **FFprobe** v6.0+

### 2. Running Locally
```bash
# Install root backend dependencies
npm install

# Install web frontend dependencies
npm --prefix web install

# Build web frontend
npm --prefix web run build

# Start production server on port 3005
PORT=3005 node server-rtx-online.js
```

### 3. Service Management (Production Host)
The production daemon runs under systemd:
```bash
# Check status
systemctl status obito-studio.service

# Hot restart after code updates (service runs with Restart=always)
kill $(pgrep -f "node server-rtx-online.js")
```

---

## 📖 For AI Agents & Contributors

If you are an AI assistant or new developer inspecting this repository, **read [AGENTS.md](file:///home/willson/Desktop/vague-transcode/AGENTS.md) first**. It contains complete architectural rules, user non-negotiables (no AI-style visual tropes, 100% stream copy invariant, zero-RAM probing constraints), and full history.
