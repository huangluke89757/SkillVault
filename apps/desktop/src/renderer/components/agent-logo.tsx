import { memo } from "react"
import ampLogo from "../assets/agent-logos/color/amp.png"
import astrbotLogo from "../assets/agent-logos/color/astrbot.svg"
import claudeLogo from "../assets/agent-logos/color/claude-code.png"
import clineLogo from "../assets/agent-logos/color/cline.png"
import codeartsLogo from "../assets/agent-logos/color/codearts.svg"
import codebuddyLogo from "../assets/agent-logos/color/codebuddy.svg"
import codexLogo from "../assets/agent-logos/color/codex-cli.png"
import comateLogo from "../assets/agent-logos/color/comate.svg"
import continueLogo from "../assets/agent-logos/color/continue.png"
import copilotLogo from "../assets/agent-logos/color/github-copilot.png"
import cursorLogo from "../assets/agent-logos/color/cursor.png"
import deepseekLogo from "../assets/agent-logos/color/deepseek-harness.png"
import droidCliLogo from "../assets/agent-logos/color/droid-cli.png"
import gooseLogo from "../assets/agent-logos/color/goose.png"
import geminiCliLogo from "../assets/agent-logos/color/gemini-cli.svg"
import hermesLogo from "../assets/agent-logos/color/hermes-agent.svg"
import junieLogo from "../assets/agent-logos/color/junie.png"
import kiroLogo from "../assets/agent-logos/color/kiro.svg"
import kiloCodeLogo from "../assets/agent-logos/color/kilo-code.png"
import kimiLogo from "../assets/agent-logos/color/kimi-code.png"
import lingmaLogo from "../assets/agent-logos/color/lingma.svg"
import minimaxLogo from "../assets/agent-logos/color/minimax-code.svg"
import ob1Logo from "../assets/agent-logos/color/ob-1.png"
import openclawLogo from "../assets/agent-logos/color/openclaw.png"
import opencodeLogo from "../assets/agent-logos/color/opencode.png"
import pearAiLogo from "../assets/agent-logos/color/pear-ai.png"
import piLogo from "../assets/agent-logos/color/pi.svg"
import qoderLogo from "../assets/agent-logos/color/qoder.png"
import qoderWorkLogo from "../assets/agent-logos/color/qoderwork.png"
import qwenCodeLogo from "../assets/agent-logos/color/qwen-code.svg"
import rooCodeLogo from "../assets/agent-logos/color/roo-code.png"
import traeLogo from "../assets/agent-logos/color/trae.png"
import windsurfLogo from "../assets/agent-logos/color/windsurf.png"
import workbuddyLogo from "../assets/agent-logos/color/workbuddy.png"
import zcodeLogo from "../assets/agent-logos/color/zcode.svg"
import zedLogo from "../assets/agent-logos/color/zed.png"
import mimoCodeLogo from "../assets/agent-logos/color/mimo-code.png"
import iflowCliLogo from "../assets/agent-logos/color/iflow-cli.png"
import catpawLogo from "../assets/agent-logos/color/catpaw.png"
import universalLogo from "../assets/agent-logos/universal.svg"
import skillvaultMark from "../assets/skillvault-mark.svg"

