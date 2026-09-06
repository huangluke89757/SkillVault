import {
  useDeferredValue,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react"
import { List } from "react-window"
import { marked } from "marked"
import { electronAPI } from "../lib/electron-api"
import { normalizeInstalledSkills } from "../lib/installed-skill-normalize"
import {
  getAdaptedAgentNames,
  getAgentFilterNames,
  getSkillListAgentNames,
} from "../lib/skill-agent-bindings"
import { useLocalization } from "../lib/localization"
import { SkillEditor, type SkillEditorHandle } from "../components/skill-editor"
import { AgentLogo, AgentLogoRow } from "../components/agent-logo"
import { SidebarUtilities, SkillVaultBrand } from "../components/skillvault-brand"
import { ScanSourcesDialog } from "./scan-sources"
import skillvaultMark from "../assets/skillvault-mark.svg"

// Map display names to registry keys
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

// Keyword-based category for the list's category capsule. SKILL.md has no
// standard category field, so we classify from name + description. Rules are
// ordered: the first match wins, so specific domains come before broad ones.
// Each category carries a muted Morandi accent color (readable on the
// ink-blue theme in both light and dark mode) and a chunky solid icon (24 viewBox).
const SKILL_CATEGORY_RULES: Array<{ label: string; color: string; icon: string; pattern: RegExp }> = [
  { label: "视频", color: "#B0716E", icon: "M8 5v14l11-7z", pattern: /video|字幕|视频|剪辑|ffmpeg|remotion|youtube/i },
  { label: "音频", color: "#B08A68", icon: "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z", pattern: /\btts\b|audio|voice|speech|music|transcri|音频|语音/i },
  { label: "图像", color: "#9A9273", icon: "M21 19V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z", pattern: /image|img|photo|图片|图像|icon|screenshot/i },
  { label: "设计", color: "#8C7B9C", icon: "M12 2l7 7-7 13L5 9l7-7z", pattern: /design|frontend|\bui\b|css|theme|视觉|设计/i },
  { label: "安全", color: "#5F8373", icon: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z", pattern: /secur|guard|vuln|audit|安全|审计/i },
  { label: "文档", color: "#7288A3", icon: "M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z", pattern: /\bpdf\b|xlsx|excel|spreadsheet|\bdoc|slide|ppt|markdown|表格|文档/i },
  { label: "社媒", color: "#6E9494", icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z", pattern: /social|twitter|reddit|小红书|抖音|社媒|营销/i },
  { label: "写作", color: "#A5798A", icon: "M4 20l1.2-4.2L16.5 4.5a2.1 2.1 0 0 1 3 3L8.2 18.8 4 20z", pattern: /writ|humaniz|文案|写作|copy(edit|writ)/i },
  { label: "开发", color: "#7A7DA0", icon: "M3 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3zm4.3 4.7L6 12l1.3 3.3 1.4-.6L7.8 12l.9-2.7-1.4-.6zM11 15h6v1.5h-6V15z", pattern: /code|github|\bgit\b|\bapi\b|debug|test|refactor|explain|开发/i },
  { label: "数据", color: "#85946F", icon: "M4 20V10h3v10H4zm6.5 0V4h3v16h-3zM17 20v-7h3v7h-3z", pattern: /data|\bcsv\b|\bsql\b|analy|数据/i },
]

const DEFAULT_CATEGORY = {
  label: "通用",
  color: "#8B8B85",
  icon: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
}

function categorizeSkill(
  name: string,
  description: string,
): { label: string; color: string; icon: string } {
  const haystack = `${name}\n${description}`
  for (const rule of SKILL_CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) {
      return { label: rule.label, color: rule.color, icon: rule.icon }
    }
  }
  return DEFAULT_CATEGORY
}

function StarIcon({
  size = 14,
  filled = false,
}: {
  size?: number
  filled?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function SkillVaultIcon() {
  return <img src={skillvaultMark} alt="" width="48" height="48" className="opacity-50" />
}

function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (!sourceType) return null
  const label =
    sourceType === "github"
      ? "github"
      : sourceType === "skillvault"
        ? "skillvault"
        : "local"
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-muted border border-border">
      {label}
    </span>
  )
}

// Configure marked for synchronous rendering
marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
})

function sanitizeHtml(html: string): string {
  let clean = html.replace(
    /<(script|iframe|object|embed|form|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
    ""
  )
  clean = clean.replace(/<(script|iframe|object|embed|link)\b[^>]*\/?>/gi, "")
  clean = clean.replace(
    /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ""
  )
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
  clean = clean.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="')
  clean = clean.replace(/data\s*=\s*["']?\s*javascript:/gi, 'data="')
  return clean
}

function renderMarkdown(raw: string): string {
  // Strip frontmatter before rendering
  let content = raw
  if (content.startsWith("---")) {
    const endIdx = content.indexOf("---", 3)
    if (endIdx !== -1) {
      content = content.slice(endIdx + 3).trim()
    }
  }
  return sanitizeHtml(marked.parse(content) as string)
}

const MemoizedMarkdown = memo(function MemoizedMarkdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content])
  return <div className="skill-prose" dangerouslySetInnerHTML={{ __html: html }} />
})

interface DragSkillPayload {
  name: string
  canonicalPath: string
}

interface DragToast {
  type: "success" | "error"
  message: string
}

function createSkillRemovalRequest(skill: InstalledSkill): SkillRemovalRequest {
  return {
    name: skill.name,
    targets: skill.locations.map((location) => ({
      path: location.path,
      canonicalPath: location.canonicalPath,
      scope: location.scope,
      projectName: location.projectName,
    })),
  }
}

type SkillScopeFilter = "all" | "global" | "project" | "custom"

// --------------------------------------------------------------------------
// Left Sidebar Panel
// --------------------------------------------------------------------------

interface LeftSidebarProps {
  totalSkillCount: number
  favoritesCount: number
  detectedAgents: DetectedAgent[]
  agentSkillCounts: Record<string, number>
  selectedAgent: string | null
  onSelectAgent: (agent: string | null) => void
  activeFilter: "all" | "favorites"
  onFilterChange: (filter: "all" | "favorites") => void
  collections: Record<string, string[]>
  collectionCounts: Record<string, number>
  selectedCollection: string | null
  onSelectCollection: (collection: string | null) => void
  onCreateCollection: () => void
  onRenameCollection: (name: string) => void
  onDeleteCollection: (name: string) => void
  dragSkill: DragSkillPayload | null
  dragOverTarget: string | null
  onDragEnterTarget: (target: string | null) => void
  onDropOnAgent: (agentDisplayName: string) => void
  onDropOnCollection: (collectionName: string) => void
}

