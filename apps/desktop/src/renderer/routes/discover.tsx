import {
  memo,
  useDeferredValue,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react"
import { marked } from "marked"
import { NavLink } from "react-router-dom"
import { electronAPI } from "../lib/electron-api"
import { AgentLogo } from "../components/agent-logo"
import { SidebarUtilities, SkillboxBrand } from "../components/skillbox-brand"
import {
  createInstalledMarketplaceState,
  formatInstallProgress,
  isMarketplaceSkillInstalled,
  marketplaceKey,
  mergeInstallTask,
  type InstalledMarketplaceState,
  type InstallTaskState,
} from "../lib/marketplace-state"
import {
  matchIntent,
  prewarmIntentModel,
  type IntentResult,
  type IntentSkill,
} from "../lib/intent-matcher"

// ---------------------------------------------------------------------------
// Types matching the skills.sh response shape
// ---------------------------------------------------------------------------

interface CatalogSkill {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
  // Only present in trending data; live search results omit it.
  isOfficial?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInstalls(installs: number): string {
  if (installs >= 1000) {
    return `${(installs / 1000).toFixed(1).replace(/\.0$/, "")}k`
  }
  return String(installs)
}

// Configure marked for synchronous rendering
marked.setOptions({ async: false, breaks: true, gfm: true })

function sanitizeHtml(html: string): string {
  let clean = html.replace(
    /<(script|iframe|object|embed|form|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
    ""
  )
  clean = clean.replace(/<(script|iframe|object|embed|link)\b[^>]*\/?>/gi, "")
  clean = clean.replace(
    /\s+on\w+\s*=\s*["']?[^"'>\s]*["']?/gi,
    ""
  )
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
  clean = clean.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="')
  return clean
}

function renderMarkdown(raw: string): string {
  let content = raw
  if (content.startsWith("---")) {
    const endIdx = content.indexOf("---", 3)
    if (endIdx !== -1) {
      content = content.slice(endIdx + 3).trim()
    }
  }
  return sanitizeHtml(marked.parse(content) as string)
}

// Case-insensitive substring filter across name, skillId, and source.
// Mirrors the shared filterSkills behaviour used by the trending browse.
function filterSkills(skills: CatalogSkill[], query: string): CatalogSkill[] {
  const q = query.trim().toLowerCase()
  if (!q) return skills
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.skillId.toLowerCase().includes(q) ||
      s.source.toLowerCase().includes(q),
  )
}

function dedupeCatalogSkills(skills: CatalogSkill[]): CatalogSkill[] {
  const seen = new Set<string>()
  const deduped: CatalogSkill[] = []

  for (const skill of skills) {
    if (seen.has(skill.id)) {
      continue
    }
    seen.add(skill.id)
    deduped.push(skill)
  }

  return deduped
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
  )
}

// Verified badge shown for official skills. Matches lucide-react's BadgeCheck
// glyph; rendered inline to stay consistent with the other icons in this file.
function BadgeCheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-500 flex-shrink-0"
      aria-label="Official"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function OfficialBadge() {
  return (
    <span className="official-badge relative inline-flex flex-shrink-0 items-center">
      <BadgeCheckIcon />
      <span
        role="tooltip"
        className="official-tooltip pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground shadow-lg"
      >
        Skill by a verified organization
      </span>
    </span>
  )
}

function InstallsIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Skill Card (catalog grid item)
// ---------------------------------------------------------------------------

interface SkillCardProps {
  skill: CatalogSkill
  onSelect: (skill: CatalogSkill) => void
  installedState: InstalledMarketplaceState
}

const SkillCard = memo(function SkillCard({
  skill,
  onSelect,
  installedState,
}: SkillCardProps) {
  const isInstalled = isMarketplaceSkillInstalled(installedState, skill)

  return (
    <button
      onClick={() => onSelect(skill)}
      className="skillbox-market-card"
    >
      {/* Name + installs row */}
      <div className="flex items-center gap-2">
        <h3 data-no-localize className="text-[13px] font-semibold text-foreground truncate">
          {skill.name}
        </h3>
        {skill.isOfficial && <OfficialBadge />}
        {isInstalled && (
          <span className="text-[11px] uppercase tracking-wider font-medium text-accent bg-surface-hover px-1.5 py-0.5 rounded flex-shrink-0">
            installed
          </span>
        )}
        {skill.installs > 0 && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-mono text-muted ml-auto">
            <InstallsIcon />
            {formatInstalls(skill.installs)}
          </span>
        )}
      </div>

      {/* Source + affordance row (single compact line) */}
      <div className="skillbox-market-card__footer">
        <span data-no-localize className="truncate font-mono">{skill.source}</span>
        <strong>详情 →</strong>
      </div>
    </button>
  )
})

