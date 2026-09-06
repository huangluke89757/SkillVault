import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export interface AgentEntry {
  name: string
  displayName: string
  shortCode: string
  globalSkillsDir: string
  additionalGlobalSkillsDirs?: string[]
  detectInstalled: () => Promise<boolean>
}

const home = os.homedir()
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config")
const copilotHome = process.env.COPILOT_HOME || path.join(home, ".copilot")
const openCodeHome = process.env.OPENCODE_CONFIG_DIR || path.join(configHome, "opencode")
const piAgentHome = process.env.PI_CODING_AGENT_DIR || path.join(home, ".pi", "agent")
const factoryHome = process.env.FACTORY_HOME || path.join(home, ".factory")
const ob1Home = process.env.OB1_HOME || path.join(home, ".ob1")
const kimiCodeHome = process.env.KIMI_CODE_HOME || path.join(home, ".kimi-code")
const dshHome = process.env.DSH_HOME || path.join(home, ".dsh")
const zedConfigHomes = [
  path.join(configHome, "zed"),
  ...(process.env.APPDATA ? [path.join(process.env.APPDATA, "Zed")] : []),
]

export async function dirExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

async function anyDirExists(paths: string[]): Promise<boolean> {
  return (await Promise.all(paths.map(dirExists))).some(Boolean)
}

async function commandExists(commandName: string): Promise<boolean> {
  const pathEntries = (process.env.PATH || "")
    .split(path.delimiter)
    .map((entry) => entry.replace(/^"|"$/g, ""))
    .filter(Boolean)
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""]

  for (const directory of pathEntries) {
    for (const extension of extensions) {
      try {
        if ((await fs.stat(path.join(directory, `${commandName}${extension}`))).isFile()) {
          return true
        }
      } catch {
        // 继续检查下一个 PATH 条目。
      }
    }
  }
  return false
}

export async function isGitHubCopilotInstalled(
  commandAvailable: (commandName: string) => Promise<boolean> = commandExists,
): Promise<boolean> {
  // ~/.copilot 也会被 IDE 集成创建，不能单独证明 Copilot CLI 已安装。
  return commandAvailable("copilot")
}

export function getAgentGlobalSkillDirectories(agent: AgentEntry): string[] {
  return Array.from(new Set([
    agent.globalSkillsDir,
    ...(agent.additionalGlobalSkillsDirs || []),
  ]))
}

