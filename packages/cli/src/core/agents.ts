// Portions adapted from vercel-labs/skills (https://github.com/vercel-labs/skills)
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { AgentConfig, AgentType } from "../types.js";
import { AGENTS_DIR, SKILLS_SUBDIR } from "../constants.js";

const home = os.homedir();
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
const copilotHome = process.env.COPILOT_HOME || path.join(home, ".copilot");
const openCodeHome = process.env.OPENCODE_CONFIG_DIR || path.join(configHome, "opencode");
const piAgentHome = process.env.PI_CODING_AGENT_DIR || path.join(home, ".pi", "agent");
const factoryHome = process.env.FACTORY_HOME || path.join(home, ".factory");
const ob1Home = process.env.OB1_HOME || path.join(home, ".ob1");
const kimiCodeHome = process.env.KIMI_CODE_HOME || path.join(home, ".kimi-code");
const dshHome = process.env.DSH_HOME || path.join(home, ".dsh");

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function anyDirExists(paths: string[]): Promise<boolean> {
  return (await Promise.all(paths.map(dirExists))).some(Boolean);
}

async function commandExists(commandName: string): Promise<boolean> {
  const pathEntries = (process.env.PATH || "")
    .split(path.delimiter)
    .map((entry) => entry.replace(/^"|"$/g, ""))
    .filter(Boolean);
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];

  for (const directory of pathEntries) {
    for (const extension of extensions) {
      try {
        if ((await fs.stat(path.join(directory, `${commandName}${extension}`))).isFile()) {
          return true;
        }
      } catch {
        // 继续检查下一个 PATH 条目。
      }
    }
  }
  return false;
}

// ---------- Agent Registry ----------

