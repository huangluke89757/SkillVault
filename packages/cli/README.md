# skillvault

Install and manage AI agent skills from GitHub. Works with Claude Code, Cursor, Windsurf, GitHub Copilot, and [35+ other agents](#supported-agents).

## Install

```bash
npm install -g skillvault
```

Or use directly with `npx`:

```bash
npx skillvault add vercel-labs/agent-skills
```

## Usage

### Add skills

```bash
# From a GitHub repo (installs all skills found)
skillvault add owner/repo

# Specific skill from a repo
skillvault add owner/repo@skill-name

# From a GitHub URL
skillvault add https://github.com/owner/repo

# From a local path
skillvault add ./my-skills

# Skip prompts
skillvault add owner/repo -y

# Install globally (~/.agents/skills/)
skillvault add owner/repo -g

# Target a specific agent
skillvault add owner/repo -a cursor

# Copy files instead of symlink
skillvault add owner/repo --copy
```

### Remove skills

```bash
skillvault remove           # interactive picker
skillvault remove my-skill  # by name
skillvault remove --all     # remove all
```

### List installed skills

```bash
skillvault list
skillvault list -g    # global skills
```

### Update skills

```bash
skillvault update     # check all for updates
```

### Sync from node_modules

If a project has skills published as npm packages:

```bash
skillvault sync
```

## How it works

Skills are markdown files (`SKILL.md`) that tell AI agents what to do. `skillvault` clones repos, finds skills inside them, and symlinks them into each agent's skills directory.

```
~/.agents/skills/       # canonical store (global)
  my-skill/
    SKILL.md

~/.cursor/skills/       # symlinked per agent
  my-skill -> ~/.agents/skills/my-skill
```

Project-local installs go into `.agents/skills/` in your project root.

## Supported agents

claude-code, cursor, github-copilot, windsurf, cline, continue, codex-cli, zcode, gemini-cli, qwen-code, kiro, pi, codebuddy, minimax-code, comate, lingma, codearts, hermes-agent, astrbot, workbuddy, kimi-code, deepseek-harness, qoderwork, qoder, qoder-cn, trae, trae-cn, traecode-cli, droid-cli, ob-1, amp, goose, junie, kilo-code, opencode, openclaw, pear-ai, roo-code, zed

## Options

| Flag | Description |
|------|-------------|
| `-g, --global` | Install to global scope (`~/.agents/skills/`) |
| `-y, --yes` | Skip confirmation prompts |
| `-a, --agent <id>` | Target specific agent(s) |
| `--all` | Select all skills/agents |
| `--copy` | Copy files instead of symlink |
| `-l, --list` | List skills in a repo without installing |
| `-v, --version` | Show version |
| `-h, --help` | Show help |

## Telemetry

Anonymous usage analytics are collected to improve the tool. No personal data is sent.

Opt out:

```bash
export DO_NOT_TRACK=1
# or
export SKILLVAULT_TELEMETRY_DISABLED=1
```

## License

MIT