export const agentRegistry: Record<string, AgentEntry> = {
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    shortCode: "CC",
    globalSkillsDir: path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude"),
      "skills",
    ),
    detectInstalled: () =>
      dirExists(process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude")),
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    shortCode: "CU",
    globalSkillsDir: path.join(home, ".cursor", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".cursor")),
  },
  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    shortCode: "GC",
    globalSkillsDir: path.join(copilotHome, "skills"),
    additionalGlobalSkillsDirs: [path.join(configHome, "github-copilot", "skills")],
    detectInstalled: isGitHubCopilotInstalled,
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    shortCode: "WS",
    globalSkillsDir: path.join(home, ".codeium", "windsurf", "skills"),
    additionalGlobalSkillsDirs: [path.join(home, ".windsurf", "skills")],
    detectInstalled: () => anyDirExists([
      path.join(home, ".codeium", "windsurf"),
      path.join(home, ".windsurf"),
    ]),
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    shortCode: "CL",
    globalSkillsDir: path.join(home, ".cline", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".cline")),
  },
  continue: {
    name: "continue",
    displayName: "Continue",
    shortCode: "CN",
    globalSkillsDir: path.join(home, ".continue", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".continue")),
  },
  "codex-cli": {
    name: "codex-cli",
    displayName: "Codex CLI",
    shortCode: "CX",
    globalSkillsDir: path.join(
      process.env.CODEX_HOME || path.join(home, ".codex"),
      "skills",
    ),
    detectInstalled: () =>
      dirExists(process.env.CODEX_HOME || path.join(home, ".codex")),
  },
  zcode: {
    name: "zcode",
    displayName: "ZCode",
    shortCode: "ZC",
    globalSkillsDir: path.join(home, ".zcode", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".zcode")),
  },
  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    shortCode: "GM",
    globalSkillsDir: path.join(home, ".gemini", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".gemini")),
  },
  "qwen-code": {
    name: "qwen-code",
    displayName: "Qwen Code",
    shortCode: "QN",
    globalSkillsDir: path.join(home, ".qwen", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".qwen")),
  },
  kiro: {
    name: "kiro",
    displayName: "Kiro",
    shortCode: "KI",
    globalSkillsDir: path.join(home, ".kiro", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".kiro")),
  },
  pi: {
    name: "pi",
    displayName: "Pi",
    shortCode: "PI",
    globalSkillsDir: path.join(piAgentHome, "skills"),
    detectInstalled: () => dirExists(piAgentHome),
  },
  codebuddy: {
    name: "codebuddy",
    displayName: "CodeBuddy",
    shortCode: "CB",
    globalSkillsDir: path.join(home, ".codebuddy", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".codebuddy")),
  },
  "minimax-code": {
    name: "minimax-code",
    displayName: "MiniMax Code",
    shortCode: "MM",
    globalSkillsDir: path.join(home, ".minimax", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".minimax")),
  },
  comate: {
    name: "comate",
    displayName: "Comate",
    shortCode: "CM",
    globalSkillsDir: path.join(home, ".comate", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".comate")),
  },
  lingma: {
    name: "lingma",
    displayName: "Lingma",
    shortCode: "LM",
    globalSkillsDir: path.join(home, ".lingma", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".lingma")),
  },
  codearts: {
    name: "codearts",
    displayName: "CodeArts",
    shortCode: "CA",
    globalSkillsDir: path.join(home, ".codeartsdoer", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".codeartsdoer")),
  },
  "hermes-agent": {
    name: "hermes-agent",
    displayName: "Hermes",
    shortCode: "HM",
    globalSkillsDir: path.join(home, ".hermes", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".hermes")),
  },
  astrbot: {
    name: "astrbot",
    displayName: "AstrBot",
    shortCode: "AS",
    globalSkillsDir: path.join(home, ".astrbot", "data", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".astrbot")),
  },
  workbuddy: {
    name: "workbuddy",
    displayName: "WorkBuddy",
    shortCode: "WB",
    globalSkillsDir: path.join(home, ".workbuddy", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".workbuddy")),
  },
  "kimi-code": {
    name: "kimi-code",
    displayName: "Kimi Code",
    shortCode: "KM",
    globalSkillsDir: path.join(kimiCodeHome, "skills"),
    detectInstalled: () => dirExists(kimiCodeHome),
  },
  "deepseek-harness": {
    name: "deepseek-harness",
    displayName: "DeepSeek Harness",
    shortCode: "DS",
    globalSkillsDir: path.join(dshHome, "skills"),
    detectInstalled: () => dirExists(dshHome),
  },
  qoderwork: {
    name: "qoderwork",
    displayName: "QoderWork",
    shortCode: "QW",
    globalSkillsDir: path.join(home, ".qoderwork", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".qoderwork")),
  },
  qoder: {
    name: "qoder",
    displayName: "Qoder CLI",
    shortCode: "QD",
    globalSkillsDir: path.join(home, ".qoder", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".qoder")),
  },
  "qoder-cn": {
    name: "qoder-cn",
    displayName: "Qoder CN",
    shortCode: "QC",
    globalSkillsDir: path.join(home, ".qoder-cn", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".qoder-cn")),
  },
  trae: {
    name: "trae",
    displayName: "TRAE",
    shortCode: "TR",
    globalSkillsDir: path.join(home, ".trae", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".trae")),
  },
  "trae-cn": {
    name: "trae-cn",
    displayName: "TRAE CN",
    shortCode: "TC",
    globalSkillsDir: path.join(home, ".trae-cn", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".trae-cn")),
  },
  "traecode-cli": {
    name: "traecode-cli",
    displayName: "TraeCode CLI",
    shortCode: "TL",
    globalSkillsDir: path.join(home, ".traecli", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".traecli")),
  },
  "droid-cli": {
    name: "droid-cli",
    displayName: "Droid CLI",
    shortCode: "DR",
    globalSkillsDir: path.join(factoryHome, "skills"),
    detectInstalled: () => dirExists(factoryHome),
  },
  "ob-1": {
    name: "ob-1",
    displayName: "OB-1",
    shortCode: "OB1",
    globalSkillsDir: path.join(ob1Home, "skills"),
    detectInstalled: () => dirExists(ob1Home),
  },
  amp: {
    name: "amp",
    displayName: "Amp",
    shortCode: "AM",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    additionalGlobalSkillsDirs: [path.join(home, ".amp", "skills")],
    detectInstalled: () => anyDirExists([
      path.join(configHome, "amp"),
      path.join(configHome, "agents"),
      path.join(home, ".amp"),
    ]),
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    shortCode: "GO",
    globalSkillsDir: path.join(configHome, "goose", "skills"),
    additionalGlobalSkillsDirs: [path.join(home, ".goose", "skills")],
    detectInstalled: () => anyDirExists([
      path.join(configHome, "goose"),
      path.join(home, ".goose"),
    ]),
  },
  junie: {
    name: "junie",
    displayName: "Junie",
    shortCode: "JU",
    globalSkillsDir: path.join(home, ".junie", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".junie")),
  },
  "kilo-code": {
    name: "kilo-code",
    displayName: "Kilo Code",
    shortCode: "KC",
    globalSkillsDir: path.join(home, ".kilo", "skills"),
    additionalGlobalSkillsDirs: [
      path.join(home, ".kilo-code", "skills"),
      path.join(home, ".kilocode", "skills"),
    ],
    detectInstalled: () => anyDirExists([
      path.join(home, ".kilo"),
      path.join(home, ".kilo-code"),
      path.join(home, ".kilocode"),
    ]),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    shortCode: "OC",
    globalSkillsDir: path.join(openCodeHome, "skills"),
    additionalGlobalSkillsDirs: [path.join(home, ".opencode", "skills")],
    detectInstalled: () => anyDirExists([
      openCodeHome,
      path.join(home, ".opencode"),
    ]),
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    shortCode: "OW",
    globalSkillsDir: path.join(home, ".openclaw", "skills"),
    additionalGlobalSkillsDirs: [
      path.join(home, ".clawdbot", "skills"),
      path.join(home, ".moltbot", "skills"),
    ],
    detectInstalled: async () =>
      (await dirExists(path.join(home, ".openclaw"))) ||
      (await dirExists(path.join(home, ".clawdbot"))) ||
      (await dirExists(path.join(home, ".moltbot"))),
  },
  "pear-ai": {
    name: "pear-ai",
    displayName: "Pear AI",
    shortCode: "PA",
    globalSkillsDir: path.join(home, ".pear-ai", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".pear-ai")),
  },
  "roo-code": {
    name: "roo-code",
    displayName: "Roo Code",
    shortCode: "RC",
    globalSkillsDir: path.join(home, ".roo", "skills"),
    additionalGlobalSkillsDirs: [path.join(home, ".roo-code", "skills")],
    detectInstalled: () => anyDirExists([
      path.join(home, ".roo"),
      path.join(home, ".roo-code"),
    ]),
  },
  zed: {
    name: "zed",
    displayName: "Zed",
    shortCode: "ZD",
    globalSkillsDir: path.join(home, ".agents", "skills"),
    additionalGlobalSkillsDirs: [path.join(configHome, "zed", "skills")],
    detectInstalled: () => anyDirExists(zedConfigHomes),
  },
  "mimo-code": {
    name: "mimo-code",
    displayName: "MiMo Code",
    shortCode: "MI",
    globalSkillsDir: path.join(configHome, "mimocode", "skills"),
    detectInstalled: () => dirExists(path.join(configHome, "mimocode")),
  },
  "iflow-cli": {
    name: "iflow-cli",
    displayName: "iFlow CLI",
    shortCode: "IF",
    globalSkillsDir: path.join(home, ".iflow", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".iflow")),
  },
  catpaw: {
    name: "catpaw",
    displayName: "CatPaw",
    shortCode: "CP",
    globalSkillsDir: path.join(home, ".catpaw", "skills"),
    detectInstalled: () => dirExists(path.join(home, ".catpaw")),
  },
  universal: {
    name: "universal",
    displayName: "通用 Skill 目录",
    shortCode: "UA",
    globalSkillsDir: path.join(home, ".agents", "skills"),
    detectInstalled: async () => true,
  },
}

