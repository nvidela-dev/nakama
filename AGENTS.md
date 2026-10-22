# Working on Nakama

The user wants help coding and wants to understand solutions and gain insights into what we build. Explain important choices, their consequences, and the evidence behind them in plain language.

Read [README.md](README.md), then the relevant canonical document it links. This repository currently contains a documentation foundation only. Do not describe planned features as implemented.

- Preserve existing work. Inspect Git status and use a `codex/` branch before edits.
- Separate accepted decisions from proposals. Record new accepted decisions in [the decision register](docs/roadmap.md).
- Use [the domain vocabulary](docs/domain.md). Update canonical documents instead of adding competing specifications.
- Check project authorization for every read, write, export, and future AI operation. Authentication alone does not grant membership.
- Keep secrets and private project context out of commits, logs, fixtures, and PRs.
- Do not provision services or implement beyond the current request. Platform selection alone is not provisioning authorization.
- Validate changed links and diagrams. Explain what was tested and what remains unverified.
