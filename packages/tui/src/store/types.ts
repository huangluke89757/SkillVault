import type { AgentType, SkillLockEntry, SourceType } from "../../../cli/src/types.js"

// ---------- View Names ----------

export type ViewName =
  | "home"
  | "servers"
  | "server-skills"
  | "add-server"
  | "edit-server"
  | "settings"
  | "detail"

// ---------- Enriched Skill ----------

export interface EnrichedSkill {
  name: string
  description: string
  filePath: string
  canonicalPath: string
  /** Which agents have this skill installed (by agent name) */
  agents: AgentType[]
  scope: "global" | "project" | "custom"
  projectName: string | null
  hasSupportingFiles: boolean
  supportingFiles: Array<{
    relativePath: string
    size: number
  }>
  /** Frontmatter metadata from the SKILL.md */
  metadata: Record<string, unknown>
  /** Lock file entry if tracked */
  lock?: SkillLockEntry
}

// ---------- Detected Agent ----------

export interface DetectedAgent {
  name: AgentType
  displayName: string
  skillCount: number
}

// ---------- Notification ----------

export interface Notification {
  type: "success" | "error" | "info"
  message: string
}

// ---------- Focus Pane ----------

export type FocusedPane = "agents" | "search" | "list"

// ---------- App State ----------

export interface AppState {
  activeView: ViewName
  previousView: ViewName | null

  // Agent detection
  detectedAgents: DetectedAgent[]

  // Installed skills (home view)
  selectedAgentFilter: string // agent name, "all", or "favorites"
  installedSkills: EnrichedSkill[]
  installedLoading: boolean
  installedFilter: string

  // Favorites (skill names)
  favorites: string[]

  // Detail
  selectedSkill: EnrichedSkill | null

  // Servers
  selectedServerId: string | null

  // UI state
  showHelp: boolean
  focusedPane: FocusedPane

  // Notification toast
  notification: Notification | null
}

// ---------- Actions ----------

export type Action =
  | { type: "NAVIGATE"; view: ViewName }
  | { type: "GO_BACK" }
  | { type: "SET_DETECTED_AGENTS"; agents: DetectedAgent[] }
  | { type: "UPDATE_AGENT_COUNTS"; counts: Record<string, number> }
  | { type: "SET_AGENT_FILTER"; filter: string }
  | { type: "SET_INSTALLED_SKILLS"; skills: EnrichedSkill[] }
  | { type: "SET_INSTALLED_LOADING"; loading: boolean }
  | { type: "SET_INSTALLED_FILTER"; filter: string }
  | { type: "SET_FAVORITES"; favorites: string[] }
  | { type: "SELECT_SKILL"; skill: EnrichedSkill }
  | { type: "PREVIEW_SKILL"; skill: EnrichedSkill }
  | { type: "CLEAR_SKILL" }
  | { type: "SHOW_NOTIFICATION"; notification: Notification }
  | { type: "CLEAR_NOTIFICATION" }
  | { type: "TOGGLE_HELP" }
  | { type: "SET_FOCUSED_PANE"; pane: FocusedPane }
  | { type: "CYCLE_FOCUS" }
  | { type: "REFRESH_SKILLS" }
  | { type: "SET_SELECTED_SERVER"; serverId: string | null }
