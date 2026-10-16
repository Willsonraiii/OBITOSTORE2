# Agent Documentation Hub (`agent-docs/`)

> **To any AI Agent inspecting this repository**:
> All context, historical evolution from day one to the present, strict user rules, commands, and migration notes are gathered in this directory.
> **Antigravity / Cursor / Claude Code / Codex**: the repo-root [`AGENTS.md`](../AGENTS.md) is auto-loaded and carries the always-on summary + hard rules; the files below are the depth.

---

## Reading Order for Incoming Agents:

1. **[`MIGRATION.md`](MIGRATION.md)** — **The Primary Project Book**: Read this first. Its "CURRENT STATUS — 2026-10-16" section is the single source of truth (Suga auto-deploy, patch workflow, TikTok integration state and next steps). Also contains full project background, architectural guarantees, Suga Cloud/Linux systemd environment, and progress logs.
2. **[`AGENTS.md`](AGENTS.md)** — **Agent Guidelines & Non-Negotiables**:
   - Zero AI-generated visual tropes (no sparkle emojis ✨, no purple-blue gradients, no badge pills).
   - 100% stream copy lossless remuxing (`-c copy`) with 19200 timescale harmonization.
   - Zero cloud RAM spikes: Link Inspector uses HTTP Range header probing (`bytes=0-1572863`, 1.5MB).
   - Port separation: Port 3005 is production (managed via `obito-studio.service`). Never touch port 3005 during experimental work (e.g. `part-2` on port 3006).
   - Communication style: Short, clear, detailed bullet points without repetitive category essays.
3. **[`COMMANDS.md`](COMMANDS.md)** — Complete command reference for building, testing, service management, and git sync.
4. **[`MIGRATION-PROMPT.md`](MIGRATION-PROMPT.md)** — Quick prompts and context summaries for instant agent handoffs.
5. **[`ANTIGRAVITY-PROMPT.md`](ANTIGRAVITY-PROMPT.md)** — Google Antigravity setup (autonomy/terminal policies) + paste-in prompt. The root `AGENTS.md` is what Antigravity actually auto-reads.
6. **[`HANDOFF.md`](HANDOFF.md)** & **[`NEXT-AGENT-PROMPT.md`](NEXT-AGENT-PROMPT.md)** — Historical session-by-session engineering records and handoff logs.
7. **`../TIKTOK-PORTAL-SETUP.md`** & **`../TIKTOK-UPLOAD-GUIDE.md`** (repo root) — TikTok for Developers portal state, demo/review plan, server env names, code map and every gotcha met so far (consent loop, iPhone handoff, drafts parked, Gist mirror).
8. **[`ONLINE-SERVICE-PLAN.md`](ONLINE-SERVICE-PLAN.md)** — Architecture design specifications for the online RTX mastering service.
