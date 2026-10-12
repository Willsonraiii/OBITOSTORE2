# Switching to a new agent? Paste one of these.

The project carries its own brain in the repo: `AGENTS.md` + `MIGRATION.md` (the project book) + `COMMANDS.md`. Any agent that reads those files can continue safely without needing you to explain the history.

## A. Full continue prompt (use this one)

```text
Inspect and continue my project: OBITO STUDIO (lossless 60fps/120fps TikTok video mastering suite).
Codebase: https://github.com/Willsonraiii/vague-transcode (branch online-rtx-service).
Before doing anything, read AGENTS.md and MIGRATION.md completely.

Strict Rules:
1. No AI-generated / vibe-coded aesthetics (no sparkle emojis ✨, no purple-to-blue gradients, no badge pills). Clean Apple/DaVinci studio hardware aesthetic.
2. 100% lossless remuxing (-c copy) with 19200 timescale harmonization. Never re-encode frames unless explicitly requested.
3. Zero cloud RAM spikes: Remote link inspector uses HTTP Range header probing (bytes=0-1572863, ~1.5 MB) to fetch moov faststart headers in 0.05s.
4. Keep answers short, in concise, detailed, and understandable bullet points. Do not write long essays or repetitive category dumps.
5. Port 3005 is production (managed via systemd obito-studio.service). Never touch port 3005 when doing experimental work.

Current task: <WRITE YOUR TASK HERE>
```

## B. Short prompt (quick inspection)

```text
Inspect this repository: OBITO STUDIO (branch online-rtx-service).
Read AGENTS.md and MIGRATION.md first for complete rules, history, and system architecture.
Task: <WRITE YOUR TASK HERE>
```