// agentName 指向 agentRegistry 的 key，用于自定义扫描时把项目级 Skill
// 归属到对应的 Agent 生态；没有对应 Agent 的探针（如 .cursor/rules）留空。
// .agents/skills 归属 universal（agentskills.io 通用规范目录）。
export const PROJECT_PROBES = [
  { subpath: ".claude/skills", agentName: "claude-code" },
  { subpath: ".cursor/skills", agentName: "cursor" },
  { subpath: ".cursor/rules", agentName: null },
  { subpath: ".codex/skills", agentName: "codex-cli" },
  { subpath: ".zcode/skills", agentName: "zcode" },
  { subpath: ".gemini/skills", agentName: "gemini-cli" },
  { subpath: ".github/skills", agentName: "github-copilot" },
  { subpath: ".qwen/skills", agentName: "qwen-code" },
  { subpath: ".kiro/skills", agentName: "kiro" },
  { subpath: ".pi/skills", agentName: "pi" },
  { subpath: ".codebuddy/skills", agentName: "codebuddy" },
  { subpath: ".minimax/skills", agentName: "minimax-code" },
  { subpath: ".comate/skills", agentName: "comate" },
  { subpath: ".lingma/skills", agentName: "lingma" },
  { subpath: ".codeartsdoer/skills", agentName: "codearts" },
  { subpath: ".hermes/skills", agentName: "hermes-agent" },
  { subpath: "data/skills", agentName: "astrbot" },
  { subpath: ".windsurf/skills", agentName: "windsurf" },
  { subpath: ".continue/skills", agentName: "continue" },
  { subpath: ".cline/skills", agentName: "cline" },
  { subpath: ".amp/skills", agentName: "amp" },
  { subpath: ".opencode/skills", agentName: "opencode" },
  { subpath: ".goose/skills", agentName: "goose" },
  { subpath: ".junie/skills", agentName: "junie" },
  { subpath: ".kilo-code/skills", agentName: "kilo-code" },
  { subpath: ".kilo/skills", agentName: "kilo-code" },
  { subpath: ".kilocode/skills", agentName: "kilo-code" },
  { subpath: ".pear-ai/skills", agentName: "pear-ai" },
  { subpath: ".roo-code/skills", agentName: "roo-code" },
  { subpath: ".roo/skills", agentName: "roo-code" },
  { subpath: ".workbuddy/skills", agentName: "workbuddy" },
  { subpath: ".kimi-code/skills", agentName: "kimi-code" },
  { subpath: ".dsh/skills", agentName: "deepseek-harness" },
  { subpath: ".qoderwork/skills", agentName: "qoderwork" },
  { subpath: ".qoder/skills", agentName: "qoder" },
  { subpath: ".trae/skills", agentName: "trae" },
  { subpath: ".traecli/skills", agentName: "traecode-cli" },
  { subpath: ".zed/skills", agentName: "zed" },
  { subpath: ".mimocode/skills", agentName: "mimo-code" },
  { subpath: ".iflow/skills", agentName: "iflow-cli" },
  { subpath: ".catpaw/skills", agentName: "catpaw" },
  { subpath: ".agents/skills", agentName: "universal" },
]
