# Third-Party Notices

This project includes code adapted from the following open source projects.

---

## vercel-labs/skills

**Repository:** https://github.com/vercel-labs/skills
**Copyright:** Copyright (c) 2026 Vercel, Inc.

The following modules in `packages/cli/src/` were adapted from or inspired by
the `vercel-labs/skills` CLI tool:

- `core/agents.ts` — Agent registry and detection logic
- `core/source-parser.ts` — GitHub URL and shorthand parsing
- `core/installer.ts` — Symlink/copy installation logic
- `core/skill-lock.ts` — Lock file format and tree SHA approach
- `core/skill-discovery.ts` — Recursive SKILL.md discovery algorithm
- `core/plugin-manifest.ts` — Plugin manifest parsing
- `constants.ts` — Directory conventions and skip patterns

These files have been substantially modified for SkillVault's architecture
(local-first desktop workflow, multi-source support) but the core algorithms
and agent configuration patterns originate from the Vercel project.

---

## Lobe Icons

**Repository:** https://github.com/lobehub/lobe-icons
**License:** MIT

Selected Agent brand marks in `apps/desktop/src/renderer/assets/agent-logos/color/`
are adapted from Lobe Icons and bundled locally for offline use.

---

## AstrBot

**Repository:** https://github.com/AstrBotDevs/AstrBot
**License:** AGPL-3.0

The bundled AstrBot logo is sourced from the AstrBot project.
