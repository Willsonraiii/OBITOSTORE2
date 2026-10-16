# Using Google Antigravity on this project

Antigravity auto-reads **`AGENTS.md` at the repo root** (v1.20.3+) and keeps it in context — the root
file in this repo is already written for that. It also discovers `GEMINI.md`, `.agents/rules/*.md`
and `.agents/agents/*.md` in subdirectories if you ever want narrower rules.

## Recommended Antigravity setup for Obito Studio

- **Autonomy preset:** "Review-driven development" — the agent proposes a plan, you approve.
- **Terminal policy:** **Auto (agent asks for permission)**. Antigravity can be set to run commands
  without asking; this project has production side effects (Suga auto-deploy on push, TikTok posting),
  so keep the asking on.
- **Open the repo folder as the workspace** so `AGENTS.md` and `agent-docs/` are in reach, then paste
  the prompt below into the Manager/Planning view.

## Paste-in prompt

```text
Work on my project OBITO STUDIO (lossless 60/120fps + HDR mastering for TikTok).

Repository: https://github.com/Willsonraiii/vague-transcode — branch online-rtx-service.
Live site: https://obitostudio.willsonrai.com.np (Suga Cloud; auto-deploys on every push to that branch).

Before anything: read the root AGENTS.md, then agent-docs/MIGRATION.md (CURRENT STATUS is the single
source of truth), agent-docs/AGENTS.md and agent-docs/COMMANDS.md.

Rules that must not be broken:
1. Lossless container work only (-c copy, 19200 timescale) — no re-encoding unless I ask.
2. No secrets in code, docs, commits or chat — environment variable names only.
3. No AI-style visuals (no sparkle emojis, no purple/blue gradients, no badge pills).
4. Port 3005 is production; never experiment against it.
5. Do not touch the TikTok developer portal (app in review) or push while a TikTok post is processing.
6. Run npm --prefix web run build before finishing and only claim a deploy after checking the live
   bundle name with curl.

Current task: <WRITE YOUR TASK HERE>

Plan first (list files + steps), wait for my approval, then execute. When done: show the diff summary,
the build result, and any live checks you ran.
```

## Same rules, shorter

If you only want a quick one-liner for a small fix:

```text
Read AGENTS.md in the repo root, then fix: <TASK>. Follow the hard rules there. Build with
npm --prefix web run build, show me the diff, don't push.
```