function LeftSidebar({
  totalSkillCount,
  favoritesCount,
  detectedAgents,
  agentSkillCounts,
  selectedAgent,
  onSelectAgent,
  activeFilter,
  onFilterChange,
  collections,
  collectionCounts,
  selectedCollection,
  onSelectCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  dragSkill,
  dragOverTarget,
  onDragEnterTarget,
  onDropOnAgent,
  onDropOnCollection,
}: LeftSidebarProps) {
  return (
    <aside className="skillvault-sidebar">
      <div className="skillvault-sidebar__scroll">
        <SkillVaultBrand />

        <section className="skillvault-nav-section">
          <h3>Library</h3>
          <nav className="flex flex-col gap-1">
          <button
            onClick={() => {
              onFilterChange("all")
              onSelectAgent(null)
            }}
            className={`skillvault-library-button ${
              activeFilter === "all" && selectedAgent === null
                ? "is-active"
                : ""
            }`}
          >
            <span className="flex items-center gap-2"><span aria-hidden>⌘</span> All Skills</span>
            <strong>{totalSkillCount}</strong>
          </button>
          <button
            onClick={() => onFilterChange("favorites")}
            className={`skillvault-secondary-button ${activeFilter === "favorites" ? "is-active" : ""}`}
          >
            <span className="flex items-center gap-2"><StarIcon size={12} /> Favorites</span>
            <span>{favoritesCount}</span>
          </button>
        </nav>
        </section>

      {detectedAgents.length > 0 && (
        <section className="skillvault-nav-section skillvault-agent-section">
          <h3>Agents <span>点击筛选已适配 Skill</span></h3>
          <nav className="flex flex-col gap-1.5">
            {detectedAgents.map((agent) => (
              <button
                key={agent.name}
                onClick={() => {
                  onFilterChange("all")
                  onSelectAgent(
                    selectedAgent === agent.displayName
                      ? null
                      : agent.displayName,
                  )
                }}
                className={`skillvault-agent-button ${
                  selectedAgent === agent.displayName
                    ? "is-active"
                    : dragOverTarget === `agent:${agent.displayName}`
                      ? "is-drop-target"
                    : ""
                }`}
                onDragOver={(e) => {
                  if (!dragSkill) return
                  e.preventDefault()
                  onDragEnterTarget(`agent:${agent.displayName}`)
                }}
                onDragLeave={() => {
                  if (dragOverTarget === `agent:${agent.displayName}`) onDragEnterTarget(null)
                }}
                onDrop={(e) => {
                  if (!dragSkill) return
                  e.preventDefault()
                  onDropOnAgent(agent.displayName)
                }}
              >
                <AgentLogo name={agent.displayName} shortCode={agent.shortCode} size={25} />
                <span data-no-localize className="truncate">{agent.displayName}</span>
                <span className={`skillvault-agent-count ${
                  (agentSkillCounts[agent.displayName] || 0) === 0 ? "is-empty" : ""
                }`}>
                  {agentSkillCounts[agent.displayName] || 0}
                </span>
              </button>
            ))}
          </nav>
        </section>
      )}

      <section className="skillvault-nav-section">
        <div className="flex items-center justify-between mb-2">
          <h3>Collections</h3>
          <button
            onClick={onCreateCollection}
            className="skillvault-inline-action"
            title="Create collection"
          >
            + 新建
          </button>
        </div>
        <nav className="flex flex-col gap-0.5">
          {Object.keys(collections).length === 0 ? (
            <p className="text-[12px] text-muted px-1">暂无合集</p>
          ) : (
            Object.keys(collections)
              .sort()
              .map((name) => (
                <div key={name} className="group flex items-center gap-1">
                  <button
                    onClick={() => {
                      onFilterChange("all")
                      onSelectAgent(null)
                      onSelectCollection(selectedCollection === name ? null : name)
                    }}
                    className={`flex flex-1 items-center justify-between px-2 py-1.5 rounded-md text-[12px] tracking-wide font-medium transition-colors text-left ${
                      selectedCollection === name
                        ? "bg-surface-hover text-foreground"
                        : dragOverTarget === `collection:${name}`
                          ? "bg-surface-hover/70 ring-1 ring-accent shadow-[0_0_0_1px_rgba(255,255,255,0.06)] text-foreground scale-[1.01]"
                          : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                    onDragOver={(e) => {
                      if (!dragSkill) return
                      e.preventDefault()
                      onDragEnterTarget(`collection:${name}`)
                    }}
                    onDragLeave={() => {
                      if (dragOverTarget === `collection:${name}`) onDragEnterTarget(null)
                    }}
                    onDrop={(e) => {
                      if (!dragSkill) return
                      e.preventDefault()
                      onDropOnCollection(name)
                    }}
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[11px] font-mono">{collectionCounts[name] || 0}</span>
                  </button>
                  <button
                    onClick={() => onRenameCollection(name)}
                    className="hidden group-hover:inline text-[11px] text-muted hover:text-foreground"
                    title="Rename collection"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDeleteCollection(name)}
                    className="hidden group-hover:inline text-[11px] text-muted hover:text-red-400"
                    title="Delete collection"
                  >
                    ×
                  </button>
                </div>
              ))
          )}
        </nav>
      </section>
      </div>

      <div className="skillvault-market-area">
        <p>Utilities</p>
        <SidebarUtilities />
      </div>
    </aside>
  )
}

const MemoizedLeftSidebar = memo(LeftSidebar)

// --------------------------------------------------------------------------
// Virtualized Skill List Row
// --------------------------------------------------------------------------

interface SkillRowProps {
  index: number
  style: React.CSSProperties
  skills: InstalledSkill[]
  multiSelected: Set<string>
  isMultiSelectActive: boolean
  selectedSkillPath: string | null
  dragSkill: DragSkillPayload | null
  favorites: Set<string>
  onSelectSkill: (skill: InstalledSkill) => void
  onMultiSelectToggle: (skill: InstalledSkill, e: React.MouseEvent) => void
  onToggleFavorite: (skill: InstalledSkill, e: React.MouseEvent) => void
  onDragSkillStart: (skill: InstalledSkill) => void
  onDragSkillEnd: () => void
}

const SkillListRow = memo(function SkillListRow({
  index,
  style,
  skills,
  multiSelected,
  isMultiSelectActive,
  selectedSkillPath,
  dragSkill,
  favorites,
  onSelectSkill,
  onMultiSelectToggle,
  onToggleFavorite,
  onDragSkillStart,
  onDragSkillEnd,
}: SkillRowProps) {
  const skill = skills[index]
  if (!skill) return null
  const isMultiChecked = multiSelected.has(skill.canonicalPath)
  const isFavorited = favorites.has(skill.name)
  const category = categorizeSkill(skill.name, skill.description)

  return (
    <div style={style} className="px-0.5">
      <button
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) {
            onMultiSelectToggle(skill, e)
          } else {
            onSelectSkill(skill)
          }
        }}
        draggable={!isMultiSelectActive}
        onDragStart={(e) => {
          if (isMultiSelectActive) {
            e.preventDefault()
            return
          }
          e.dataTransfer.effectAllowed = "move"
          onDragSkillStart(skill)
        }}
        onDragEnd={() => onDragSkillEnd()}
        className={`skillvault-skill-row ${
          isMultiChecked
            ? "bg-accent/10 text-foreground ring-1 ring-accent/30"
            : selectedSkillPath === skill.canonicalPath && !isMultiSelectActive
              ? "bg-surface-hover text-foreground"
              : dragSkill?.canonicalPath === skill.canonicalPath
                ? "opacity-60 ring-1 ring-accent/40"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
        }`}
      >
        <span className="skillvault-skill-primary">
          {isMultiSelectActive && (
            <span
              role="checkbox"
              tabIndex={0}
              aria-label={`选择 ${skill.name}`}
              aria-checked={isMultiChecked}
              onClick={(event) => {
                event.stopPropagation()
                onMultiSelectToggle(skill, event)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  event.stopPropagation()
                  onMultiSelectToggle(skill, event as unknown as React.MouseEvent)
                }
              }}
              className={`skillvault-row-checkbox inline-flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                isMultiChecked
                  ? "bg-accent border-accent text-white"
                  : "border-border bg-surface"
              }`}
            >
              {isMultiChecked && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
          )}
          <span data-no-localize className="skillvault-skill-name">
            {skill.name}
          </span>
        </span>
        <span
          title={skill.projectNames.length > 0 ? skill.projectNames.join("、") : undefined}
          className={`skillvault-scope-badge rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
            skill.scope === "global"
              ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
              : skill.scope === "project"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-border bg-surface text-muted"
          }`}
        >
          {skill.scope === "global" ? "Global" : skill.scope === "project" ? "Project" : "Custom"}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorited}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => onToggleFavorite(skill, e)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onToggleFavorite(skill, e as unknown as React.MouseEvent)
            }
          }}
          className={`skillvault-favorite-button inline-flex items-center justify-center w-5 h-5 rounded transition-colors cursor-pointer ${
            isFavorited
              ? "text-amber-400 hover:text-amber-300"
              : "text-muted hover:text-foreground"
          }`}
        >
          <StarIcon size={13} filled={isFavorited} />
        </span>
        <span className="skillvault-row-agents">
          <AgentLogoRow agents={getSkillListAgentNames(skill)} size={17} />
        </span>
        <span className="skillvault-category-badge">
          <span className="cat-icon" style={{ color: category.color }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d={category.icon} />
            </svg>
          </span>
          {category.label}
        </span>
        <span
          data-no-localize
          title={skill.description || "暂无简介"}
          className="skillvault-skill-description"
        >
          {skill.description || "暂无简介"}
        </span>
      </button>
    </div>
  )
})

// --------------------------------------------------------------------------
// Middle Skill List Panel
// --------------------------------------------------------------------------

interface MiddlePanelProps {
  loading: boolean
  agents: DetectedAgent[]
  skills: InstalledSkill[]
  filteredSkills: InstalledSkill[]
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedSkillPath: string | null
  onSelectSkill: (skill: InstalledSkill) => void
  selectedAgent: string | null
  selectedCollection: string | null
  activeFilter: "all" | "favorites"
  scopeFilter: SkillScopeFilter
  scopeCounts: Record<SkillScopeFilter, number>
  onScopeFilterChange: (scope: SkillScopeFilter) => void
  projectNames: string[]
  selectedProject: string | null
  onProjectChange: (project: string | null) => void
  onClearFilters: () => void
  onCreateSkill: () => void
  onImportPackage: () => void
  onExportPackage: () => void
  onRefresh: () => Promise<void>
  onOpenScanSources: () => void
  refreshing: boolean
  migrationBusy: "import" | "export" | null
  dragSkill: DragSkillPayload | null
  onDragSkillStart: (skill: InstalledSkill) => void
  onDragSkillEnd: () => void
  multiSelected: Set<string>
  selectionMode: boolean
  onToggleSelectionMode: () => void
  onMultiSelectToggle: (skill: InstalledSkill, e: React.MouseEvent) => void
  onMultiSelectAll: () => void
  onMultiSelectClear: () => void
  favorites: Set<string>
  onToggleFavorite: (skill: InstalledSkill, e: React.MouseEvent) => void
  collections: Record<string, string[]>
  onBulkAddToCollection: (collectionName: string) => void
  onBulkCreateCollection: () => void
  onBulkFavorite: () => Promise<void>
  onBulkAdaptToAgent: (agent: DetectedAgent) => Promise<void>
  bulkAgentBusy: string | null
  onBulkDelete: () => void
  listRef: React.RefObject<HTMLDivElement | null>
}

function MiddlePanel({
  loading,
  agents,
  skills,
  filteredSkills,
  searchQuery,
  onSearchChange,
  selectedSkillPath,
  onSelectSkill,
  selectedAgent,
  selectedCollection,
  activeFilter,
  scopeFilter,
  scopeCounts,
  onScopeFilterChange,
  projectNames,
  selectedProject,
  onProjectChange,
  onClearFilters,
  onCreateSkill,
  onImportPackage,
  onExportPackage,
  onRefresh,
  onOpenScanSources,
  refreshing,
  migrationBusy,
  dragSkill,
  onDragSkillStart,
  onDragSkillEnd,
  multiSelected,
  selectionMode,
  onToggleSelectionMode,
  onMultiSelectToggle,
  onMultiSelectAll,
  onMultiSelectClear,
  favorites,
  onToggleFavorite,
  collections,
  onBulkAddToCollection,
  onBulkCreateCollection,
  onBulkFavorite,
  onBulkAdaptToAgent,
  bulkAgentBusy,
  onBulkDelete,
  listRef,
}: MiddlePanelProps) {
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false)
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const collectionDropdownRef = useRef<HTMLDivElement>(null)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  // 复选框仅在显式选择模式中显示。
  const isMultiSelectActive = selectionMode
  const hasSelection = multiSelected.size > 0
  const selectedSkills = useMemo(
    () => skills.filter((skill) => multiSelected.has(skill.canonicalPath)),
    [multiSelected, skills],
  )
  const allSelectedFavorited = selectedSkills.length > 0 && selectedSkills.every(
    (skill) => favorites.has(skill.name),
  )
  const rowProps = useMemo(
    () => ({
      skills: filteredSkills,
      multiSelected,
      isMultiSelectActive,
      selectedSkillPath,
      dragSkill,
      favorites,
      onSelectSkill,
      onMultiSelectToggle,
      onToggleFavorite,
      onDragSkillStart,
      onDragSkillEnd,
    }),
    [
      filteredSkills,
      multiSelected,
      isMultiSelectActive,
      selectedSkillPath,
      dragSkill,
      favorites,
      onSelectSkill,
      onMultiSelectToggle,
      onToggleFavorite,
      onDragSkillStart,
      onDragSkillEnd,
    ],
  )

  // Close bulk-action dropdowns when clicking outside
  useEffect(() => {
    if (!showCollectionDropdown && !showAgentDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (
        showCollectionDropdown &&
        collectionDropdownRef.current &&
        !collectionDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCollectionDropdown(false)
      }
      if (
        showAgentDropdown &&
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAgentDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showAgentDropdown, showCollectionDropdown])

  const viewTitle = selectedAgent || selectedCollection || (activeFilter === "favorites" ? "Favorites" : "All Skills")
  // Unique agents that actually carry skills, deduped by registry key. The
  // universal ~/.agents/skills directory is a shared folder, not an agent,
  // so it is excluded. Sorted by skill count so the avatar stack leads
  // with the most relevant agents.
  const skillAgentKeys = useMemo(() => {
    const counts = new Map<string, number>()
    for (const skill of skills) {
      const keys = new Set(getAgentFilterNames(skill).map((name) => DISPLAY_NAME_TO_KEY[name] ?? name))
      keys.delete("universal")
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key)
  }, [skills])
  const agentCount = skillAgentKeys.length
  // Show at most this many agent avatars; the rest collapse into a "+N" bubble.
  const AGENT_AVATAR_LIMIT = 5

  return (
    <div className="skillvault-library-panel">
      {/* Search input */}
      <div className="skillvault-library-header">
        <div className="skillvault-library-title-row">
          <div>
            <h1 data-no-localize>{viewTitle}</h1>
            <p>{skills.length} 个本地 Skill · 跨 {agentCount} 个 Agent</p>
          </div>
          <div className="skillvault-library-stats">
            <span><strong>{scopeCounts.global}</strong> 全局</span>
            <span><strong>{scopeCounts.project}</strong> 项目</span>
            <span><strong>{scopeCounts.custom}</strong> 自定义</span>
            <span
              className="skillvault-library-stats-agents"
              title={skillAgentKeys
                .map((key) => agents.find((agent) => agent.name === key)?.displayName ?? key)
                .join("、")}
            >
              <span className="skillvault-library-stats-agents__avatars">
                {skillAgentKeys.slice(0, AGENT_AVATAR_LIMIT).map((key) => (
                  <AgentLogo key={key} name={key} size={24} />
                ))}
                {agentCount > AGENT_AVATAR_LIMIT && (
                  <span className="skillvault-library-stats-agents__more">
                    +{agentCount - AGENT_AVATAR_LIMIT}
                  </span>
                )}
              </span>
              {agentCount} Agents
            </span>
          </div>
          <div className="skillvault-header-actions">
            <button
              onClick={() => void onImportPackage()}
              disabled={migrationBusy !== null}
              className="skillvault-header-action"
              title="从 SkillVault 迁移包恢复本地 Skill"
            >
              <span aria-hidden>↓</span>
              {migrationBusy === "import" ? "导入中" : "导入"}
            </button>
            <button
              onClick={() => void onExportPackage()}
              disabled={migrationBusy !== null || skills.length === 0}
              className="skillvault-header-action"
              title={hasSelection ? `导出选中的 ${multiSelected.size} 个 Skill` : "导出全部本地 Skill"}
            >
              <span aria-hidden>↑</span>
              {migrationBusy === "export"
                ? "导出中"
                : hasSelection
                  ? `导出所选 ${multiSelected.size}`
                  : "导出"}
            </button>
            <button
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="skillvault-header-action"
              title="重新扫描所有本地 Skill"
            >
              <span aria-hidden className={refreshing ? "skillvault-refresh-icon is-spinning" : "skillvault-refresh-icon"}>↻</span>
              {refreshing ? "扫描中" : "刷新"}
            </button>
            <button onClick={onOpenScanSources} className="skillvault-header-action" title="添加或管理额外目录">
              添加目录
            </button>
            <button
              onClick={onCreateSkill}
              className="skillvault-new-skill"
            >
              + New Skill
            </button>
          </div>
        </div>
        <div className="skillvault-library-tools">
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface p-1">
          {([
            ["all", "All scopes"],
            ["global", "Global"],
            ["project", "Project"],
            ["custom", "Custom"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onScopeFilterChange(value)}
              className={`rounded-md px-1.5 py-1.5 text-[11px] transition-colors ${
                scopeFilter === value
                  ? "bg-surface-hover text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span>{label}</span>
              <span className="ml-1 font-mono opacity-70">{scopeCounts[value]}</span>
            </button>
          ))}
        </div>
        {scopeFilter === "project" && projectNames.length > 0 && (
          <select
            value={selectedProject ?? ""}
            onChange={(event) => onProjectChange(event.target.value || null)}
            className="w-full max-w-48 rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">All projects</option>
            {projectNames.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        )}
        <div className="relative flex-1 min-w-40">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 rounded-md bg-surface border border-border text-[12px] text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted hover:text-foreground transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Results count and select all toggle */}
      <div className="skillvault-list-meta">
        <span className="text-[11px] uppercase tracking-widest text-muted">
          {loading
            ? "Scanning..."
            : `${filteredSkills.length} skill${filteredSkills.length !== 1 ? "s" : ""}${selectedAgent ? ` in ${selectedAgent}` : ""}${selectedCollection ? ` in ${selectedCollection}` : ""}`}
        </span>
        {!loading && filteredSkills.length > 0 && (
          <div className="flex items-center gap-3">
            {selectionMode && (
              <button
                onClick={hasSelection ? onMultiSelectClear : onMultiSelectAll}
                className="text-[11px] text-muted hover:text-foreground transition-colors"
              >
                {hasSelection ? "取消全选" : "全选"}
              </button>
            )}
            <button
              onClick={onToggleSelectionMode}
              className={`text-[11px] transition-colors ${
                selectionMode ? "text-accent hover:text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {selectionMode ? "完成" : "选择"}
            </button>
          </div>
        )}
      </div>

      <div className="skillvault-table-head" aria-hidden="true">
        <span>Skill</span><span>Scope</span><span /><span>Agents</span><span>类别</span><span>简介</span>
      </div>

      {/* Scrollable skill list */}
      <div className={`flex-1 min-h-0 flex flex-col px-2 ${hasSelection ? "pb-14" : "pb-2"}`} ref={listRef} tabIndex={-1}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[12px] text-muted animate-fade-in">
              Scanning for installed skills...
            </p>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            {skills.length === 0 ? (
              <>
                <SkillVaultIcon />
                <p className="text-muted text-[12px] mt-3">
                  No skills installed yet.
                </p>
                <p className="text-muted text-[12px] mt-1">
                  Create your first skill or import a .skillvault package.
                </p>
              </>
            ) : activeFilter === "favorites" ? (
              <>
                <p className="text-muted text-[12px]">No favorites yet.</p>
                <p className="text-muted text-[12px] mt-1">
                  Click the star on any skill to save it here.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted text-[12px]">
                  No skills match your search.
                </p>
                <button
                  onClick={onClearFilters}
                  className="text-accent text-[12px] mt-2 hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <List
            rowCount={filteredSkills.length}
            rowHeight={42}
            rowComponent={SkillListRow}
            rowProps={rowProps}
            overscanCount={10}
          />
        )}
      </div>

      {/* Floating action bar when skills are multi-selected */}
      {selectionMode && hasSelection && (
        <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-3 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-foreground font-medium whitespace-nowrap">
              {multiSelected.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={() => void onBulkFavorite()}
              disabled={allSelectedFavorited}
              className="skillvault-bulk-action"
              title={allSelectedFavorited ? "所选 Skill 已全部收藏" : "将所选 Skill 加入收藏"}
            >
              <StarIcon size={12} filled={allSelectedFavorited} />
              <span>{allSelectedFavorited ? "已收藏" : "收藏"}</span>
            </button>
            {/* Adapt to Agent */}
            <div className="relative" ref={agentDropdownRef}>
              <button
                onClick={() => {
                  setShowAgentDropdown(!showAgentDropdown)
                  setShowCollectionDropdown(false)
                }}
                disabled={bulkAgentBusy !== null}
                className="skillvault-bulk-action"
              >
                <span>{bulkAgentBusy ? "适配中" : "适配到 Agent"}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showAgentDropdown && (
                <div className="skillvault-bulk-menu skillvault-bulk-agent-menu">
                  {agents.filter((agent) =>
                    agent.name !== "universal" && !agent.isSharedSkillDirectory
                  ).map((agent) => {
                    const adaptedCount = selectedSkills.filter((skill) =>
                      getAdaptedAgentNames(skill).includes(agent.displayName),
                    ).length
                    const allAdapted = adaptedCount === selectedSkills.length
                    return (
                      <button
                        key={agent.name}
                        disabled={allAdapted}
                        onClick={() => {
                          setShowAgentDropdown(false)
                          void onBulkAdaptToAgent(agent)
                        }}
                      >
                        <AgentLogo name={agent.displayName} size={19} />
                        <span data-no-localize>{agent.displayName}</span>
                        <small>{allAdapted ? "已适配" : `${adaptedCount}/${selectedSkills.length}`}</small>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Add to Collection */}
            <div className="relative" ref={collectionDropdownRef}>
              <button
                onClick={() => {
                  setShowCollectionDropdown(!showCollectionDropdown)
                  setShowAgentDropdown(false)
                }}
                className="skillvault-bulk-action"
              >
                <span>Collection</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showCollectionDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-surface shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                  {Object.keys(collections).length > 0 && (
                    <>
                      {Object.keys(collections).sort().map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            onBulkAddToCollection(name)
                            setShowCollectionDropdown(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-foreground hover:bg-surface-hover transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                      <hr className="border-border my-1" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowCollectionDropdown(false)
                      onBulkCreateCollection()
                    }}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-accent hover:bg-surface-hover transition-colors"
                  >
                    + New Collection
                  </button>
                </div>
              )}
            </div>
            {/* Delete */}
            <button
              onClick={onBulkDelete}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[12px] text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
            {/* Cancel */}
            <button
              onClick={onMultiSelectClear}
              className="rounded-md px-2 py-1 text-[12px] text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const MemoizedMiddlePanel = memo(MiddlePanel)

// --------------------------------------------------------------------------
// Bulk Delete Confirmation Dialog
// --------------------------------------------------------------------------

function BulkDeleteDialog({
  count,
  selectedAgent,
  selectedAgentCanBeUnbound,
  onConfirm,
  onRemoveFromAgent,
  onCancel,
}: {
  count: number
  selectedAgent: string | null
  selectedAgentCanBeUnbound: boolean
  onConfirm: () => Promise<void>
  onRemoveFromAgent: () => Promise<void>
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canRemoveFromSelectedAgent = Boolean(
    selectedAgent && selectedAgentCanBeUnbound,
  )

  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "操作失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        aria-describedby="bulk-delete-description"
        className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-sm mx-4 p-5 animate-slide-down"
      >
        <h2 id="bulk-delete-title" className="text-[14px] font-semibold text-foreground mb-1">
          {canRemoveFromSelectedAgent
            ? `如何处理选中的 ${count} 个 Skill？`
            : `删除选中的 ${count} 个 Skill？`}
        </h2>
        <p id="bulk-delete-description" className="text-[12px] leading-5 text-muted mb-5">
          {canRemoveFromSelectedAgent
            ? `只取消 ${selectedAgent} 适配不会删除 Skill 文件。选择删除时，这些 Skill 会从 SkillVault 中移除，文件会进入系统回收站。`
            : "删除后，这些 Skill 会从 SkillVault 中移除，文件会进入系统回收站。"}
        </p>
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 whitespace-nowrap rounded-lg px-4 text-[12px] text-muted outline-2 outline-offset-2 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          {canRemoveFromSelectedAgent ? (
            <>
              <button
                onClick={() => void run(onRemoveFromAgent)}
                disabled={busy}
                className="min-h-11 whitespace-nowrap rounded-lg border border-border px-4 text-[12px] text-foreground outline-2 outline-offset-2 transition-colors hover:bg-surface-hover focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "处理中…" : `只取消 ${selectedAgent} 适配`}
              </button>
              <button
                onClick={() => void run(onConfirm)}
                disabled={busy}
                className="min-h-11 whitespace-nowrap rounded-lg bg-red-600 px-4 text-[12px] font-medium text-white outline-2 outline-offset-2 transition-colors hover:bg-red-700 focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "正在删除…" : "删除所选 Skill"}
              </button>
            </>
          ) : (
            <button
              onClick={() => void run(onConfirm)}
              disabled={busy}
              className="min-h-11 whitespace-nowrap rounded-lg bg-red-600 px-4 text-[12px] font-medium text-white outline-2 outline-offset-2 transition-colors hover:bg-red-700 focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "正在删除…" : `删除 ${count} 个 Skill`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type ExportScope = "selected" | "all" | "global" | "project"

type MigrationDialogState =
  | {
      mode: "export"
      phase: "select" | "progress" | "complete"
      scope: ExportScope
      result?: { filePath: string; skillCount: number }
    }
  | {
      mode: "import"
      phase: "preview" | "progress" | "complete"
      preview: ImportPackagePreview
      result?: { imported: number; skipped: number; adapted: number; pending: number; errors: string[] }
    }

function MigrationAgentGroup({
  title,
  tone,
  agents,
}: {
  title: string
  tone: "ready" | "pending" | "unknown" | "new"
  agents: Array<{ name: string; displayName: string; skillCount?: number }>
}) {
  if (agents.length === 0) return null
  return (
    <section className={`skillvault-migration-agent-group is-${tone}`}>
      <header>
        <strong>{title}</strong>
        <span>{agents.length}</span>
      </header>
      <div>
        {agents.map((agent) => (
          <span key={agent.name} className="skillvault-migration-agent-chip">
            <AgentLogo name={agent.displayName} size={18} />
            <span data-no-localize>{agent.displayName}</span>
            {typeof agent.skillCount === "number" && <small>{agent.skillCount} 个</small>}
          </span>
        ))}
      </div>
    </section>
  )
}

function MigrationDialog({
  state,
  progress,
  counts,
  selectedCount,
  onScopeChange,
  onConfirmExport,
  onConfirmImport,
  onClose,
}: {
  state: MigrationDialogState
  progress: MigrationProgress | null
  counts: { all: number; global: number; project: number }
  selectedCount: number
  onScopeChange: (scope: ExportScope) => void
  onConfirmExport: () => void
  onConfirmImport: () => void
  onClose: () => void
}) {
  const busy = state.phase === "progress"
  const complete = state.phase === "complete"
  const title = state.mode === "export" ? "导出 Skill" : "导入 Skill"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="skillvault-migration-dialog animate-slide-down" role="dialog" aria-modal="true" aria-label={title}>
        <div className="skillvault-migration-dialog__head">
          <div>
            <h2>{title}</h2>
            <p>{state.mode === "export" ? "生成可在其他设备恢复的本地迁移包" : "检查迁移包并恢复本地 Skill"}</p>
          </div>
          {!busy && (
            <button onClick={onClose} aria-label="关闭">×</button>
          )}
        </div>

        {state.mode === "export" && state.phase === "select" && (
          <>
            <div className="skillvault-migration-section-title">选择导出范围</div>
            <div className="skillvault-export-scope-list">
              {([
                ...(selectedCount > 0 ? [["selected", "已选择的 Skill", selectedCount]] : []),
                ["all", "全部 Skill", counts.all],
                ["global", "全局 Skill", counts.global],
                ["project", "项目 Skill", counts.project],
              ] as Array<[ExportScope, string, number]>).map(([scope, label, count]) => (
                <button
                  key={scope}
                  type="button"
                  className={state.scope === scope ? "is-selected" : ""}
                  onClick={() => onScopeChange(scope)}
                >
                  <i aria-hidden />
                  <span>{label}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </div>
            <p className="skillvault-migration-note">迁移包会保存 Skill 文件以及原有的 Agent 启用关系。</p>
          </>
        )}

        {state.mode === "import" && state.phase === "preview" && (
          <>
            <div className="skillvault-import-summary">
              <div>
                <span>迁移包</span>
                <strong data-no-localize>{state.preview.fileName}</strong>
              </div>
              <div><strong>{state.preview.importableCount ?? 0}</strong><span>可导入</span></div>
              <div><strong>{state.preview.duplicateCount ?? 0}</strong><span>同名跳过</span></div>
            </div>
            <div className="skillvault-migration-agent-groups">
              <MigrationAgentGroup title="可立即恢复" tone="ready" agents={state.preview.availableAgents ?? []} />
              <MigrationAgentGroup title="未安装，导入后待适配" tone="pending" agents={state.preview.missingAgents ?? []} />
              <MigrationAgentGroup title="暂未识别，保留适配记录" tone="unknown" agents={state.preview.unknownAgents ?? []} />
              <MigrationAgentGroup title="本机新增，不自动启用" tone="new" agents={state.preview.newAgents ?? []} />
            </div>
            <p className="skillvault-migration-note">以后检测到缺失的 Agent 时，会自动恢复原有适配；本机新增 Agent 可在导入后通过批量操作启用。</p>
          </>
        )}

        {busy && (
          <div className="skillvault-migration-progress" aria-live="polite">
            <div className="skillvault-migration-progress__mark">
              <img src={skillvaultMark} alt="" width="42" height="42" />
            </div>
            <strong>{progress?.message || (state.mode === "export" ? "正在准备导出" : "正在准备导入")}</strong>
            <div className="skillvault-migration-progress__track">
              <i style={{ width: `${Math.max(2, progress?.percent ?? 2)}%` }} />
            </div>
            <div className="skillvault-migration-progress__meta">
              <span>{progress?.current ?? 0} / {progress?.total ?? 0}</span>
              <span>{progress?.percent ?? 2}%</span>
            </div>
            {progress?.skillName && <small data-no-localize>{progress.skillName}</small>}
          </div>
        )}

        {complete && state.mode === "export" && state.result && (
          <div className="skillvault-migration-complete">
            <span>✓</span>
            <h3>导出完成</h3>
            <p>已打包 {state.result.skillCount} 个 Skill</p>
            <code data-no-localize>{state.result.filePath}</code>
          </div>
        )}

        {complete && state.mode === "import" && state.result && (
          <div className="skillvault-migration-complete">
            <span>✓</span>
            <h3>导入完成</h3>
            <div className="skillvault-import-result-grid">
              <div><strong>{state.result.imported}</strong><small>已导入</small></div>
              <div><strong>{state.result.skipped}</strong><small>同名跳过</small></div>
              <div><strong>{state.result.adapted}</strong><small>已恢复适配</small></div>
              <div><strong>{state.result.pending}</strong><small>等待 Agent</small></div>
            </div>
            {state.result.errors.length > 0 && (
              <details>
                <summary>{state.result.errors.length} 个失败项</summary>
                {state.result.errors.map((error) => <p key={error}>{error}</p>)}
              </details>
            )}
          </div>
        )}

        {!busy && (
          <div className="skillvault-migration-dialog__actions">
            {!complete && <button onClick={onClose}>取消</button>}
            {state.mode === "export" && state.phase === "select" && (
              <button className="is-primary" onClick={onConfirmExport}>选择位置并导出</button>
            )}
            {state.mode === "import" && state.phase === "preview" && (
              <button
                className="is-primary"
                disabled={(state.preview.importableCount ?? 0) === 0}
                onClick={onConfirmImport}
              >
                开始导入
              </button>
            )}
            {complete && <button className="is-primary" onClick={onClose}>完成</button>}
          </div>
        )}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Inline SVG icons for the right panel
// --------------------------------------------------------------------------

function FolderIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// --------------------------------------------------------------------------
// Remove Skill Dialog
// --------------------------------------------------------------------------

interface RemoveSkillDialogProps {
  skill: InstalledSkill
  onClose: () => void
  onRemoveAll: () => Promise<void>
}

function RemoveSkillDialog({ skill, onClose, onRemoveAll }: RemoveSkillDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const scopeLabels = useMemo(() => {
    const labels: string[] = []
    if (skill.locations.some((location) => location.scope === "global")) {
      labels.push("全局 Skill")
    }
    const projectNames = Array.from(new Set(
      skill.locations
        .filter((location) => location.scope === "project")
        .map((location) => location.projectName)
        .filter((name): name is string => Boolean(name)),
    ))
    if (skill.locations.some((location) => location.scope === "project")) {
      labels.push(
        projectNames.length === 1
          ? `项目 Skill · ${projectNames[0]}`
          : projectNames.length > 1
            ? `项目 Skill · ${projectNames.length} 个项目`
            : "项目 Skill",
      )
    }
    if (skill.locations.some((location) => location.scope === "custom")) {
      labels.push("自定义 Skill")
    }
    return labels
  }, [skill.locations])

  useEffect(() => {
    cancelButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [busy, onClose])

  const handleDelete = async () => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await onRemoveAll()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败，请重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-skill-title"
        aria-describedby="remove-skill-description"
        className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-sm mx-4 p-5 animate-slide-down"
      >
        <h2 id="remove-skill-title" className="text-[14px] font-semibold text-foreground mb-1">
          删除“{skill.name}”？
        </h2>
        <p id="remove-skill-description" className="text-[12px] leading-5 text-muted mb-4">
          删除后，这个 Skill 会从 SkillVault 中移除，文件会进入系统回收站。
        </p>

        <div className="mb-4 rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="mb-2 text-[11px] text-muted">删除范围</p>
          <div className="flex flex-wrap gap-1.5">
            {scopeLabels.map((label) => (
              <span key={label} className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>

        {skill.agents.length > 0 && (
          <p className="mb-4 rounded-lg bg-surface-hover px-3 py-2 text-[12px] leading-5 text-muted">
            只想让某个 Agent 停止使用？请先取消删除，再关闭详情页中对应的 Agent 开关。
          </p>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            disabled={busy}
            className="min-h-11 whitespace-nowrap rounded-lg px-4 text-[12px] text-muted outline-2 outline-offset-2 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={busy}
            className="min-h-11 whitespace-nowrap rounded-lg bg-red-600 px-4 text-[12px] font-medium text-white outline-2 outline-offset-2 transition-colors hover:bg-red-700 focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "正在删除…" : "移到回收站"}
          </button>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Right Detail Panel
// --------------------------------------------------------------------------

interface RightPanelProps {
  skill: InstalledSkill | null
  content: string | null
  contentLoading: boolean
  supportingFiles: InstalledSkill["supportingFiles"]
  collections: Record<string, string[]>
  onContentSaved: (newContent: string) => void
  onSkillRemoved: (result: SkillRemovalResult) => void
  onSkillChanged: () => Promise<void>
  onClose: () => void
  availableAgents: DetectedAgent[]
  onToggleCollection: (collectionName: string, skill: InstalledSkill) => void
  onCreateCollection: () => void
}

function RightPanel({
  skill,
  content,
  contentLoading,
  supportingFiles,
  collections,
  onContentSaved,
  onSkillRemoved,
  onSkillChanged,
  onClose,
  availableAgents,
  onToggleCollection,
  onCreateCollection,
}: RightPanelProps) {
  const { translate } = useLocalization()
  const [editMode, setEditMode] = useState(false)
  const [supportingPreview, setSupportingPreview] = useState("")
  const [selectedSupportingFile, setSelectedSupportingFile] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [boundAgents, setBoundAgents] = useState<string[]>(
    skill ? getAdaptedAgentNames(skill) : [],
  )
  const [bindingBusy, setBindingBusy] = useState<Set<string>>(new Set())
  const [versionSyncPath, setVersionSyncPath] = useState<string | null>(null)
  const [bindingError, setBindingError] = useState<string | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const editorRef = useRef<SkillEditorHandle | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const detailScrollRef = useRef<HTMLDivElement | null>(null)
  const skillAgentsKey = skill ? getAdaptedAgentNames(skill).join("\0") : ""
  const adaptableAgents = useMemo(
    () => availableAgents.filter((agent) =>
      agent.name !== "universal" && !agent.isSharedSkillDirectory,
    ),
    [availableAgents],
  )
  const adaptableAgentNames = useMemo(
    () => new Set(adaptableAgents.map((agent) => agent.displayName)),
    [adaptableAgents],
  )
  const adaptableBoundAgents = boundAgents.filter((name) => adaptableAgentNames.has(name))

  // Reset edit mode when skill changes
  useEffect(() => {
    setEditMode(false)
    setSupportingPreview("")
    setSelectedSupportingFile(null)
    setSaveStatus("idle")
    setShowRemoveDialog(false)
    setBindingBusy(new Set())
    setBindingError(null)
    setShowBackToTop(false)
  }, [skill?.canonicalPath])

  useEffect(() => {
    setBoundAgents(skill ? getAdaptedAgentNames(skill) : [])
  }, [skill?.canonicalPath, skillAgentsKey])

  useEffect(() => {
    if (!skill) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown)
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown)
  }, [onClose, skill])

  useEffect(() => {
    if (!skill?.path || supportingFiles.length === 0) {
      setSupportingPreview("")
      setSelectedSupportingFile(null)
      return
    }

    const firstFile = supportingFiles[0]?.relativePath ?? null
    if (!firstFile) return

    let cancelled = false
    setSelectedSupportingFile(firstFile)
    electronAPI
      .readSupportingFile(skill.path, firstFile)
      .then((value) => {
        if (!cancelled) {
          setSupportingPreview(value)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupportingPreview("Preview unavailable.")
        }
      })

    return () => {
      cancelled = true
    }
  }, [skill?.path, supportingFiles])

  const isLocalSkill = !!(skill?.path)

  useEffect(() => {
    if (!editMode) return
    const timer = window.setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [editMode])

  const handleEditToggle = () => {
    if (!editMode) {
      setSaveStatus("idle")
    }
    setEditMode(!editMode)
  }

  const handleSave = async (editorContent?: string) => {
    if (!skill?.path) return
    const nextContent = editorContent ?? editorRef.current?.getValue() ?? content ?? ""
    setSaveStatus("saving")
    try {
      const filePath = skill.path + "/SKILL.md"
      await electronAPI.writeSkillContent(filePath, nextContent)
      onContentSaved(nextContent)
      setSaveStatus("saved")
      setTimeout(() => {
        setEditMode(false)
        setSaveStatus("idle")
      }, 800)
    } catch (err) {
      console.error("Failed to save skill content:", err)
      setSaveStatus("error")
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setSaveStatus("idle")
  }

  const handleOpenInFinder = () => {
    if (!skill?.path) return
    electronAPI.openInFinder(skill.path + "/SKILL.md")
  }

  const handleSupportingFileSelect = async (relativePath: string) => {
    if (!skill?.path) return
    setSelectedSupportingFile(relativePath)
    try {
      const value = await electronAPI.readSupportingFile(skill.path, relativePath)
      setSupportingPreview(value)
    } catch (err) {
      console.error("Failed to read supporting file:", err)
      setSupportingPreview("Preview unavailable.")
    }
  }

  const handleDeleteClick = () => {
    if (!skill) return
    setShowRemoveDialog(true)
  }

  const handleRemoveAll = async () => {
    if (!skill) return
    try {
      const result = await electronAPI.removeSkill(createSkillRemovalRequest(skill))
      setShowRemoveDialog(false)
      onSkillRemoved(result)
      if (result.errors.length > 0) {
        window.alert(`部分删除失败：\n${result.errors.map((error) => `${error.path}: ${error.message}`).join("\n")}`)
      }
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  const handleAgentToggle = async (agent: DetectedAgent) => {
    if (!skill || bindingBusy.has(agent.name) || versionSyncPath !== null) return
    const installed = boundAgents.includes(agent.displayName)
    setBindingError(null)
    setBoundAgents((current) => installed
      ? current.filter((name) => name !== agent.displayName)
      : Array.from(new Set([...current, agent.displayName])))
    setBindingBusy((current) => new Set(current).add(agent.name))
    let applied = false
    try {
      if (installed) {
        await electronAPI.removeFromAgent(createSkillRemovalRequest(skill), agent.name)
      } else {
        await electronAPI.addToAgent(skill.name, skill.path, agent.name)
      }
      applied = true
      await onSkillChanged()
    } catch (error) {
      console.error("Failed to update agent adaptation:", error)
      if (!applied) {
        setBoundAgents((current) => installed
          ? Array.from(new Set([...current, agent.displayName]))
          : current.filter((name) => name !== agent.displayName))
        setBindingError(`${agent.displayName} 适配失败，请重试`)
      } else {
        setBindingError("适配已生效，但列表刷新失败")
      }
    } finally {
      setBindingBusy((current) => {
        const next = new Set(current)
        next.delete(agent.name)
        return next
      })
    }
  }

  const handleVersionSync = async (mismatch: InstalledSkill["versionMismatches"][number]) => {
    if (!skill || bindingBusy.size > 0 || versionSyncPath !== null) return
    setBindingError(null)
    setVersionSyncPath(mismatch.agentPath)
    try {
      await electronAPI.syncAgentCopyToMaster(
        skill.name,
        mismatch.agentName,
        mismatch.agentPath,
      )
      await onSkillChanged()
    } catch (error) {
      console.error("Failed to sync agent copy to master:", error)
      setBindingError(`${mismatch.agentDisplayName} 同步失败，请重试`)
    } finally {
      setVersionSyncPath(null)
    }
  }

  if (!skill) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <SkillVaultIcon />
          <p className="text-muted text-sm mt-3">
            Select a skill to view details
          </p>
        </div>
      </div>
    )
  }

  const visibleVersionMismatches = skill.versionMismatches.filter(
    (mismatch) => boundAgents.includes(mismatch.agentDisplayName),
  )
  const versionSyncBusy = versionSyncPath !== null || bindingBusy.size > 0

  if (editMode) {
    return (
      <div ref={panelRef} className="skillvault-detail-panel flex flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between gap-4 border-b border-border px-8 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 data-no-localize className="truncate text-xl font-bold text-foreground">{skill.name}</h1>
              <SourceBadge sourceType={skill.sourceType} />
            </div>
            <p className="mt-1 text-[12px] text-muted">
              Editing raw `SKILL.md`
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saved" && (
              <span className="text-[12px] text-green-500">Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="text-[12px] text-red-500">Save failed</span>
            )}
            <button
              onClick={handleCancel}
              className="rounded-lg border border-border px-4 py-2 text-[12px] text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave()}
              disabled={saveStatus === "saving"}
              className="rounded-lg bg-foreground px-4 py-2 text-[12px] text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <SkillEditor
            ref={editorRef}
            content={content ?? ""}
            onSave={handleSave}
            fullBleed
          />
        </div>
      </div>
    )
  }

  return (
      <div ref={panelRef} className="skillvault-detail-panel flex flex-col overflow-hidden bg-background">
        <div
          ref={detailScrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={(event) => setShowBackToTop(event.currentTarget.scrollTop > 320)}
        >
          <div className="px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h1 data-no-localize className="text-xl font-bold text-foreground truncate">{skill.name}</h1>
                <SourceBadge sourceType={skill.sourceType} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={onClose}
                  title="Close"
                  aria-label="Close"
                  className="skillvault-detail-close"
                >
                  ×
                </button>
                {/* View/Edit toggle */}
                {isLocalSkill && content && (
                  <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden text-[12px]">
                    <button
                      onClick={() => { if (editMode) handleCancel() }}
                      className={`px-3 py-1.5 transition-colors ${!editMode ? "bg-surface-hover text-foreground font-medium" : "text-muted hover:text-foreground"}`}
                    >
                      View
                    </button>
                    <button
                      onClick={() => { if (!editMode) handleEditToggle() }}
                      className={`px-3 py-1.5 transition-colors ${editMode ? "bg-surface-hover text-foreground font-medium" : "text-muted hover:text-foreground"}`}
                    >
                      Edit
                    </button>
                  </div>
                )}

                {/* Open in Finder */}
                {isLocalSkill && (
                  <button
                    onClick={handleOpenInFinder}
                    title="Show in Finder"
                    className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <FolderIcon />
                  </button>
                )}

                {/* Delete */}
                {isLocalSkill && (
                  <button
                    onClick={handleDeleteClick}
                    title="Remove skill"
                    className="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {skill.description && (
              <p data-no-localize className="text-sm text-muted mb-3">{skill.description}</p>
            )}
            <div className="flex items-center gap-1.5">
              <AgentLogoRow agents={adaptableBoundAgents} size={16} />
            </div>
            <div className="skillvault-agent-adapter">
              <div className="skillvault-agent-adapter__head">
                <div>
                  <strong>Agent 适配</strong>
                  <span>开关仅控制是否启用，不会同步独立副本中的修改</span>
                </div>
                <small>{adaptableBoundAgents.length}/{adaptableAgents.length}</small>
              </div>
              <div className="skillvault-agent-adapter__grid">
                {adaptableAgents.map((agent) => {
                  const enabled = boundAgents.includes(agent.displayName)
                  const busy = bindingBusy.has(agent.name) || versionSyncPath !== null
                  const versionMismatch = skill.versionMismatches.find(
                    (mismatch) => mismatch.agentName === agent.name,
                  )
                  return (
                    <div
                      key={agent.name}
                      className={`skillvault-agent-adapter__item${enabled && versionMismatch ? " has-version-mismatch" : ""}`}
                    >
                      <button
                        type="button"
                        title={versionMismatch ? `${agent.displayName}：存在未同步的独立副本` : agent.displayName}
                        className={`skillvault-agent-adapter__toggle${enabled ? " is-enabled" : ""}${busy ? " is-busy" : ""}`}
                        onClick={() => handleAgentToggle(agent)}
                        disabled={busy}
                        aria-pressed={enabled}
                        aria-busy={busy}
                      >
                        <AgentLogo name={agent.displayName} size={23} />
                        <span data-no-localize>{agent.displayName}</span>
                        <i aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
              {visibleVersionMismatches.length > 0 && (
                <div className="skillvault-version-mismatches">
                  {visibleVersionMismatches.map((mismatch) => (
                    <section key={mismatch.agentPath} className="skillvault-version-diff">
                      <div className="skillvault-version-diff__head">
                        <span>
                          <b><span data-no-localize>{mismatch.agentDisplayName}</span> 中存在未同步的独立副本</b>
                          <small>{mismatch.totalChanges} 个文件与母版不同</small>
                        </span>
                        <button
                          type="button"
                          className="skillvault-version-diff__repair"
                          onClick={() => void handleVersionSync(mismatch)}
                          disabled={versionSyncBusy}
                        >
                          {versionSyncPath === mismatch.agentPath ? "同步中" : "同步至母版"}
                        </button>
                      </div>
                      <ul>
                        {mismatch.changes.map((change) => (
                          <li key={`${change.kind}:${change.relativePath}`}>
                            <span data-no-localize>{change.relativePath}</span>
                            <small>
                              {change.kind === "modified"
                                ? "内容已修改"
                                : change.kind === "only-master"
                                  ? "仅母版中存在"
                                  : "仅该副本中存在"}
                            </small>
                          </li>
                        ))}
                      </ul>
                      {mismatch.totalChanges > mismatch.changes.length && (
                        <p>另有 {mismatch.totalChanges - mismatch.changes.length} 个不同文件未列出</p>
                      )}
                      <p className="skillvault-version-diff__explanation">
                        该副本中的修改当前仅在 <span data-no-localize>{mismatch.agentDisplayName}</span> 中生效。同步至母版后，使用母版的其他 Agent 将自动更新。
                      </p>
                    </section>
                  ))}
                </div>
              )}
              {bindingError && (
                <p role="alert" className="skillvault-agent-adapter__error">{bindingError}</p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted">
              <span className="rounded border border-border px-2 py-0.5">
                scope: {skill.scope}
              </span>
              {skill.projectNames.length > 0 && (
                <span className="rounded border border-border px-2 py-0.5">
                  project: {skill.projectNames.join("、")}
                </span>
              )}
              <span className="rounded border border-border px-2 py-0.5">
                supporting files: {supportingFiles.length}
              </span>
            </div>
            {skill.source && (
              <p className="text-[12px] text-muted font-mono mt-2">
                {skill.source}
              </p>
            )}
            <p className="text-[12px] text-muted font-mono mt-2 break-all">
              {skill.canonicalPath}
            </p>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-widest text-muted">Collections</p>
                <button
                  onClick={onCreateCollection}
                  className="text-[12px] text-muted hover:text-foreground"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(collections).length === 0 ? (
                  <span className="text-[12px] text-muted">No collections yet.</span>
                ) : (
                  Object.entries(collections).map(([name, items]) => {
                    const included = items.includes(skill.canonicalPath)
                    return (
                      <button
                        key={name}
                        onClick={() => onToggleCollection(name, skill)}
                        className={`rounded-full border px-2 py-0.5 text-[12px] transition-colors ${
                          included
                            ? "border-accent bg-surface-hover text-foreground"
                            : "border-border text-muted hover:text-foreground"
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border mb-6" />

          {/* Content: View or Edit mode */}
          {contentLoading ? (
            <p className="text-sm text-muted animate-fade-in">Loading content...</p>
          ) : content ? (
            <MemoizedMarkdown content={content} />
          ) : (
            <p className="text-sm text-muted">
              Skill content not available. This skill may not have a SKILL.md file.
            </p>
          )}

          {supportingFiles.length > 0 && !editMode && (
            <>
              <hr className="border-border my-6" />
              <div className="grid grid-cols-[220px_1fr] gap-4">
                <div>
                  <h2 className="text-[12px] uppercase tracking-widest text-muted mb-3">
                    Supporting Files
                  </h2>
                  <div className="flex flex-col gap-1">
                    {supportingFiles.map((file) => (
                      <button
                        key={file.relativePath}
                        onClick={() => handleSupportingFileSelect(file.relativePath)}
                        className={`text-left rounded-md border px-2 py-1.5 text-[12px] transition-colors ${
                          selectedSupportingFile === file.relativePath
                            ? "border-accent bg-surface-hover text-foreground"
                            : "border-border text-muted hover:text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <div className="truncate">{file.relativePath}</div>
                        <div className="text-[11px] text-muted">{file.size} bytes</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-[12px] uppercase tracking-widest text-muted mb-3">
                    Preview
                  </h2>
                  <pre className="min-h-[220px] overflow-x-auto rounded-lg border border-border bg-surface p-4 text-[12px] text-foreground whitespace-pre-wrap">
                    {supportingPreview || "Select a supporting file to preview it."}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showBackToTop && (
        <button
          type="button"
          title="回到顶部"
          aria-label="回到顶部"
          className="skillvault-back-to-top"
          onClick={() => detailScrollRef.current?.scrollTo({ top: 0, behavior: "auto" })}
        >
          ↑
        </button>
      )}

      {/* Remove skill dialog */}
      {showRemoveDialog && skill && (
        <RemoveSkillDialog
          skill={{ ...skill, agents: adaptableBoundAgents }}
          onClose={() => setShowRemoveDialog(false)}
          onRemoveAll={handleRemoveAll}
        />
      )}
    </div>
  )
}

const MemoizedRightPanel = memo(RightPanel)

function CreateSkillDialog({
  open,
  onClose,
  agents,
  defaultTargets,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  agents: DetectedAgent[]
  defaultTargets: string[]
  onCreate: (data: { name: string; description: string; content: string; targets: string[] }) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [targets, setTargets] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
      setContent("")
      const availableTargetNames = new Set(agents.map((agent) => agent.name))
      setTargets(
        (defaultTargets.length > 0 ? defaultTargets : agents.map((agent) => agent.name))
          .filter((agentName) => availableTargetNames.has(agentName)),
      )
    }
  }, [open, defaultTargets, agents])

  if (!open) return null

  const toggleTarget = (name: string) => {
    setTargets((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-lg">
        <h2 className="text-[15px] font-semibold text-foreground mb-1">New Skill</h2>
        <p className="text-[12px] text-muted mb-4">Create a local skill and install it into one or more targets.</p>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="min-h-[90px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`---
name: my-skill
description: What this skill does
---

# My Skill

## Instructions

Add your skill instructions here.`}
            className="min-h-[220px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground"
          />
          <div>
            <p className="text-[12px] font-medium text-foreground mb-2">Targets</p>
            <div className="grid grid-cols-2 gap-2">
              {agents.map((agent) => (
                <label key={agent.name} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] text-foreground">
                  <input
                    type="checkbox"
                    checked={targets.includes(agent.name)}
                    onChange={() => toggleTarget(agent.name)}
                  />
                  <span>{agent.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-muted">Cancel</button>
            <button
              onClick={() => onCreate({ name: name.trim(), description: description.trim(), content, targets })}
              disabled={!name.trim()}
              className="rounded-lg bg-foreground px-4 py-2 text-[12px] text-background disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollectionDialog({
  open,
  mode,
  initialName,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: "create" | "rename"
  initialName: string
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) {
      setName(initialName)
    }
  }, [open, initialName])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg">
        <h2 className="text-[15px] font-semibold text-foreground mb-1">
          {mode === "create" ? "New Collection" : "Rename Collection"}
        </h2>
        <p className="text-[12px] text-muted mb-4">
          {mode === "create"
            ? "Create a collection for grouping local skills."
            : "Choose a new name for this collection."}
        </p>
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onSubmit(name.trim())
              }
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-muted">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(name.trim())}
              disabled={!name.trim()}
              className="rounded-lg bg-foreground px-4 py-2 text-[12px] text-background disabled:opacity-40"
            >
              {mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Home (three-column layout)
// --------------------------------------------------------------------------

export function Home() {
  const { translate } = useLocalization()
  const [agents, setAgents] = useState<DetectedAgent[]>([])
  const [skills, setSkillsState] = useState<InstalledSkill[]>([])
  const setSkills = useCallback((nextSkills: InstalledSkill[]) => {
    setSkillsState(normalizeInstalledSkills(nextSkills))
  }, [])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites">("all")
  const [scopeFilter, setScopeFilter] = useState<SkillScopeFilter>("all")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null)
  const [selectedSkillName, setSelectedSkillName] = useState<string | null>(null)
  const [skillContent, setSkillContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [selectedSupportingFiles, setSelectedSupportingFiles] = useState<
    InstalledSkill["supportingFiles"]
  >([])
  const [collections, setCollections] = useState<Record<string, string[]>>({})
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [defaultAgents, setDefaultAgents] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [dragSkill, setDragSkill] = useState<DragSkillPayload | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [dragToast, setDragToast] = useState<DragToast | null>(null)
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
  // Explicit selection mode: row checkboxes only appear while this is on.
  const [selectionMode, setSelectionMode] = useState(false)
  const [lastMultiSelectIndex, setLastMultiSelectIndex] = useState<number | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [pendingBulkCollection, setPendingBulkCollection] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState<"import" | "export" | null>(null)
  const [migrationDialog, setMigrationDialog] = useState<MigrationDialogState | null>(null)
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null)
  const [bulkAgentBusy, setBulkAgentBusy] = useState<string | null>(null)
  const [showScanSources, setShowScanSources] = useState(false)
  const skillListRef = useRef<HTMLDivElement>(null)
  const contentCacheRef = useRef(new Map<string, string | null>())
  const supportingFilesCacheRef = useRef(
    new Map<string, InstalledSkill["supportingFiles"]>(),
  )
  const [collectionDialog, setCollectionDialog] = useState<{
    open: boolean
    mode: "create" | "rename"
    initialName: string
    targetName: string | null
  }>({
    open: false,
    mode: "create",
    initialName: "",
    targetName: null,
  })
  const selectedSkill = useMemo(
    () =>
      selectedSkillPath
        ? skills.find((skill) => skill.canonicalPath === selectedSkillPath) ??
          (selectedSkillName
            ? skills.find((skill) => skill.name === selectedSkillName) ?? null
            : null)
        : null,
    [selectedSkillName, selectedSkillPath, skills],
  )
  const agentsBySkillName = useMemo(() => {
    const coverage: Record<string, string[]> = {}
    for (const skill of skills) {
      const key = skill.name.trim().toLowerCase()
      coverage[key] = Array.from(new Set([
        ...(coverage[key] || []),
        ...getAgentFilterNames(skill),
      ]))
    }
    return coverage
  }, [skills])
  const selectedSkillForDisplay = selectedSkill

  useEffect(() => {
    if (selectedSkillPath && selectedSkill && selectedSkill.canonicalPath !== selectedSkillPath) {
      setSelectedSkillPath(selectedSkill.canonicalPath)
    }
  }, [selectedSkill, selectedSkillPath])

  // Load agents and skills on mount
  useEffect(() => {
    async function load() {
      try {
        const [
          detectedAgents,
          installedSkills,
          savedCollections,
          savedDefaultAgents,
          savedFavorites,
        ] = await Promise.all([
          electronAPI.detectAgents(),
          electronAPI.listInstalled(),
          electronAPI.settingsGet("collections.skills", {} as Record<string, string[]>),
          electronAPI.settingsGet("install.defaultAgents", [] as string[]),
          electronAPI.favoritesList(),
        ])
        setAgents(detectedAgents)
        setSkills(installedSkills)
        setCollections(savedCollections || {})
        setDefaultAgents(savedDefaultAgents || [])
        setFavorites(new Set(savedFavorites))
      } catch (err) {
        console.error("Failed to load installed skills:", err)
      } finally {
        setLoading(false)
      }
    }

    load()

    const cleanup = electronAPI.onSkillsUpdated((updatedSkills) => {
      contentCacheRef.current.clear()
      supportingFilesCacheRef.current.clear()
      setSkills(updatedSkills)
    })

    return cleanup
  }, [])

  useEffect(() => {
    const cleanupProgress = electronAPI.onMigrationProgress((progress) => {
      setMigrationProgress(progress)
    })
    const cleanupPendingRestore = electronAPI.onPendingAgentRestored((result) => {
      setDragToast({
        type: "success",
        message: `检测到 ${result.agents.join("、")}，已自动恢复 ${result.restored} 项 Skill 适配`,
      })
    })
    return () => {
      cleanupProgress()
      cleanupPendingRestore()
    }
  }, [])

  // Load skill content and supporting files when a skill is selected
  useEffect(() => {
    if (!selectedSkill) {
      setSkillContent(null)
      setSelectedSupportingFiles([])
      setContentLoading(false)
      return
    }

    let cancelled = false
    const cacheKey = selectedSkill.canonicalPath
    const hasCachedContent = contentCacheRef.current.has(cacheKey)
    const cachedContent = contentCacheRef.current.get(cacheKey) ?? null
    const cachedFiles = supportingFilesCacheRef.current.get(cacheKey)

    setSkillContent(hasCachedContent ? cachedContent : null)
    setSelectedSupportingFiles(cachedFiles ?? [])

    if (hasCachedContent && cachedFiles) {
      setContentLoading(false)
      return
    }

    setContentLoading(true)

    async function loadContent() {
      try {
        const [raw, files] = await Promise.all([
          hasCachedContent
            ? Promise.resolve(cachedContent)
            : electronAPI.readSkillContent(selectedSkill.path),
          cachedFiles
            ? Promise.resolve(cachedFiles)
            : electronAPI.listSupportingFiles(selectedSkill.path),
        ])
        if (!cancelled) {
          setSkillContent(raw || null)
          setSelectedSupportingFiles(files)
          contentCacheRef.current.set(cacheKey, raw || null)
          supportingFilesCacheRef.current.set(cacheKey, files)
        }
      } catch (err) {
        console.error("Failed to load skill content:", err)
        if (!cancelled) {
          setSkillContent(null)
          setSelectedSupportingFiles([])
        }
      } finally {
        if (!cancelled) {
          setContentLoading(false)
        }
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [selectedSkill])

  useEffect(() => {
    if (selectedSkillPath && !selectedSkill) {
      setSelectedSkillPath(null)
      setSkillContent(null)
      setSelectedSupportingFiles([])
    }
  }, [selectedSkill, selectedSkillPath])

  useEffect(() => {
    setSelectedSkillPath(null)
  }, [activeFilter, selectedAgent, selectedCollection, selectedProject])

  // Count skills per agent
  const agentSkillCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [skillName, agentNames] of Object.entries(agentsBySkillName)) {
      if (!skillName) continue
      for (const agentName of agentNames) {
        counts[agentName] = (counts[agentName] || 0) + 1
      }
    }
    return counts
  }, [agentsBySkillName])

  // Filter skills by selected agent and search query
  const filteredSkills = useMemo(() => {
    let result = skills

    if (scopeFilter !== "all") {
      result = result.filter((skill) => skill.scope === scopeFilter)
    }

    if (selectedProject) {
      result = result.filter((skill) => skill.projectNames.includes(selectedProject))
    }

    if (activeFilter === "favorites") {
      result = result.filter((s) => favorites.has(s.name))
    }

    if (selectedCollection) {
      const ids = new Set(collections[selectedCollection] || [])
      result = result.filter((s) => ids.has(s.canonicalPath))
    }

    if (selectedAgent) {
      result = result.filter((skill) => getAgentFilterNames(skill).includes(selectedAgent))
    }

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.source && s.source.toLowerCase().includes(q)) ||
          s.path.toLowerCase().includes(q) ||
          s.canonicalPath.toLowerCase().includes(q) ||
          s.projectNames.some((projectName) => projectName.toLowerCase().includes(q)) ||
          s.supportingFiles.some((file) =>
            file.relativePath.toLowerCase().includes(q),
          ),
      )
    }

    return result
  }, [
    skills,
    scopeFilter,
    selectedProject,
    selectedAgent,
    deferredSearchQuery,
    selectedCollection,
    collections,
    activeFilter,
    favorites,
  ])

  const scopeCounts = useMemo<Record<SkillScopeFilter, number>>(() => ({
    all: skills.length,
    global: skills.filter((skill) => skill.scope === "global").length,
    project: skills.filter((skill) => skill.scope === "project").length,
    custom: skills.filter((skill) => skill.scope === "custom").length,
  }), [skills])

  const projectNames = useMemo(
    () => Array.from(new Set(
      skills
        .filter((skill) => skill.scope === "project")
        .flatMap((skill) => skill.projectNames),
    )).sort((a, b) => a.localeCompare(b)),
    [skills],
  )

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [name, items] of Object.entries(collections)) {
      const ids = new Set(items)
      counts[name] = skills.filter((skill) => ids.has(skill.canonicalPath)).length
    }
    return counts
  }, [collections, skills])

  // Count favorites that are currently installed (orphan favorites are
  // preserved in the DB but not shown in the sidebar count).
  const installedFavoritesCount = useMemo(
    () => skills.reduce((n, s) => (favorites.has(s.name) ? n + 1 : n), 0),
    [skills, favorites],
  )

  const handleSelectSkill = useCallback((skill: InstalledSkill) => {
    setSelectedSkillName(skill.name)
    setSelectedSkillPath(skill.canonicalPath)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const installedSkills = await electronAPI.rescanSkills()
      contentCacheRef.current.clear()
      supportingFilesCacheRef.current.clear()
      setSkills(installedSkills)
      setDragToast({ type: "success", message: `已刷新 ${installedSkills.length} 个本地 Skill` })
    } catch (error) {
      console.error("Failed to rescan skills:", error)
      setDragToast({ type: "error", message: "刷新失败，请检查扫描目录" })
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleExportPackage = useCallback(() => {
    const defaultScope: ExportScope = multiSelected.size > 0
      ? "selected"
      : scopeFilter === "global" || scopeFilter === "project"
        ? scopeFilter
        : "all"
    setMigrationProgress(null)
    setMigrationDialog({ mode: "export", phase: "select", scope: defaultScope })
  }, [multiSelected.size, scopeFilter])

  const handleImportPackage = useCallback(async () => {
    setMigrationBusy("import")
    try {
      const preview = await electronAPI.inspectImportSkillsPackage()
      if (preview.cancelled) return
      setMigrationProgress(null)
      setMigrationDialog({ mode: "import", phase: "preview", preview })
    } catch (error) {
      console.error("Failed to inspect SkillVault package:", error)
      setDragToast({ type: "error", message: "无法读取迁移包，请选择有效的 .skillvault 文件" })
    } finally {
      setMigrationBusy(null)
    }
  }, [])

  const handleConfirmExport = useCallback(async () => {
    if (!migrationDialog || migrationDialog.mode !== "export") return
    const scope = migrationDialog.scope
    setMigrationBusy("export")
    setMigrationProgress(null)
    setMigrationDialog({ mode: "export", phase: "progress", scope })
    try {
      const result = await electronAPI.exportSkillsPackage({
        scope,
        selectedPaths: scope === "selected" ? Array.from(multiSelected) : undefined,
      })
      if (result.cancelled) {
        setMigrationDialog({ mode: "export", phase: "select", scope })
        return
      }
      if (result.skillCount === 0 || !result.filePath) {
        setMigrationDialog({ mode: "export", phase: "select", scope })
        setDragToast({ type: "error", message: "当前范围没有可导出的本地 Skill" })
        return
      }
      setMigrationDialog({
        mode: "export",
        phase: "complete",
        scope,
        result: { filePath: result.filePath, skillCount: result.skillCount },
      })
    } catch (error) {
      console.error("Failed to export SkillVault package:", error)
      setMigrationDialog({ mode: "export", phase: "select", scope })
      const details = error instanceof Error ? error.message : String(error)
      const targetFileBusy = /EBUSY|EPERM|EACCES|being used|in use|access denied/i.test(details)
      setDragToast({
        type: "error",
        message: targetFileBusy
          ? "导出失败：目标文件正在使用中，请关闭后重试"
          : "导出失败，请重试或更换保存位置",
      })
    } finally {
      setMigrationBusy(null)
    }
  }, [migrationDialog, multiSelected])

  const handleConfirmImport = useCallback(async () => {
    if (
      !migrationDialog ||
      migrationDialog.mode !== "import"
    ) return
    const archivePath = migrationDialog.preview.filePath
    if (!archivePath) return
    const preview = migrationDialog.preview
    setMigrationBusy("import")
    setMigrationProgress(null)
    setMigrationDialog({ mode: "import", phase: "progress", preview })
    try {
      const result = await electronAPI.importSkillsPackage(archivePath)
      const installedSkills = await electronAPI.listInstalled()
      contentCacheRef.current.clear()
      supportingFilesCacheRef.current.clear()
      setSkills(installedSkills)
      setMigrationDialog({ mode: "import", phase: "complete", preview, result })
    } catch (error) {
      console.error("Failed to import SkillVault package:", error)
      setMigrationDialog({ mode: "import", phase: "preview", preview })
      setDragToast({ type: "error", message: "导入失败，迁移包可能已损坏或目标目录不可写" })
    } finally {
      setMigrationBusy(null)
    }
  }, [migrationDialog])

  const handleToggleFavorite = useCallback(
    async (skill: InstalledSkill, e: React.MouseEvent) => {
      e.stopPropagation()
      const name = skill.name
      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })
      try {
        const isFavoritedAfter = await electronAPI.favoritesToggle(name)
        setFavorites((prev) => {
          const next = new Set(prev)
          if (isFavoritedAfter) next.add(name)
          else next.delete(name)
          return next
        })
      } catch (err) {
        console.error("Failed to toggle favorite:", err)
        // Revert on failure
        setFavorites((prev) => {
          const next = new Set(prev)
          if (next.has(name)) next.delete(name)
          else next.add(name)
          return next
        })
      }
    },
    [],
  )

  const handleClearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedAgent(null)
    setSelectedCollection(null)
    setActiveFilter("all")
    setScopeFilter("all")
    setSelectedProject(null)
  }, [])

  const handleScopeFilterChange = useCallback((scope: SkillScopeFilter) => {
    setScopeFilter(scope)
    if (scope !== "project") setSelectedProject(null)
    setSelectedSkillPath(null)
    setMultiSelected(new Set())
  }, [])

  const handleContentSaved = useCallback((newContent: string) => {
    setSkillContent(newContent)
    if (selectedSkill) {
      contentCacheRef.current.set(selectedSkill.canonicalPath, newContent)
    }
  }, [selectedSkill])

  const handleSkillRemoved = useCallback((result: SkillRemovalResult) => {
    setSelectedSkillPath(null)
    setSkillContent(null)
    setSelectedSupportingFiles([])
    setSkills(result.skills)
    setCollections(result.collections)
  }, [])

  const handleSkillChanged = useCallback(async () => {
    const installedSkills = await electronAPI.rescanSkills()
    setSkills(installedSkills)
  }, [])

  const persistCollections = useCallback(async (next: Record<string, string[]>) => {
    setCollections(next)
    await electronAPI.settingsSet("collections.skills", next)
  }, [])

  const handleCreateCollection = useCallback(() => {
    setCollectionDialog({
      open: true,
      mode: "create",
      initialName: "",
      targetName: null,
    })
  }, [])

  const handleRenameCollection = useCallback((name: string) => {
    setCollectionDialog({
      open: true,
      mode: "rename",
      initialName: name,
      targetName: name,
    })
  }, [])

  const handleDeleteCollection = useCallback((name: string) => {
    if (!window.confirm(translate(`Delete collection "${name}"?`))) return
    const next = { ...collections }
    delete next[name]
    if (selectedCollection === name) setSelectedCollection(null)
    void persistCollections(next)
  }, [collections, persistCollections, selectedCollection, translate])

  const handleToggleCollection = useCallback((name: string, skill: InstalledSkill) => {
    const existing = new Set(collections[name] || [])
    if (existing.has(skill.canonicalPath)) {
      existing.delete(skill.canonicalPath)
    } else {
      existing.add(skill.canonicalPath)
    }
    void persistCollections({
      ...collections,
      [name]: Array.from(existing).sort(),
    })
  }, [collections, persistCollections])

  const handleDropOnCollection = useCallback((name: string) => {
    if (!dragSkill) return
    const next = { ...collections }
    const target = new Set(next[name] || [])
    target.add(dragSkill.canonicalPath)
    next[name] = Array.from(target).sort()
    if (selectedCollection && selectedCollection !== name) {
      const source = new Set(next[selectedCollection] || [])
      if (source.has(dragSkill.canonicalPath)) {
        source.delete(dragSkill.canonicalPath)
        next[selectedCollection] = Array.from(source).sort()
      }
    }
    void persistCollections(next)
    setDragToast({
      type: "success",
      message:
        selectedCollection && selectedCollection !== name
          ? `Moved "${dragSkill.name}" to ${name}`
          : `Added "${dragSkill.name}" to ${name}`,
    })
    setDragSkill(null)
    setDragOverTarget(null)
  }, [collections, dragSkill, persistCollections, selectedCollection])

  const handleDropOnAgent = useCallback(async (agentDisplayName: string) => {
    if (!dragSkill) return
    const agent = agents.find((candidate) => candidate.displayName === agentDisplayName)
    if (agent?.isSharedSkillDirectory) {
      setDragToast({
        type: "success",
        message: `${agent.displayName} 直接使用通用 Skill 目录，无需重复适配`,
      })
      setDragSkill(null)
      setDragOverTarget(null)
      return
    }
    const registryKey =
      DISPLAY_NAME_TO_KEY[agentDisplayName] ||
      agentDisplayName.toLowerCase().replace(/\s+/g, "-")
    try {
      await electronAPI.addToAgent(dragSkill.name, dragSkill.canonicalPath, registryKey)
      const installedSkills = await electronAPI.listInstalled()
      setSkills(installedSkills)
      setDragToast({
        type: "success",
        message: `Added "${dragSkill.name}" to ${agentDisplayName}`,
      })
    } catch (err) {
      console.error("Failed to add skill to agent:", err)
      setDragToast({
        type: "error",
        message: `Failed to add "${dragSkill.name}" to ${agentDisplayName}`,
      })
    } finally {
      setDragSkill(null)
      setDragOverTarget(null)
    }
  }, [agents, dragSkill])

  useEffect(() => {
    if (!dragToast) return
    const timer = window.setTimeout(() => setDragToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [dragToast])

  const handleCreateSkill = useCallback(async (data: { name: string; description: string; content: string; targets: string[] }) => {
    await electronAPI.createSkill({
      name: data.name,
      description: data.description,
      content: data.content,
      agentNames: data.targets,
    })
    setShowCreateDialog(false)
    const installedSkills = await electronAPI.listInstalled()
    setSkills(installedSkills)
  }, [])

  const handleCollectionDialogSubmit = useCallback((name: string) => {
    if (!name) return

    if (collectionDialog.mode === "create") {
      if (collections[name]) {
        setCollectionDialog((prev) => ({ ...prev, open: false }))
        return
      }
      void persistCollections({ ...collections, [name]: [] })
      setCollectionDialog((prev) => ({ ...prev, open: false }))
      return
    }

    const sourceName = collectionDialog.targetName
    if (!sourceName || sourceName === name) {
      setCollectionDialog((prev) => ({ ...prev, open: false }))
      return
    }

    const next = { ...collections }
    next[name] = next[sourceName] || []
    delete next[sourceName]
    if (selectedCollection === sourceName) setSelectedCollection(name)
    void persistCollections(next)
    setCollectionDialog((prev) => ({ ...prev, open: false }))
  }, [collectionDialog, collections, persistCollections, selectedCollection])

  // -- Multi-select handlers --

  const handleMultiSelectToggle = useCallback((skill: InstalledSkill, e: React.MouseEvent) => {
    const path = skill.canonicalPath
    // Ctrl/Cmd/Shift-click enters selection mode implicitly.
    setSelectionMode(true)

    if (e.shiftKey && lastMultiSelectIndex !== null) {
      // Shift+click: select range
      const currentIndex = filteredSkills.findIndex((s) => s.canonicalPath === path)
      if (currentIndex === -1) return
      const start = Math.min(lastMultiSelectIndex, currentIndex)
      const end = Math.max(lastMultiSelectIndex, currentIndex)
      setMultiSelected((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          next.add(filteredSkills[i].canonicalPath)
        }
        return next
      })
    } else {
      // Cmd/Ctrl+click or plain click while multi-select active: toggle single
      setMultiSelected((prev) => {
        const next = new Set(prev)
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        return next
      })
      const currentIndex = filteredSkills.findIndex((s) => s.canonicalPath === path)
      setLastMultiSelectIndex(currentIndex)
    }
  }, [filteredSkills, lastMultiSelectIndex])

  const handleMultiSelectAll = useCallback(() => {
    setMultiSelected(new Set(filteredSkills.map((s) => s.canonicalPath)))
    setLastMultiSelectIndex(null)
  }, [filteredSkills])

  // 选择 button: enters selection mode; 完成 exits and clears the selection.
  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((current) => {
      if (current) {
        setMultiSelected(new Set())
        setLastMultiSelectIndex(null)
      }
      return !current
    })
  }, [])

  const handleMultiSelectClear = useCallback(() => {
    setMultiSelected(new Set())
    setLastMultiSelectIndex(null)
  }, [])

  // Clear multi-selection when the filtered list changes significantly
  useEffect(() => {
    if (multiSelected.size === 0) return
    const visiblePaths = new Set(filteredSkills.map((s) => s.canonicalPath))
    setMultiSelected((prev) => {
      const next = new Set<string>()
      for (const path of prev) {
        if (visiblePaths.has(path)) next.add(path)
      }
      if (next.size === prev.size) return prev
      return next
    })
  }, [filteredSkills, multiSelected.size])

  const handleBulkAddToCollection = useCallback((collectionName: string) => {
    const next = { ...collections }
    const target = new Set(next[collectionName] || [])
    for (const path of multiSelected) {
      target.add(path)
    }
    next[collectionName] = Array.from(target).sort()
    void persistCollections(next)
    setMultiSelected(new Set())
    setLastMultiSelectIndex(null)
  }, [collections, multiSelected, persistCollections])

  const handleBulkCreateCollection = useCallback(() => {
    setPendingBulkCollection(true)
    setCollectionDialog({
      open: true,
      mode: "create",
      initialName: "",
      targetName: null,
    })
  }, [])

  const handleBulkFavorite = useCallback(async () => {
    const selectedNames = skills
      .filter((skill) => multiSelected.has(skill.canonicalPath))
      .map((skill) => skill.name)
    if (selectedNames.length === 0) return

    try {
      const savedFavorites = await electronAPI.favoritesAddMany(selectedNames)
      setFavorites(new Set(savedFavorites))
      setDragToast({ type: "success", message: `已收藏 ${selectedNames.length} 个 Skill` })
    } catch (error) {
      console.error("Failed to bulk favorite skills:", error)
      setDragToast({ type: "error", message: "批量收藏失败" })
    }
  }, [multiSelected, skills])

  const handleBulkAdaptToAgent = useCallback(async (agent: DetectedAgent) => {
    const selectedSkills = skills.filter((skill) => multiSelected.has(skill.canonicalPath))
    const toAdapt = selectedSkills.filter((skill) =>
      !getAdaptedAgentNames(skill).includes(agent.displayName),
    )
    if (toAdapt.length === 0) return

    setBulkAgentBusy(agent.name)
    let adapted = 0
    let failed = 0
    try {
      for (const skill of toAdapt) {
        try {
          await electronAPI.addToAgent(skill.name, skill.canonicalPath, agent.name)
          adapted += 1
        } catch (error) {
          failed += 1
          console.error(`Failed to adapt ${skill.name} to ${agent.displayName}:`, error)
        }
      }
      const installedSkills = await electronAPI.rescanSkills()
      setSkills(installedSkills)
      setDragToast({
        type: failed > 0 && adapted === 0 ? "error" : "success",
        message: failed > 0
          ? `已适配 ${adapted} 个 Skill，${failed} 个失败`
          : `已将 ${adapted} 个 Skill 适配到 ${agent.displayName}`,
      })
    } finally {
      setBulkAgentBusy(null)
    }
  }, [multiSelected, skills])

  // Extend handleCollectionDialogSubmit to also handle pending bulk adds
  const handleCollectionDialogSubmitWrapped = useCallback((name: string) => {
    handleCollectionDialogSubmit(name)

    if (pendingBulkCollection && name.trim()) {
      // After creating the collection, add the selected skills to it
      const collectionName = name.trim()
      // Need to schedule this for after the collection is persisted
      setTimeout(() => {
        const next = { ...collections }
        if (!next[collectionName]) next[collectionName] = []
        const target = new Set(next[collectionName])
        for (const path of multiSelected) {
          target.add(path)
        }
        next[collectionName] = Array.from(target).sort()
        void persistCollections(next)
        setMultiSelected(new Set())
        setLastMultiSelectIndex(null)
      }, 0)
      setPendingBulkCollection(false)
    }
  }, [handleCollectionDialogSubmit, pendingBulkCollection, collections, multiSelected, persistCollections])

  const handleBulkDelete = useCallback(() => {
    setShowBulkDeleteDialog(true)
  }, [])

  const handleBulkDeleteConfirm = useCallback(async () => {
    const pathsToDelete = new Set(multiSelected)
    const skillsToDelete = skills
      .filter((s) => pathsToDelete.has(s.canonicalPath))

    const failures: string[] = []
    for (const skill of skillsToDelete) {
      try {
        const result = await electronAPI.removeSkill(createSkillRemovalRequest(skill))
        failures.push(...result.errors.map((error) => `${skill.name}: ${error.message}`))
      } catch (err) {
        console.error(`Failed to remove skill "${skill.name}":`, err)
        failures.push(`${skill.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // If the currently viewed skill was deleted, clear it
    if (selectedSkill && pathsToDelete.has(selectedSkill.canonicalPath)) {
      setSelectedSkillPath(null)
      setSkillContent(null)
      setSelectedSupportingFiles([])
    }

    setShowBulkDeleteDialog(false)
    setMultiSelected(new Set())
    setLastMultiSelectIndex(null)

    try {
      const installedSkills = await electronAPI.rescanSkills()
      setSkills(installedSkills)
      setCollections(await electronAPI.settingsGet("collections.skills", {} as Record<string, string[]>))
      if (failures.length > 0) {
        setDragToast({ type: "error", message: `部分删除失败：${failures.join("；")}` })
      }
    } catch (err) {
      console.error("Failed to refresh skills after bulk removal:", err)
    }
  }, [multiSelected, selectedSkill, skills])

  const handleBulkRemoveFromAgent = useCallback(async () => {
    if (!selectedAgent) return
    const selectedAgentEntry = agents.find((agent) => agent.displayName === selectedAgent)
    if (selectedAgentEntry?.isSharedSkillDirectory) {
      setShowBulkDeleteDialog(false)
      setDragToast({
        type: "success",
        message: `${selectedAgent} 直接使用通用 Skill 目录，不存在可取消的独立适配`,
      })
      return
    }
    const registryKey =
      DISPLAY_NAME_TO_KEY[selectedAgent] ||
      selectedAgent.toLowerCase().replace(/\s+/g, "-")
    const pathsToRemove = new Set(multiSelected)
    const skillsToRemove = skills
      .filter((s) => pathsToRemove.has(s.canonicalPath))

    const failures: string[] = []
    for (const skill of skillsToRemove) {
      try {
        await electronAPI.removeFromAgent(createSkillRemovalRequest(skill), registryKey)
      } catch (err) {
        console.error(`Failed to remove skill "${skill.name}" from ${selectedAgent}:`, err)
        failures.push(`${skill.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (selectedSkill && pathsToRemove.has(selectedSkill.canonicalPath)) {
      setSelectedSkillPath(null)
      setSkillContent(null)
      setSelectedSupportingFiles([])
    }

    setShowBulkDeleteDialog(false)
    setMultiSelected(new Set())
    setLastMultiSelectIndex(null)

    try {
      const installedSkills = await electronAPI.rescanSkills()
      setSkills(installedSkills)
      if (failures.length > 0) {
        setDragToast({ type: "error", message: `部分取消适配失败：${failures.join("；")}` })
      }
    } catch (err) {
      console.error("Failed to refresh skills after bulk removal:", err)
    }
  }, [agents, multiSelected, selectedAgent, selectedSkill, skills])

  // Keyboard shortcuts: Escape to clear selection, Cmd/Ctrl+A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape clears multi-selection
      if (e.key === "Escape" && multiSelected.size > 0) {
        e.preventDefault()
        setMultiSelected(new Set())
        setLastMultiSelectIndex(null)
        return
      }

      // Cmd/Ctrl+A selects all visible skills when the skill list is focused
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        const listEl = skillListRef.current
        if (listEl && listEl.contains(document.activeElement)) {
          e.preventDefault()
          setMultiSelected(new Set(filteredSkills.map((s) => s.canonicalPath)))
          setLastMultiSelectIndex(null)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [multiSelected, filteredSkills])

  const handleOpenCreateSkill = useCallback(() => {
    setShowCreateDialog(true)
  }, [])

  const handleDragSkillStart = useCallback((skill: InstalledSkill) => {
    setDragSkill({ name: skill.name, canonicalPath: skill.canonicalPath })
  }, [])

  const handleDragSkillEnd = useCallback(() => {
    setDragSkill(null)
    setDragOverTarget(null)
  }, [])

  return (
    <div className="flex h-full">
      {/* Column 1: Left sidebar (filter panel) */}
      <MemoizedLeftSidebar
        totalSkillCount={skills.length}
        favoritesCount={installedFavoritesCount}
        detectedAgents={agents}
        agentSkillCounts={agentSkillCounts}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        collections={collections}
        collectionCounts={collectionCounts}
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        onCreateCollection={handleCreateCollection}
        onRenameCollection={handleRenameCollection}
        onDeleteCollection={handleDeleteCollection}
        dragSkill={dragSkill}
        dragOverTarget={dragOverTarget}
        onDragEnterTarget={setDragOverTarget}
        onDropOnAgent={handleDropOnAgent}
        onDropOnCollection={handleDropOnCollection}
      />

      {/* Column 2: Skill list */}
      <MemoizedMiddlePanel
        loading={loading}
        agents={agents}
        skills={skills}
        filteredSkills={filteredSkills}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSkillPath={selectedSkill?.canonicalPath ?? null}
        onSelectSkill={handleSelectSkill}
        selectedAgent={selectedAgent}
        selectedCollection={selectedCollection}
        activeFilter={activeFilter}
        scopeFilter={scopeFilter}
        scopeCounts={scopeCounts}
        onScopeFilterChange={handleScopeFilterChange}
        projectNames={projectNames}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        onClearFilters={handleClearFilters}
        onCreateSkill={handleOpenCreateSkill}
        onImportPackage={handleImportPackage}
        onExportPackage={handleExportPackage}
        onRefresh={handleRefresh}
        onOpenScanSources={() => setShowScanSources(true)}
        refreshing={refreshing}
        migrationBusy={migrationBusy}
        dragSkill={dragSkill}
        onDragSkillStart={handleDragSkillStart}
        onDragSkillEnd={handleDragSkillEnd}
        multiSelected={multiSelected}
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        onMultiSelectToggle={handleMultiSelectToggle}
        onMultiSelectAll={handleMultiSelectAll}
        onMultiSelectClear={handleMultiSelectClear}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        collections={collections}
        onBulkAddToCollection={handleBulkAddToCollection}
        onBulkCreateCollection={handleBulkCreateCollection}
        onBulkFavorite={handleBulkFavorite}
        onBulkAdaptToAgent={handleBulkAdaptToAgent}
        bulkAgentBusy={bulkAgentBusy}
        onBulkDelete={handleBulkDelete}
        listRef={skillListRef}
      />

      {/* Column 3: Skill detail */}
      {selectedSkillForDisplay && (
        <MemoizedRightPanel
          skill={selectedSkillForDisplay}
          content={skillContent}
          contentLoading={contentLoading}
          supportingFiles={selectedSupportingFiles}
          collections={collections}
          onContentSaved={handleContentSaved}
          onSkillRemoved={handleSkillRemoved}
          onSkillChanged={handleSkillChanged}
          onClose={() => setSelectedSkillPath(null)}
          availableAgents={agents}
          onToggleCollection={handleToggleCollection}
          onCreateCollection={handleCreateCollection}
        />
      )}

      {migrationDialog && (
        <MigrationDialog
          state={migrationDialog}
          progress={migrationProgress}
          counts={{ all: scopeCounts.all, global: scopeCounts.global, project: scopeCounts.project }}
          selectedCount={multiSelected.size}
          onScopeChange={(scope) => {
            setMigrationDialog((current) =>
              current?.mode === "export" ? { ...current, scope } : current,
            )
          }}
          onConfirmExport={() => void handleConfirmExport()}
          onConfirmImport={() => void handleConfirmImport()}
          onClose={() => {
            setMigrationDialog(null)
            setMigrationProgress(null)
          }}
        />
      )}

      <CreateSkillDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        agents={agents.filter((agent) => !agent.isSharedSkillDirectory)}
        defaultTargets={defaultAgents}
        onCreate={handleCreateSkill}
      />

      <ScanSourcesDialog
        open={showScanSources}
        onClose={() => setShowScanSources(false)}
        onRescan={handleRefresh}
      />

      <CollectionDialog
        open={collectionDialog.open}
        mode={collectionDialog.mode}
        initialName={collectionDialog.initialName}
        onClose={() => {
          setCollectionDialog((prev) => ({ ...prev, open: false }))
          setPendingBulkCollection(false)
        }}
        onSubmit={handleCollectionDialogSubmitWrapped}
      />

      {showBulkDeleteDialog && (
        <BulkDeleteDialog
          count={multiSelected.size}
          selectedAgent={selectedAgent}
          selectedAgentCanBeUnbound={Boolean(
            selectedAgent && skills
              .filter((skill) => multiSelected.has(skill.canonicalPath))
              .some((skill) => getAdaptedAgentNames(skill).includes(selectedAgent)),
          )}
          onConfirm={handleBulkDeleteConfirm}
          onRemoveFromAgent={handleBulkRemoveFromAgent}
          onCancel={() => setShowBulkDeleteDialog(false)}
        />
      )}

      {dragSkill && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 rounded-full border border-accent/40 bg-surface px-4 py-2 text-[12px] text-foreground shadow-lg">
          Dragging “{dragSkill.name}”
        </div>
      )}

      {dragToast && (
        <div
          className={`pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border px-4 py-2 text-[12px] shadow-lg ${
            dragToast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-100"
              : "border-red-500/30 bg-red-950/80 text-red-100"
          }`}
        >
          {dragToast.message}
        </div>
      )}
    </div>
  )
}