function MarketSidebar({
  agents,
  selectedTargets,
  onToggleTarget,
  installedCount,
}: {
  agents: DetectedAgent[]
  selectedTargets: string[]
  onToggleTarget: (name: string) => void
  installedCount: number
}) {
  return (
    <aside className="skillbox-sidebar">
      <div className="skillbox-sidebar__scroll">
        <SkillboxBrand />
        <section className="skillbox-nav-section">
          <h3>Library</h3>
          <NavLink to="/" className="skillbox-library-button">
            <span>⌘ All Skills</span><strong>{installedCount}</strong>
          </NavLink>
        </section>
        <section className="skillbox-nav-section skillbox-agent-section">
          <h3>Install to <span>选择安装目标</span></h3>
          <div className="flex flex-col gap-1.5">
            {agents.map((agent) => {
              const selected = selectedTargets.includes(agent.name)
              return (
                <button
                  key={agent.name}
                  type="button"
                  className={`skillbox-agent-button ${selected ? "is-active" : ""}`}
                  onClick={() => onToggleTarget(agent.name)}
                  aria-pressed={selected}
                >
                  <AgentLogo name={agent.displayName} size={25} />
                  <span data-no-localize className="truncate">{agent.displayName}</span>
                  <i className="skillbox-target-dot" />
                </button>
              )
            })}
          </div>
        </section>
      </div>
      <div className="skillbox-market-area">
        <p>Market</p>
        <div className="skillbox-market-button is-active">
          <span>▣ Skill Market</span><small>在线目录</small>
        </div>
        <SidebarUtilities />
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Agent Dropdown (multi-select for install targets)
// ---------------------------------------------------------------------------

interface DetectedAgent {
  name: string
  displayName: string
}

function AgentDropdown({
  agents,
  selected,
  defaults,
  onToggle,
  disabled = false,
}: {
  agents: DetectedAgent[]
  selected: string[]
  defaults: string[]
  onToggle: (name: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const label =
    selected.length === 0
      ? "No agents selected"
      : selected.length === agents.length
        ? `All agents (${agents.length})`
        : `${selected.length} agent${selected.length > 1 ? "s" : ""} selected`

  return (
    <div ref={ref} className="relative">
      <p className="text-[12px] font-medium text-foreground mb-2">
        Install targets
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-foreground hover:border-accent/30 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
      >
        <span>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {agents.map((agent) => (
              <button
                key={agent.name}
                type="button"
                onClick={() => onToggle(agent.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-surface-hover transition-colors"
              >
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selected.includes(agent.name)
                      ? "bg-accent border-accent text-background"
                      : "border-border"
                  }`}
                >
                  {selected.includes(agent.name) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{agent.displayName}</span>
                {defaults.includes(agent.name) && (
                  <span className="ml-auto text-[11px] text-muted">default</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill Detail Panel (slide-over from the right)
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  skill: CatalogSkill
  availableAgents: DetectedAgent[]
  defaultAgents: string[]
  onClose: () => void
  installedState: InstalledMarketplaceState
  getCachedContent: (key: string) => string | null | undefined
  cacheContent: (key: string, content: string | null) => void
  onInstall: (source: string, skillId: string, agentNames: string[]) => Promise<void>
  installTask?: SkillInstallProgress
}

function DetailPanel({
  skill,
  availableAgents,
  defaultAgents,
  onClose,
  installedState,
  getCachedContent,
  cacheContent,
  onInstall,
  installTask,
}: DetailPanelProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const cacheKey = `${skill.source}:${skill.skillId}`
  const [content, setContent] = useState<string | null>(
    getCachedContent(cacheKey) ?? null,
  )
  const [loading, setLoading] = useState(getCachedContent(cacheKey) === undefined)
  const installing = installTask?.status === "running"
  const installError = installTask?.status === "failed" ? installTask.error : null
  const installed =
    isMarketplaceSkillInstalled(installedState, skill) ||
    installTask?.status === "completed"

  // Fetch SKILL.md content from GitHub raw
  useEffect(() => {
    const cachedContent = getCachedContent(cacheKey)
    if (cachedContent !== undefined) {
      setContent(cachedContent)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setContent(null)

    electronAPI.fetchSkillContent(skill.source, skill.skillId)
      .then((text) => {
        if (!cancelled) {
          setContent(text)
          if (text) cacheContent(cacheKey, text)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheContent, cacheKey, getCachedContent, skill.skillId, skill.source])

  useEffect(() => {
    setSelectedAgents(
      installTask?.agentNames.length ? installTask.agentNames : defaultAgents,
    )
  }, [defaultAgents, installTask?.key, skill.skillId])

  const renderedContent = useMemo(
    () => (content ? renderMarkdown(content) : ""),
    [content],
  )

  function handleInstall() {
    if (!skill.source) return

    console.log("[discover/detail] install clicked", {
      source: skill.source,
      selectedAgents,
    })
    void onInstall(skill.source, skill.skillId, selectedAgents).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[discover/detail] install failed", {
        source: skill.source,
        error: err,
        message: msg,
      })
    })
  }

  function toggleAgent(name: string) {
    setSelectedAgents((prev) =>
      prev.includes(name)
        ? prev.filter((value) => value !== name)
        : [...prev, name],
    )
  }

  const githubUrl = `https://github.com/${skill.source}`

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-[560px] max-w-[90vw] flex flex-col bg-background border-l border-border overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <ArrowLeftIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2 data-no-localize className="text-base font-bold text-foreground truncate">
              {skill.name}
            </h2>
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground transition-colors"
          >
            GitHub <ExternalLinkIcon />
          </a>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Meta */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <span data-no-localize className="text-[12px] font-mono text-muted">
                {skill.source}
              </span>
              {skill.installs > 0 && (
                <span className="flex items-center gap-1 text-[12px] font-mono text-muted">
                  <InstallsIcon /> {formatInstalls(skill.installs)} installs
                </span>
              )}
            </div>

            {/* Install button */}
            <div className="flex items-center gap-3 mb-4">
              {installed ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-surface-hover text-muted border border-border">
                  <CheckIcon /> Installed
                </span>
              ) : (
                <button
                  onClick={handleInstall}
                  disabled={installing || selectedAgents.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {installing ? (
                    <>
                      <SpinnerIcon /> Installing...
                    </>
                  ) : (
                    <>
                      <DownloadIcon /> Install
                    </>
                  )}
                </button>
              )}

              <code className="text-[12px] font-mono text-muted bg-surface px-2.5 py-1.5 rounded border border-border">
                $ npx skills add {skill.source}
              </code>
            </div>

            {!installed && availableAgents.length > 0 && (
              <AgentDropdown
                agents={availableAgents}
                selected={selectedAgents}
                defaults={defaultAgents}
                onToggle={toggleAgent}
                disabled={installing}
              />
            )}

            {installError && (
              <p className="text-[12px] text-red-400 mt-3">{installError}</p>
            )}
            {installing && installTask && (
              <p
                className="text-[12px] text-muted mt-3"
                role="status"
                aria-live="polite"
              >
                {formatInstallProgress(installTask)}
              </p>
            )}
          </div>

          <hr className="border-border mb-5" />

          {/* Markdown content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <SpinnerIcon />
            </div>
          ) : content ? (
            <div
              className="skill-prose text-[13px]"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          ) : (
            <p className="text-sm text-muted">
              Skill content not available.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function BackgroundInstallTasks({
  tasks,
  onOpen,
  onDismiss,
}: {
  tasks: SkillInstallProgress[]
  onOpen: (task: SkillInstallProgress) => void
  onDismiss: (key: string) => void
}) {
  if (tasks.length === 0) return null

  return (
    <div className="skillbox-market-install-tasks" aria-live="polite">
      {tasks.map((task) => (
        <div
          key={task.key}
          className={`skillbox-market-install-task ${task.status === "failed" ? "is-failed" : ""}`}
        >
          <button type="button" onClick={() => onOpen(task)}>
            <span className="skillbox-market-install-task__icon">
              {task.status === "running" ? <SpinnerIcon /> : "!"}
            </span>
            <span className="skillbox-market-install-task__body">
              <strong data-no-localize>{task.skillId}</strong>
              <small>
                {task.status === "failed"
                  ? task.error || "安装失败，点击查看"
                  : formatInstallProgress(task)}
              </small>
            </span>
          </button>
          {task.status === "failed" && (
            <button
              type="button"
              className="skillbox-market-install-task__dismiss"
              aria-label={`关闭 ${task.skillId} 的失败提示`}
              onClick={() => onDismiss(task.key)}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Intent Matching （颠覆版：用户说需求，系统从仓库自动匹配技能）
// ---------------------------------------------------------------------------

interface IntentMatcherProps {
  corpus: CatalogSkill[]
  installedState: InstalledMarketplaceState
  installTasks: InstallTaskState<SkillInstallProgress>
  effectiveAgents: string[]
  onInstall: (source: string, skillId: string, agentNames: string[]) => Promise<void>
  onOpenDetail: (skill: CatalogSkill) => void
}

// 单个意图匹配结果卡片：展示匹配度 + 「是什么 / 有什么用 / 怎么用」三段介绍
// + 一键安装 / 查看详情。介绍默认用元数据生成，可展开拉取 SKILL.md 完整内容。
const IntentResultCard = memo(function IntentResultCard({
  result,
  installedState,
  installTask,
  effectiveAgents,
  onInstall,
  onOpenDetail,
}: {
  result: IntentResult
  installedState: InstalledMarketplaceState
  installTask?: SkillInstallProgress
  effectiveAgents: string[]
  onInstall: (source: string, skillId: string, agentNames: string[]) => Promise<void>
  onOpenDetail: (skill: CatalogSkill) => void
}) {
  const skill = result.skill as CatalogSkill
  const installed =
    isMarketplaceSkillInstalled(installedState, skill) ||
    installTask?.status === "completed"
  const installing = installTask?.status === "running"
  const canInstall = effectiveAgents.length > 0

  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  const matchPct = Math.max(0, Math.min(100, Math.round(result.score * 100)))

  async function toggleExpand() {
    if (!expanded && content === null && !loadingContent) {
      setLoadingContent(true)
      try {
        const text = await electronAPI.fetchSkillContent(skill.source, skill.skillId)
        setContent(text)
      } catch {
        setContent(null)
      } finally {
        setLoadingContent(false)
      }
    }
    setExpanded((v) => !v)
  }

  const rendered = useMemo(
    () => (content ? renderMarkdown(content) : ""),
    [content],
  )

  function handleInstall() {
    if (!canInstall) return
    void onInstall(skill.source, skill.skillId, effectiveAgents).catch((err) => {
      console.error("[intent] install failed", err)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-[13px] font-bold"
          title="语义匹配度"
        >
          {matchPct}%
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 data-no-localize className="text-[13px] font-semibold text-foreground truncate">
              {skill.name}
            </h3>
            {skill.isOfficial && <OfficialBadge />}
            {skill.installs > 0 && (
              <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-mono text-muted ml-auto">
                <InstallsIcon />
                {formatInstalls(skill.installs)}
              </span>
            )}
          </div>
          <p data-no-localize className="text-[11px] font-mono text-muted mt-0.5 truncate">
            {skill.source}
          </p>

          {/* 三段式核心介绍 */}
          <div className="mt-2 space-y-1 text-[12px] text-foreground/90 leading-relaxed">
            <p>
              <b className="text-foreground">是什么：</b>
              {skill.name} 是来自 {skill.source} 的 Agent 技能（标识 {skill.skillId}）。
            </p>
            <p>
              <b className="text-foreground">有什么用：</b>
              用于「{skill.skillId}」相关的任务场景，由 SKILL.md 中定义的流程与知识驱动。
            </p>
            <p>
              <b className="text-foreground">怎么用：</b>
              <code className="font-mono text-[12px] bg-background px-1.5 py-0.5 rounded border border-border">
                npx skills add {skill.source}
              </code>
              ，或点击下方「一键安装」。
            </p>
          </div>

          <button
            type="button"
            onClick={toggleExpand}
            className="mt-2 text-[12px] text-accent hover:underline"
          >
            {expanded ? "收起完整介绍（SKILL.md）" : "展开完整介绍（SKILL.md）"}
          </button>
          {expanded &&
            (loadingContent ? (
              <div className="flex items-center py-3">
                <SpinnerIcon />
              </div>
            ) : content ? (
              <div
                className="skill-prose text-[12px] mt-2 border-t border-border pt-2"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            ) : (
              <p className="text-[12px] text-muted mt-2">该技能暂无可显示的介绍内容。</p>
            ))}

          <div className="flex items-center gap-2 mt-3">
            {installed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-surface-hover text-muted border border-border">
                <CheckIcon /> 已安装
              </span>
            ) : (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing || !canInstall}
                title={canInstall ? "" : "请先在左侧选择安装目标"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {installing ? (
                  <>
                    <SpinnerIcon /> 安装中…
                  </>
                ) : (
                  <>
                    <DownloadIcon /> 一键安装
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDetail(skill)}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-border text-foreground hover:bg-surface-hover transition-colors"
            >
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

function IntentMatcher({
  corpus,
  installedState,
  installTasks,
  effectiveAgents,
  onInstall,
  onOpenDetail,
}: IntentMatcherProps) {
  const [query, setQuery] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [results, setResults] = useState<IntentResult[]>([])
  const [usedModel, setUsedModel] = useState<boolean | null>(null)
  const [matching, setMatching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void prewarmIntentModel()
  }, [])

  async function handleMatch() {
    const q = query.trim()
    if (!q) return
    setMatching(true)
    setError(null)
    try {
      const { results, usedModel } = await matchIntent(q, corpus as IntentSkill[], 8)
      setResults(results)
      setUsedModel(usedModel)
      setHasSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setMatching(false)
    }
  }

  function onImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-[14px] font-semibold text-foreground">
          用一句话描述你想要什么，AI 帮你从技能库里挑最匹配的
        </h3>
        <p className="text-[12px] text-muted mt-1">
          例如：「我想给 React 组件写测试」「帮我做一份中式药膳汤谱」「把这段 TypeScript 重构得更干净」。
        </p>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleMatch()
          }}
          rows={3}
          placeholder="说需求，不用想技能名…"
          className="mt-3 w-full resize-none rounded-lg bg-background border border-border px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
        />

        {/* 图片：辅助参考，不参与语义匹配 */}
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-border text-foreground hover:bg-surface-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20" />
            </svg>
            添加图片（辅助参考）
          </button>
          {image && (
            <div className="relative">
              <img
                src={image}
                alt="attached"
                className="h-12 w-12 rounded-md object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background text-[10px] leading-none flex items-center justify-center"
                aria-label="移除图片"
              >
                ×
              </button>
            </div>
          )}
          <span className="text-[11px] text-muted">图片仅作参考，不参与语义匹配</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleMatch}
            disabled={matching || query.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {matching ? (
              <>
                <SpinnerIcon /> 匹配中…
              </>
            ) : (
              "开始匹配"
            )}
          </button>
          {usedModel !== null && hasSearched && (
            <span className="text-[11px] text-muted">
              {usedModel ? "语义模型匹配" : "关键词降级匹配（模型不可用）"}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-red-400 mt-3">{error}</p>
      )}

      {hasSearched && !matching && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted text-sm">没有匹配到相关 Skill，换个说法试试？</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-[12px] uppercase tracking-wider font-medium text-muted">
            匹配结果（{results.length}）
          </p>
          {results.map((r) => {
            const key = marketplaceKey(r.skill.source, r.skill.skillId)
            return (
              <IntentResultCard
                key={key}
                result={r}
                installedState={installedState}
                installTask={installTasks[key]}
                effectiveAgents={effectiveAgents}
                onInstall={onInstall}
                onOpenDetail={onOpenDetail}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Discover (main export)
// ---------------------------------------------------------------------------

export function Discover() {
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [activeQuery, setActiveQuery] = useState("")
  const [selectedSkill, setSelectedSkill] = useState<CatalogSkill | null>(null)
  const [availableAgents, setAvailableAgents] = useState<DetectedAgent[]>([])
  const [marketTargets, setMarketTargets] = useState<string[]>([])
  const [installedState, setInstalledState] = useState<InstalledMarketplaceState>(
    () => createInstalledMarketplaceState([]),
  )
  const [installTasks, setInstallTasks] = useState<
    InstallTaskState<SkillInstallProgress>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [trending, setTrending] = useState<CatalogSkill[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [officialOnly, setOfficialOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [viewMode, setViewMode] = useState<"trending" | "search" | "intent">(
    "trending",
  )

  // The skills.sh API honors `limit` but ignores offset/page/cursor, so a
  // bigger local result set means re-requesting from the top with a larger
  // limit. Pagination itself happens client-side over the merged list.
  const FETCH_BATCH = 120
  const PAGE_SIZE = 24
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentCacheRef = useRef(new Map<string, string | null>())
  const inFlightPageKeysRef = useRef(new Set<string>())
  const latestQueryRef = useRef("")

  function updateInstalledState(installed: InstalledSkill[]) {
    setInstalledState(createInstalledMarketplaceState(installed))
  }

  // Load installed skills to mark installed state
  useEffect(() => {
    const cleanup = electronAPI.onSkillsUpdated((updatedSkills) => {
      updateInstalledState(updatedSkills)
    })

    electronAPI.listInstalled().then((installed) => {
      updateInstalledState(installed)
    })

    return cleanup
  }, [])

  useEffect(() => {
    let active = true
    const cleanup = electronAPI.onSkillInstallProgress((task) => {
      if (active) setInstallTasks((current) => mergeInstallTask(current, task))
    })

    electronAPI.listSkillInstallTasks()
      .then((tasks) => {
        if (!active) return
        setInstallTasks((current) =>
          tasks.reduce((state, task) => mergeInstallTask(state, task), current),
        )
      })
      .catch(() => {})

    return () => {
      active = false
      cleanup()
    }
  }, [])

  useEffect(() => {
    Promise.all([
      electronAPI.detectAgents(),
      electronAPI.settingsGet("install.defaultAgents", [] as string[]),
    ])
      .then(([agents, defaults]) => {
        setAvailableAgents(agents)
        setMarketTargets(defaults)
      })
      .catch(() => {
        setAvailableAgents([])
        setMarketTargets([])
      })
  }, [])

  // Load the trending list once on mount so an idle Discover lands on a
  // populated, ranked browse instead of a search round-trip. Trending is an
  // enhancement, so a scrape failure is swallowed rather than surfaced.
  useEffect(() => {
    let cancelled = false
    electronAPI
      .fetchTrending()
      .catch(() => [] as CatalogSkill[])
      .then((items) => {
        if (cancelled) return
        setTrending(items)
        setIsLoadingTrending(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function fetchSkills(query: string, loaded: number) {
    const q = query.trim()
    if (q.length < 2) return
    const isNewSearch = loaded === 0
    const requestLimit = loaded + FETCH_BATCH
    const requestKey = `${q}:${requestLimit}`
    if (inFlightPageKeysRef.current.has(requestKey)) {
      return
    }
    inFlightPageKeysRef.current.add(requestKey)

    if (isNewSearch) {
      setLoading(true)
      setActiveQuery(q)
      latestQueryRef.current = q
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const data = await electronAPI.searchCatalog(q, requestLimit, 0)
      if (latestQueryRef.current !== q) {
        return
      }
      setSkills(dedupeCatalogSkills(data.skills))
      // A short page is the only reliable "no more results" signal: the API's
      // count field is just the page size, not a catalog total.
      setHasMore(data.skills.length >= requestLimit)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Search failed: ${msg}`)
      console.error("Fetch error:", err)
    } finally {
      inFlightPageKeysRef.current.delete(requestKey)
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const trimmedQuery = deferredSearchQuery.trim()
  const isSearching = trimmedQuery.length >= 2
  const effectiveSearching = viewMode === "search" && isSearching

  // Auto-search as the user types (debounced). Previously only Enter started
  // a search, and the grid kept showing the previous query's results, which
  // read as "searching the same 30 skills no matter what you type".
  useEffect(() => {
    if (viewMode !== "search" || !isSearching || trimmedQuery === activeQuery) return
    const timer = setTimeout(() => {
      setPage(1)
      fetchSkills(trimmedQuery, 0)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery, isSearching, activeQuery, viewMode])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim()
    if (q.length >= 2 && q !== activeQuery) {
      setPage(1)
      fetchSkills(q, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeQuery])

  // Back-to-top visibility
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      setShowBackToTop(el.scrollTop > 400)
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  // A new query or filter always lands on the first page.
  useEffect(() => {
    setPage(1)
  }, [trimmedQuery, officialOnly])

  async function handleInstall(source: string, skillId: string, agentNames: string[]) {
    console.log("[discover] starting install", { source, skillId, agentNames })
    const key = marketplaceKey(source, skillId)
    const now = Date.now()
    const initialTask: SkillInstallProgress = {
      key,
      source,
      skillId,
      agentNames: [...agentNames],
      status: "running",
      stage: "preparing",
      completed: 0,
      total: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      startedAt: now,
      updatedAt: now,
    }
    setInstallTasks((current) => mergeInstallTask(current, initialTask))

    try {
      const results = await electronAPI.installSkill(source, skillId, agentNames, "global")
      const failed = results.filter((r: { success: boolean }) => !r.success)
      if (failed.length > 0) {
        const errorMsg = failed.map((r: { error?: string }) => r.error).join(", ")
        throw new Error(errorMsg)
      }

      const installed = await electronAPI.rescanSkills()
      console.log("[discover] installed skills after install", installed)
      updateInstalledState(installed)
      setInstallTasks((current) => mergeInstallTask(current, {
        ...(current[key] || initialTask),
        status: "completed",
        stage: "complete",
        error: undefined,
        updatedAt: Date.now(),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setInstallTasks((current) => mergeInstallTask(current, {
        ...(current[key] || initialTask),
        status: "failed",
        stage: "failed",
        error: message,
        updatedAt: Date.now(),
      }))
      throw error
    }
  }

  const openInstallTask = useCallback((task: SkillInstallProgress) => {
    setSelectedSkill({
      id: `install:${task.key}`,
      skillId: task.skillId,
      name: task.skillId,
      installs: 0,
      source: task.source,
    })
  }, [])

  const dismissInstallTask = useCallback((key: string) => {
    setInstallTasks((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    void electronAPI.dismissSkillInstallTask(key)
  }, [])

  const getCachedContent = useCallback((key: string) => {
    return contentCacheRef.current.get(key)
  }, [])

  const cacheContent = useCallback((key: string, content: string | null) => {
    contentCacheRef.current.set(key, content)
  }, [])

  const toggleMarketTarget = useCallback((name: string) => {
    setMarketTargets((current) => {
      const next = current.includes(name)
        ? current.filter((value) => value !== name)
        : [...current, name]
      void electronAPI.settingsSet("install.defaultAgents", next)
      return next
    })
  }, [])

  // The skills shown, before pagination:
  //  - query < 2 chars: the cached/scraped trending list (ranked).
  //  - query >= 2 chars: trending matches first, then live search results
  //    whose id isn't already present. API results are only merged once they
  //    belong to the query currently in the box -- showing the previous
  //    query's results looked like the search ignored what you typed.
  const visibleSkills = useMemo(() => {
    let merged: CatalogSkill[]
    if (!isSearching) {
      merged = trending
    } else {
      const fromTrending = filterSkills(trending, trimmedQuery)
      const seen = new Set(fromTrending.map((s) => s.id))
      const fromSearch =
        activeQuery === trimmedQuery
          ? skills.filter((s) => !seen.has(s.id))
          : []
      merged = [...fromTrending, ...fromSearch]
    }

    return officialOnly ? merged.filter((s) => s.isOfficial) : merged
  }, [isSearching, officialOnly, skills, trending, trimmedQuery, activeQuery])

  const totalPages = Math.max(1, Math.ceil(visibleSkills.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageSkills = visibleSkills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const goToPage = useCallback(
    async (next: number) => {
      if (next < 1) return
      // Walking past the locally loaded set: pull the next batch from the API
      // first so the target page is populated when it renders.
      if (
        isSearching &&
        hasMore &&
        next * PAGE_SIZE > visibleSkills.length &&
        activeQuery
      ) {
        await fetchSkills(activeQuery, skills.length)
      }
      setPage(next)
      scrollRef.current?.scrollTo({ top: 0 })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSearching, hasMore, visibleSkills.length, activeQuery, skills.length],
  )

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages || (effectiveSearching && hasMore)
  const visibleInstallTasks = Object.values(installTasks)
    .filter((task) => task.status === "running" || task.status === "failed")
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const selectedInstallTask = selectedSkill
    ? installTasks[marketplaceKey(selectedSkill.source, selectedSkill.skillId)]
    : undefined

  return (
    <div className="flex h-full min-w-0">
      <MarketSidebar
        agents={availableAgents}
        selectedTargets={marketTargets}
        onToggleTarget={toggleMarketTarget}
        installedCount={installedState.names.size}
      />
      <div className="skillbox-market-main">
      {/* Header */}
      <div className="skillbox-market-header">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2>Skill Market</h2>
            <p>
              发现 · 信任 · 一键安装：按热榜浏览、按名称/作者搜索，或用自然语言描述需求让 AI 帮你匹配技能。
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode("trending")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${viewMode === "trending" ? "bg-foreground text-background" : "text-muted hover:text-foreground hover:bg-surface-hover"}`}
            >
              热门
            </button>
            <button
              type="button"
              onClick={() => setViewMode("search")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${viewMode === "search" ? "bg-foreground text-background" : "text-muted hover:text-foreground hover:bg-surface-hover"}`}
            >
              搜索
            </button>
            <button
              type="button"
              onClick={() => setViewMode("intent")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${viewMode === "intent" ? "bg-foreground text-background" : "text-muted hover:text-foreground hover:bg-surface-hover"}`}
            >
              意图匹配
            </button>
          </div>
        </div>

        {/* 搜索框：仅搜索 tab */}
        {viewMode === "search" && (
          <div className="relative max-w-2xl mt-3">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <SearchIcon size={15} />
            </div>
            <input
              type="text"
              placeholder="按名称或作者搜索（输入即搜）"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit() }}
              className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-surface border border-border text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
            />
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <SpinnerIcon />
              </div>
            )}
            {searchQuery && !loading && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-foreground transition-colors"
              >
                <svg
                  width="14"
                  height="14"
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
        )}

        {/* Section label + official-only filter：热门/搜索 tab */}
        {(viewMode === "trending" || viewMode === "search") && (
          <div className="mt-3 flex items-center justify-between max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-wider font-medium text-muted">
                {viewMode === "search" ? (effectiveSearching ? "搜索结果" : "搜索") : "热门"}
              </span>
              {effectiveSearching && (
                <span className="text-[12px] text-muted font-mono">
                  {visibleSkills.length} for "{trimmedQuery}"
                </span>
              )}
            </div>

            <label className="flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={officialOnly}
                onChange={(e) => setOfficialOnly(e.target.checked)}
                className="h-3 w-3 accent-blue-500"
              />
              仅官方
            </label>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-8 pb-3">
          <p className="text-[12px] text-red-400">{error}</p>
        </div>
      )}

      {/* Grid / Intent Matcher */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-8">
        {viewMode === "intent" ? (
          <IntentMatcher
            corpus={trending}
            installedState={installedState}
            installTasks={installTasks}
            effectiveAgents={marketTargets}
            onInstall={handleInstall}
            onOpenDetail={setSelectedSkill}
          />
        ) : !effectiveSearching && isLoadingTrending && visibleSkills.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <SpinnerIcon />
              <p className="text-muted text-[12px] mt-3">
                正在载入热门技能...
              </p>
            </div>
          </div>
        ) : effectiveSearching && loading && visibleSkills.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <SpinnerIcon />
              <p className="text-muted text-[12px] mt-3">
                正在搜索...
              </p>
            </div>
          </div>
        ) : viewMode === "search" && !effectiveSearching ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-muted text-sm">在上方输入技能名称或作者开始搜索</p>
          </div>
        ) : visibleSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-muted text-sm">
              没有找到相关 Skill{trimmedQuery ? `："${trimmedQuery}"` : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {pageSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onSelect={setSelectedSkill}
                  installedState={installedState}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="skillbox-pagination">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => goToPage(currentPage - 1)}
              >
                ‹ 上一页
              </button>
              <span className="skillbox-pagination__status">
                {loadingMore ? (
                  <SpinnerIcon />
                ) : (
                  <>
                    第 {currentPage} / {totalPages}
                    {effectiveSearching && hasMore && currentPage === totalPages ? "+" : ""} 页
                  </>
                )}
              </span>
              <button
                type="button"
                disabled={!canGoNext || loadingMore}
                onClick={() => goToPage(currentPage + 1)}
              >
                下一页 ›
              </button>
            </div>
          </>
        )}
      </div>

      {showBackToTop && visibleInstallTasks.length === 0 && (
        <button
          type="button"
          title="回到顶部"
          aria-label="回到顶部"
          className="skillbox-back-to-top"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      )}

      <BackgroundInstallTasks
        tasks={visibleInstallTasks}
        onOpen={openInstallTask}
        onDismiss={dismissInstallTask}
      />

      {/* Detail panel overlay */}
      {selectedSkill && (
        <DetailPanel
          skill={selectedSkill}
          availableAgents={availableAgents}
          defaultAgents={marketTargets}
          onClose={() => setSelectedSkill(null)}
          installedState={installedState}
          getCachedContent={getCachedContent}
          cacheContent={cacheContent}
          onInstall={handleInstall}
          installTask={selectedInstallTask}
        />
      )}
      </div>
    </div>
  )
}