const AGENT_LOGOS: Record<string, string> = {
  astrbot: astrbotLogo,
  "claude-code": claudeLogo,
  cursor: cursorLogo,
  "github-copilot": copilotLogo,
  windsurf: windsurfLogo,
  cline: clineLogo,
  continue: continueLogo,
  "codex-cli": codexLogo,
  codearts: codeartsLogo,
  codebuddy: codebuddyLogo,
  comate: comateLogo,
  "gemini-cli": geminiCliLogo,
  "hermes-agent": hermesLogo,
  kiro: kiroLogo,
  lingma: lingmaLogo,
  "minimax-code": minimaxLogo,
  pi: piLogo,
  "qwen-code": qwenCodeLogo,
  zcode: zcodeLogo,
  workbuddy: workbuddyLogo,
  "kimi-code": kimiLogo,
  "deepseek-harness": deepseekLogo,
  qoderwork: qoderWorkLogo,
  qoder: qoderLogo,
  "qoder-cn": qoderLogo,
  trae: traeLogo,
  "trae-cn": traeLogo,
  "traecode-cli": traeLogo,
  "droid-cli": droidCliLogo,
  "ob-1": ob1Logo,
  amp: ampLogo,
  goose: gooseLogo,
  junie: junieLogo,
  "kilo-code": kiloCodeLogo,
  opencode: opencodeLogo,
  openclaw: openclawLogo,
  "pear-ai": pearAiLogo,
  "roo-code": rooCodeLogo,
  zed: zedLogo,
  "mimo-code": mimoCodeLogo,
  "iflow-cli": iflowCliLogo,
  catpaw: catpawLogo,
  universal: universalLogo,
}

const DISPLAY_NAME_TO_KEY: Record<string, string> = {
  AstrBot: "astrbot",
  "Claude Code": "claude-code",
  Cursor: "cursor",
  "GitHub Copilot": "github-copilot",
  Windsurf: "windsurf",
  Cline: "cline",
  Continue: "continue",
  "Codex CLI": "codex-cli",
  CodeArts: "codearts",
  CodeBuddy: "codebuddy",
  Comate: "comate",
  "Gemini CLI": "gemini-cli",
  Hermes: "hermes-agent",
  Kiro: "kiro",
  Lingma: "lingma",
  "MiniMax Code": "minimax-code",
  Pi: "pi",
  "Qwen Code": "qwen-code",
  ZCode: "zcode",
  WorkBuddy: "workbuddy",
  "Kimi Code": "kimi-code",
  "DeepSeek Harness": "deepseek-harness",
  QoderWork: "qoderwork",
  "Qoder CLI": "qoder",
  "Qoder CN": "qoder-cn",
  "Droid CLI": "droid-cli",
  "OB-1": "ob-1",
  Amp: "amp",
  Goose: "goose",
  Junie: "junie",
  "Kilo Code": "kilo-code",
  OpenCode: "opencode",
  OpenClaw: "openclaw",
  "Pear AI": "pear-ai",
  "Roo Code": "roo-code",
  TRAE: "trae",
  "TRAE CN": "trae-cn",
  "TraeCode CLI": "traecode-cli",
  Zed: "zed",
  "MiMo Code": "mimo-code",
  "iFlow CLI": "iflow-cli",
  CatPaw: "catpaw",
  "Universal (.agents/skills)": "universal",
  "通用 Skill 目录": "universal",
}

function getAgentKey(nameOrDisplayName: string): string {
  return (
    DISPLAY_NAME_TO_KEY[nameOrDisplayName] ||
    nameOrDisplayName.toLowerCase().replace(/\s+/g, "-")
  )
}

interface AgentLogoProps {
  name: string
  size?: number
  shortCode?: string
  className?: string
}

export const AgentLogo = memo(function AgentLogo({ name, size = 16, className = "" }: AgentLogoProps) {
  const key = getAgentKey(name)
  const logo = AGENT_LOGOS[key]

  return (
    <span
      title={name}
      className={`agent-logo inline-flex flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logo || skillvaultMark}
        alt={name}
        width={size}
        height={size}
        className={logo ? "agent-logo__image" : "agent-logo__image agent-logo__image--fallback"}
        draggable={false}
      />
    </span>
  )
})

export const AgentLogoRow = memo(function AgentLogoRow({ agents, size = 14 }: { agents: string[]; size?: number }) {
  return (
    <span className="agent-logo-row" title={agents.join("、")}>
      {Array.from(new Set(agents)).map((agent) => (
        <AgentLogo key={agent} name={agent} size={size} />
      ))}
    </span>
  )
})
