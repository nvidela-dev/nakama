# Working on Nakama

The user wants help coding and wants to understand solutions and gain insights into what we build. Explain important choices, their consequences, and the evidence behind them in plain language.

Read [README.md](README.md), then the relevant canonical document it links. See the README and development guide for implementation status. Do not describe planned features as implemented or locally tested integrations as deployed.

- Preserve existing work. Inspect Git status and use a `codex/` branch before edits.
- Separate accepted decisions from proposals. Record new accepted decisions in [the decision register](docs/roadmap.md).
- Use [the domain vocabulary](docs/domain.md). Update canonical documents instead of adding competing specifications.
- Check project authorization for every read, write, export, and future AI operation. Authentication alone does not grant membership.
- Keep secrets and private project context out of commits, logs, fixtures, and PRs.
- Do not provision services or implement beyond the current request. Platform selection alone is not provisioning authorization.
- Validate changed links and diagrams. Explain what was tested and what remains unverified.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