export const agents: Record<string, AgentConfig> = {
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude"),
      "skills",
    ),
    detectInstalled: async () => {
      return dirExists(
        process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude"),
      );
    },
  },

  cursor: {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: ".cursor/skills",
    globalSkillsDir: path.join(home, ".cursor", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".cursor")),
  },

  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    skillsDir: ".github/skills",
    globalSkillsDir: path.join(copilotHome, "skills"),
    // ~/.copilot 也会被 IDE 集成创建，只有 CLI 命令才作为安装信号。
    detectInstalled: async () => commandExists("copilot"),
  },

  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: path.join(home, ".codeium", "windsurf", "skills"),
    detectInstalled: async () => anyDirExists([
      path.join(home, ".codeium", "windsurf"),
      path.join(home, ".windsurf"),
    ]),
  },

  cline: {
    name: "cline",
    displayName: "Cline",
    skillsDir: ".cline/skills",
    globalSkillsDir: path.join(home, ".cline", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".cline")),
  },

  continue: {
    name: "continue",
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: path.join(home, ".continue", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".continue")),
  },

  "codex-cli": {
    name: "codex-cli",
    displayName: "Codex CLI",
    skillsDir: ".codex/skills",
    globalSkillsDir: path.join(
      process.env.CODEX_HOME || path.join(home, ".codex"),
      "skills",
    ),
    detectInstalled: async () => {
      return dirExists(
        process.env.CODEX_HOME || path.join(home, ".codex"),
      );
    },
  },

  zcode: {
    name: "zcode",
    displayName: "ZCode",
    skillsDir: ".zcode/skills",
    globalSkillsDir: path.join(home, ".zcode", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".zcode")),
  },

  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: path.join(home, ".gemini", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".gemini")),
  },

  "qwen-code": {
    name: "qwen-code",
    displayName: "Qwen Code",
    skillsDir: ".qwen/skills",
    globalSkillsDir: path.join(home, ".qwen", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".qwen")),
  },

  kiro: {
    name: "kiro",
    displayName: "Kiro",
    skillsDir: ".kiro/skills",
    globalSkillsDir: path.join(home, ".kiro", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".kiro")),
  },

  pi: {
    name: "pi",
    displayName: "Pi",
    skillsDir: ".pi/skills",
    globalSkillsDir: path.join(piAgentHome, "skills"),
    detectInstalled: async () => dirExists(piAgentHome),
  },

  codebuddy: {
    name: "codebuddy",
    displayName: "CodeBuddy",
    skillsDir: ".codebuddy/skills",
    globalSkillsDir: path.join(home, ".codebuddy", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".codebuddy")),
  },

  "minimax-code": {
    name: "minimax-code",
    displayName: "MiniMax Code",
    skillsDir: ".minimax/skills",
    globalSkillsDir: path.join(home, ".minimax", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".minimax")),
  },

  comate: {
    name: "comate",
    displayName: "Comate",
    skillsDir: ".comate/skills",
    globalSkillsDir: path.join(home, ".comate", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".comate")),
  },

  lingma: {
    name: "lingma",
    displayName: "Lingma",
    skillsDir: ".lingma/skills",
    globalSkillsDir: path.join(home, ".lingma", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".lingma")),
  },

  codearts: {
    name: "codearts",
    displayName: "CodeArts",
    skillsDir: ".codeartsdoer/skills",
    globalSkillsDir: path.join(home, ".codeartsdoer", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".codeartsdoer")),
  },

  "hermes-agent": {
    name: "hermes-agent",
    displayName: "Hermes",
    skillsDir: ".hermes/skills",
    globalSkillsDir: path.join(home, ".hermes", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".hermes")),
  },

  astrbot: {
    name: "astrbot",
    displayName: "AstrBot",
    skillsDir: "data/skills",
    globalSkillsDir: path.join(home, ".astrbot", "data", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".astrbot")),
  },

  workbuddy: {
    name: "workbuddy",
    displayName: "WorkBuddy",
    skillsDir: ".workbuddy/skills",
    globalSkillsDir: path.join(home, ".workbuddy", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".workbuddy")),
  },

  "kimi-code": {
    name: "kimi-code",
    displayName: "Kimi Code",
    skillsDir: ".kimi-code/skills",
    globalSkillsDir: path.join(kimiCodeHome, "skills"),
    detectInstalled: async () => dirExists(kimiCodeHome),
  },

  "deepseek-harness": {
    name: "deepseek-harness",
    displayName: "DeepSeek Harness",
    skillsDir: ".dsh/skills",
    globalSkillsDir: path.join(dshHome, "skills"),
    detectInstalled: async () => dirExists(dshHome),
  },

  qoderwork: {
    name: "qoderwork",
    displayName: "QoderWork",
    skillsDir: ".qoderwork/skills",
    globalSkillsDir: path.join(home, ".qoderwork", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".qoderwork")),
  },

  qoder: {
    name: "qoder",
    displayName: "Qoder CLI",
    skillsDir: ".qoder/skills",
    globalSkillsDir: path.join(home, ".qoder", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".qoder")),
  },

  "qoder-cn": {
    name: "qoder-cn",
    displayName: "Qoder CN",
    skillsDir: ".qoder/skills",
    globalSkillsDir: path.join(home, ".qoder-cn", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".qoder-cn")),
  },

  "droid-cli": {
    name: "droid-cli",
    displayName: "Droid CLI",
    skillsDir: ".factory/skills",
    globalSkillsDir: path.join(factoryHome, "skills"),
    detectInstalled: async () => dirExists(factoryHome),
  },

  "ob-1": {
    name: "ob-1",
    displayName: "OB-1",
    skillsDir: ".ob1/skills",
    globalSkillsDir: path.join(ob1Home, "skills"),
    detectInstalled: async () => dirExists(ob1Home),
  },

  amp: {
    name: "amp",
    displayName: "Amp",
    skillsDir: ".amp/skills",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    detectInstalled: async () => anyDirExists([
      path.join(configHome, "amp"),
      path.join(configHome, "agents"),
      path.join(home, ".amp"),
    ]),
  },

  goose: {
    name: "goose",
    displayName: "Goose",
    skillsDir: ".goose/skills",
    globalSkillsDir: path.join(configHome, "goose", "skills"),
    detectInstalled: async () => anyDirExists([
      path.join(configHome, "goose"),
      path.join(home, ".goose"),
    ]),
  },

  junie: {
    name: "junie",
    displayName: "Junie",
    skillsDir: ".junie/skills",
    globalSkillsDir: path.join(home, ".junie", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".junie")),
  },

  "kilo-code": {
    name: "kilo-code",
    displayName: "Kilo Code",
    skillsDir: ".kilo/skills",
    globalSkillsDir: path.join(home, ".kilo", "skills"),
    detectInstalled: async () => anyDirExists([
      path.join(home, ".kilo"),
      path.join(home, ".kilo-code"),
      path.join(home, ".kilocode"),
    ]),
  },

  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: ".opencode/skills",
    globalSkillsDir: path.join(openCodeHome, "skills"),
    detectInstalled: async () => anyDirExists([
      openCodeHome,
      path.join(home, ".opencode"),
    ]),
  },

  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    skillsDir: ".openclaw/skills",
    globalSkillsDir: path.join(home, ".openclaw", "skills"),
    detectInstalled: async () => {
      // Check multiple directory names for backwards compat
      return (
        (await dirExists(path.join(home, ".openclaw"))) ||
        (await dirExists(path.join(home, ".clawdbot"))) ||
        (await dirExists(path.join(home, ".moltbot")))
      );
    },
  },

  "pear-ai": {
    name: "pear-ai",
    displayName: "Pear AI",
    skillsDir: ".pear-ai/skills",
    globalSkillsDir: path.join(home, ".pear-ai", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".pear-ai")),
  },

  "roo-code": {
    name: "roo-code",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: path.join(home, ".roo", "skills"),
    detectInstalled: async () => anyDirExists([
      path.join(home, ".roo"),
      path.join(home, ".roo-code"),
    ]),
  },

  trae: {
    name: "trae",
    displayName: "TRAE",
    skillsDir: ".trae/skills",
    globalSkillsDir: path.join(home, ".trae", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".trae")),
  },

  "trae-cn": {
    name: "trae-cn",
    displayName: "TRAE CN",
    skillsDir: ".trae/skills",
    globalSkillsDir: path.join(home, ".trae-cn", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".trae-cn")),
  },

  "traecode-cli": {
    name: "traecode-cli",
    displayName: "TraeCode CLI",
    skillsDir: ".traecli/skills",
    globalSkillsDir: path.join(home, ".traecli", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".traecli")),
  },

  zed: {
    name: "zed",
    displayName: "Zed",
    skillsDir: ".agents/skills",
    globalSkillsDir: path.join(home, AGENTS_DIR, SKILLS_SUBDIR),
    detectInstalled: async () => dirExists(path.join(configHome, "zed")),
  },

  "mimo-code": {
    name: "mimo-code",
    displayName: "MiMo Code",
    skillsDir: ".mimocode/skills",
    globalSkillsDir: path.join(configHome, "mimocode", "skills"),
    detectInstalled: async () => dirExists(path.join(configHome, "mimocode")),
  },

  "iflow-cli": {
    name: "iflow-cli",
    displayName: "iFlow CLI",
    skillsDir: ".iflow/skills",
    globalSkillsDir: path.join(home, ".iflow", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".iflow")),
  },

  catpaw: {
    name: "catpaw",
    displayName: "CatPaw",
    skillsDir: ".catpaw/skills",
    globalSkillsDir: path.join(home, ".catpaw", "skills"),
    detectInstalled: async () => dirExists(path.join(home, ".catpaw")),
  },

  universal: {
    name: "universal",
    displayName: "通用 Skill 目录",
    skillsDir: ".agents/skills",
    globalSkillsDir: path.join(home, AGENTS_DIR, SKILLS_SUBDIR),
    detectInstalled: async () => true,
    showInUniversalList: true,
  },
};

// ---------- Detection + Classification ----------

export async function detectInstalledAgents(): Promise<AgentConfig[]> {
  const results = await Promise.all(
    Object.values(agents).map(async (agent) => ({
      agent,
      installed: await agent.detectInstalled(),
    })),
  );
  return results.filter((r) => r.installed).map((r) => r.agent);
}

export function getUniversalAgents(): AgentConfig[] {
  return Object.values(agents).filter(
    (a) =>
      a.globalSkillsDir === path.join(home, AGENTS_DIR, SKILLS_SUBDIR),
  );
}

export function getNonUniversalAgents(): AgentConfig[] {
  return Object.values(agents).filter(
    (a) =>
      a.globalSkillsDir !== path.join(home, AGENTS_DIR, SKILLS_SUBDIR),
  );
}

export function isUniversalAgent(name: AgentType): boolean {
  const agent = agents[name];
  return (
    !!agent &&
    agent.globalSkillsDir === path.join(home, AGENTS_DIR, SKILLS_SUBDIR)
  );
}
