import { useMemo, useState, useEffect } from "react"
import fsPromises from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { useKeyboard } from "@opentui/react"
import { useStore, useDispatch } from "../store/context.js"
import { useDb } from "../db/context.js"
import { AgentFilter } from "../components/agent-filter.js"
import { SkillList } from "../components/skill-list.js"
import { colors, agentBadges as badgeMap } from "../utils/colors.js"
import type { EnrichedSkill } from "../store/types.js"
import { agents } from "../../../cli/src/core/agents.js"
import { addSkillToLock } from "../../../cli/src/core/skill-lock.js"
import { sanitizeName, installSkillForAgent } from "../../../cli/src/core/installer.js"

const home = os.homedir()
const CANONICAL_SKILLS_DIR = path.join(home, ".agents", "skills")

/**
 * Reads the full SKILL.md content for inline display.
 */
function readSkillContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8")
  } catch {
    return ""
  }
}

/**
 * Strips frontmatter (--- delimited block at the top) from markdown content.
 */
function stripFrontmatter(content: string): string {
  const lines = content.split("\n")
  if (lines[0]?.trim() !== "---") return content

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) return content
  return lines.slice(endIndex + 1).join("\n").trimStart()
}

/**
 * Three-panel home view:
 * LEFT   - Agent filter sidebar (fixed 22 chars)
 * MIDDLE - Compact skill name list (30%)
 * RIGHT  - Skill detail panel (flexGrow)
 */
export function HomeView() {
  const state = useStore()
  const dispatch = useDispatch()
  const { settings } = useDb()
  const [collectionsVersion, setCollectionsVersion] = useState(0)
  const [showCollections, setShowCollections] = useState(false)
  const [showCreateSkill, setShowCreateSkill] = useState(false)

  // Apply agent filter and text filter
  const collections = settings.get<Record<string, string[]>>("collections.skills", {})
  const selectedCollection = settings.get<string | null>("ui.home.selectedCollection", null)

  const filteredSkills = useMemo(() => {
    let skills = state.installedSkills

    if (selectedCollection) {
      const ids = new Set(collections[selectedCollection] || [])
      skills = skills.filter((skill) => ids.has(skill.canonicalPath))
    }

    // Agent filter (or favorites)
    if (state.selectedAgentFilter === "favorites") {
      const favSet = new Set(state.favorites)
      skills = skills.filter((s) => favSet.has(s.name))
    } else if (state.selectedAgentFilter !== "all") {
      skills = skills.filter((s) =>
        s.agents.includes(state.selectedAgentFilter as any)
      )
    }

    // Text filter
    if (state.installedFilter) {
      const q = state.installedFilter.toLowerCase()
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.filePath.toLowerCase().includes(q) ||
          s.canonicalPath.toLowerCase().includes(q) ||
          (s.projectName?.toLowerCase().includes(q) ?? false) ||
          (s.lock?.originalUrl?.toLowerCase().includes(q) ?? false) ||
          s.supportingFiles.some((file) => file.relativePath.toLowerCase().includes(q))
      )
    }

    return skills
  }, [state.installedSkills, state.selectedAgentFilter, state.installedFilter, state.favorites, selectedCollection, collections, collectionsVersion])

  useKeyboard((key) => {
    if (state.activeView !== "home") return
    if (state.showHelp) return
    if (state.focusedPane === "search") return
    if (showCollections || showCreateSkill) return

    if (key.name === "c") {
      setShowCollections(true)
      return
    }

    if (key.name === "n") {
      setShowCreateSkill(true)
      return
    }
  })

  async function createLocalSkill(data: {
    name: string
    description: string
    content: string
    targets: string[]
  }) {
    const name = data.name.trim()
    if (!name) return
    const description = data.description.trim() || name
    const safeName = sanitizeName(name)
    const canonicalDir = path.join(CANONICAL_SKILLS_DIR, safeName)
    const filePath = path.join(canonicalDir, "SKILL.md")

    await fsPromises.mkdir(canonicalDir, { recursive: true })
    const body = (data.content.trim() || `---
name: ${safeName}
description: ${description}
---

# ${name}

## Instructions

Add your skill instructions here.
`).trimEnd() + "\n"
    await fsPromises.writeFile(filePath, body, "utf-8")

    const selectedTargets =
      data.targets.length > 0
        ? data.targets
        : settings.get<string[]>("install.defaultAgents", [])
    const mirrorAgents = settings.get<string[]>("sync.mirrorAgents", [])
    const targetNames = Array.from(new Set([...selectedTargets, ...mirrorAgents]))
    for (const targetName of targetNames) {
      const agent = agents[targetName]
      if (agent) {
        await installSkillForAgent(
          {
            name,
            path: canonicalDir,
            entryPath: filePath,
          } as any,
          agent,
          "global",
          "symlink",
        )
      }
    }

    const now = new Date().toISOString()
    await addSkillToLock(safeName, {
      source: canonicalDir,
      sourceType: "local",
      originalUrl: canonicalDir,
      skillFolderHash: "",
    })

    dispatch({ type: "REFRESH_SKILLS" })
    dispatch({
      type: "SHOW_NOTIFICATION",
      notification: { type: "success", message: `Created "${name}"` },
    })
  }

  return (
    <box style={{ flexDirection: "row", width: "100%", flexGrow: 1 }}>
      {/* LEFT: Agent filter sidebar */}
      <AgentFilter />

      {/* MIDDLE: Skill list */}
      <box
        style={{
          width: "30%",
          border: true,
          borderColor: state.focusedPane === "list" ? colors.primary : colors.border,
          flexDirection: "column",
        } as any}
      >
        <SkillList skills={filteredSkills} />
      </box>

      {/* RIGHT: Detail panel */}
      <box style={{ flexGrow: 1, flexDirection: "column" }}>
        {state.selectedSkill ? (
          <DetailPanel
            skill={state.selectedSkill}
            collections={collections}
            selectedCollection={selectedCollection}
          />
        ) : (
          <box style={{ padding: 1 }}>
            <text fg={colors.textDim}>
              {filteredSkills.length > 0
                ? "Select a skill to view details"
                : "No skills to display"}
            </text>
          </box>
        )}
      </box>

      {showCollections ? (
        <CollectionOverlay
          collections={collections}
          selectedCollection={selectedCollection}
          selectedSkill={state.selectedSkill}
          onClose={() => setShowCollections(false)}
          onApplyFilter={(name) => {
            settings.set("ui.home.selectedCollection", name)
            setCollectionsVersion((value) => value + 1)
          }}
          onSaveCollections={(next) => {
            settings.set("collections.skills", next)
            setCollectionsVersion((value) => value + 1)
          }}
        />
      ) : null}

      {showCreateSkill ? (
        <CreateSkillOverlay
          agents={state.detectedAgents}
          defaultTargets={settings.get<string[]>("install.defaultAgents", [])}
          onClose={() => setShowCreateSkill(false)}
          onCreate={async (data) => {
            await createLocalSkill(data)
            setShowCreateSkill(false)
          }}
        />
      ) : null}
    </box>
  )
}

// ---------- Inline Detail Panel ----------

interface DetailPanelProps {
  skill: EnrichedSkill
  collections: Record<string, string[]>
  selectedCollection: string | null
}

function DetailPanel({ skill, collections, selectedCollection }: DetailPanelProps) {
  const [content, setContent] = useState("")

  useEffect(() => {
    if (skill.filePath) {
      const raw = readSkillContent(skill.filePath)
      setContent(stripFrontmatter(raw))
    } else {
      setContent("")
    }
  }, [skill.filePath, skill.name])

  const sourceType = skill.lock?.sourceType ?? "unknown"
  const sourceUrl = skill.lock?.originalUrl ?? ""

  return (
    <scrollbox
      focused={false}
      style={{
        width: "100%",
        flexGrow: 1,
        rootOptions: { backgroundColor: colors.bg },
        viewportOptions: { backgroundColor: colors.bg },
        contentOptions: { backgroundColor: colors.bg },
        scrollbarOptions: {
          trackOptions: {
            foregroundColor: colors.primary,
            backgroundColor: colors.border,
          },
        },
      }}
    >
      <box style={{ paddingLeft: 1, paddingRight: 1, paddingTop: 0, flexDirection: "column" }}>
        {/* Skill name */}
        <text fg={colors.primary}>
          <strong>{skill.name}</strong>
        </text>

        {/* Description */}
        <text fg={colors.text}>{skill.description}</text>
        <text>{" "}</text>

        {/* Metadata row: source + agents */}
        <box style={{ flexDirection: "row", height: 1 }}>
          <text fg={colors.textDim}>Source: </text>
          <text fg={colors.secondary}>{sourceType}</text>
          {sourceUrl ? (
            <>
              <text fg={colors.textDim}>  URL: </text>
              <text fg={colors.primary}>{sourceUrl}</text>
            </>
          ) : null}
        </box>

        {/* Agent badges */}
        {skill.agents.length > 0 ? (
          <box style={{ flexDirection: "row", height: 1 }}>
            <text fg={colors.textDim}>Agents: </text>
            {skill.agents.map((a, i) => {
              const badge = badgeMap[a]
              return (
                <text key={a} fg={badge?.color ?? colors.agent}>
                  {i > 0 ? " " : ""}{badge?.label ?? a.slice(0, 2).toUpperCase()}
                </text>
              )
            })}
          </box>
        ) : null}

        <box style={{ flexDirection: "row", minHeight: 1 }}>
          <text fg={colors.textDim}>Scope: </text>
          <text fg={colors.secondary}>{skill.scope}</text>
          {skill.projectName ? (
            <>
              <text fg={colors.textDim}>  Project: </text>
              <text fg={colors.secondary}>{skill.projectName}</text>
            </>
          ) : null}
        </box>

        <box style={{ flexDirection: "column" }}>
          <text fg={colors.textDim}>Path: </text>
          <text fg={colors.secondary}>{skill.canonicalPath}</text>
        </box>

        <box style={{ flexDirection: "column" }}>
          <text fg={colors.textDim}>Collections:</text>
          {Object.keys(collections).length === 0 ? (
            <text fg={colors.textDim}>  none</text>
          ) : (
            Object.entries(collections).map(([name, items]) => (
              <text
                key={name}
                fg={
                  items.includes(skill.canonicalPath)
                    ? colors.primary
                    : selectedCollection === name
                      ? colors.warning
                      : colors.textDim
                }
              >
                {"  "}{items.includes(skill.canonicalPath) ? "[x]" : "[ ]"} {name}
              </text>
            ))
          )}
        </box>

        {skill.supportingFiles.length > 0 ? (
          <box style={{ flexDirection: "column" }}>
            <text fg={colors.textDim}>
              Supporting files ({skill.supportingFiles.length}):
            </text>
            {skill.supportingFiles.slice(0, 10).map((file) => (
              <text key={file.relativePath} fg={colors.secondary}>
                {"  "}{file.relativePath}
              </text>
            ))}
            {skill.supportingFiles.length > 10 ? (
              <text fg={colors.textDim}>
                {"  "}+{skill.supportingFiles.length - 10} more
              </text>
            ) : null}
          </box>
        ) : null}

        <text>{" "}</text>

        {/* Shortcut hints */}
        <text fg={colors.textDim}>v=view detail  d=remove  u=update  f=favorite  n=create skill  c=collections  Tab=switch pane</text>
        <text fg={colors.border}>---</text>

        {/* SKILL.md content */}
        {content ? (
          content.split("\n").map((line, i) => {
            if (line.startsWith("### ")) {
              return <text key={i} fg={colors.primary}>{line}</text>
            }
            if (line.startsWith("## ")) {
              return <text key={i} fg={colors.primary}><strong>{line}</strong></text>
            }
            if (line.startsWith("# ")) {
              return <text key={i} fg={colors.primary}><strong>{line}</strong></text>
            }
            if (line.startsWith("```")) {
              return <text key={i} fg={colors.textDim}>{line}</text>
            }
            if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")) {
              return <text key={i} fg={colors.text}>{line}</text>
            }
            if (!line.trim()) {
              return <text key={i}>{" "}</text>
            }
            return <text key={i} fg={colors.text}>{line}</text>
          })
        ) : (
          <text fg={colors.textDim}>(No skill content available)</text>
        )}
      </box>
    </scrollbox>
  )
}

function CollectionOverlay({
  collections,
  selectedCollection,
  selectedSkill,
  onClose,
  onApplyFilter,
  onSaveCollections,
}: {
  collections: Record<string, string[]>
  selectedCollection: string | null
  selectedSkill: EnrichedSkill | null
  onClose: () => void
  onApplyFilter: (name: string | null) => void
  onSaveCollections: (next: Record<string, string[]>) => void
}) {
  const dispatch = useDispatch()
  const entries = [{ name: "(all)", count: 0 }, ...Object.keys(collections).sort().map((name) => ({
    name,
    count: collections[name]?.length ?? 0,
  }))]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [inputMode, setInputMode] = useState<"create" | "rename" | null>(null)
  const [draftName, setDraftName] = useState("")

  useKeyboard((key) => {
    if (inputMode) return
    if (key.name === "escape") {
      onClose()
      return
    }
    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((value) => Math.max(0, value - 1))
      return
    }
    if (key.name === "down" || key.name === "j") {
      setSelectedIndex((value) => Math.min(entries.length - 1, value + 1))
      return
    }
    if (key.name === "return") {
      const name = entries[selectedIndex]?.name
      onApplyFilter(name === "(all)" ? null : name)
      onClose()
      return
    }
    if (key.name === "a") {
      setDraftName("")
      setInputMode("create")
      return
    }
    if (key.name === "r" && selectedIndex > 0) {
      setDraftName(entries[selectedIndex].name)
      setInputMode("rename")
      return
    }
    if (key.name === "d" && selectedIndex > 0) {
      const next = { ...collections }
      delete next[entries[selectedIndex].name]
      onSaveCollections(next)
      setSelectedIndex((value) => Math.max(0, Math.min(value - 1, entries.length - 2)))
      return
    }
    if ((key.name === "space" || key.name === "f") && selectedIndex > 0 && selectedSkill) {
      const name = entries[selectedIndex].name
      const next = { ...collections }
      const current = new Set(next[name] || [])
      if (current.has(selectedSkill.canonicalPath)) current.delete(selectedSkill.canonicalPath)
      else current.add(selectedSkill.canonicalPath)
      next[name] = Array.from(current).sort()
      onSaveCollections(next)
      dispatch({
        type: "SHOW_NOTIFICATION",
        notification: { type: "info", message: `Updated ${name}` },
      })
    }
  })

  return (
    <box
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
      }}
    >
      <box
        style={{
          width: 64,
          border: true,
          borderColor: colors.primary,
          backgroundColor: "#1a1a2e",
          flexDirection: "column",
          paddingLeft: 1,
          paddingRight: 1,
          paddingTop: 1,
          paddingBottom: 1,
        }}
        title="Collections"
      >
        {inputMode ? (
          <>
            <text fg={colors.text}>
              {inputMode === "create" ? "New collection name" : "Rename collection"}
            </text>
            <box
              style={{
                height: 3,
                width: "100%",
                border: true,
                borderColor: colors.primary,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <input
                placeholder="collection name"
                focused={true}
                onInput={(value: string) => setDraftName(value)}
                onSubmit={((value: string) => {
                  const trimmed = value.trim()
                  if (!trimmed) {
                    setInputMode(null)
                    return
                  }
                  const next = { ...collections }
                  if (inputMode === "create") {
                    next[trimmed] = next[trimmed] || []
                  } else {
                    const currentName = entries[selectedIndex].name
                    next[trimmed] = next[currentName] || []
                    delete next[currentName]
                  }
                  onSaveCollections(next)
                  setInputMode(null)
                }) as any}
              />
            </box>
            <text fg={colors.textDim}>Enter=save  Esc close overlay</text>
          </>
        ) : (
          <>
            {entries.map((entry, index) => (
              <box
                key={entry.name}
                style={{
                  width: "100%",
                  flexDirection: "row",
                  backgroundColor: index === selectedIndex ? colors.bgAlt : "transparent",
                }}
              >
                <text
                  fg={
                    entry.name === "(all)"
                      ? selectedCollection === null && index === selectedIndex
                        ? colors.primary
                        : colors.text
                      : selectedCollection === entry.name
                        ? colors.warning
                        : colors.text
                  }
                  style={{ flexGrow: 1 }}
                >
                  {entry.name}
                </text>
                {entry.name !== "(all)" ? (
                  <text fg={colors.textDim}>{entry.count}</text>
                ) : null}
              </box>
            ))}
            <text>{" "}</text>
            <text fg={colors.textDim}>
              Enter=filter  a=new  r=rename  d=delete  f=toggle selected skill  Esc=close
            </text>
          </>
        )}
      </box>
    </box>
  )
}

function CreateSkillOverlay({
  agents,
  defaultTargets,
  onClose,
  onCreate,
}: {
  agents: Array<{ name: string; displayName: string }>
  defaultTargets: string[]
  onClose: () => void
  onCreate: (data: { name: string; description: string; content: string; targets: string[] }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [targets, setTargets] = useState<string[]>(defaultTargets)
  const [focusedField, setFocusedField] = useState<0 | 1 | 2>(0)
  const [saving, setSaving] = useState(false)

  useKeyboard((key) => {
    if (key.name === "escape" && !saving) {
      onClose()
      return
    }
    if (key.name === "tab" && !saving) {
      setFocusedField((value) => (value === 0 ? 1 : value === 1 ? 2 : 0))
      return
    }
    if (/^[1-9]$/.test(key.raw ?? "") && !saving) {
      const idx = Number(key.raw) - 1
      const target = agents[idx]
      if (target) {
        setTargets((prev) =>
          prev.includes(target.name)
            ? prev.filter((value) => value !== target.name)
            : [...prev, target.name],
        )
      }
      return
    }
    if (key.name === "s" && key.ctrl && !saving && name.trim()) {
      setSaving(true)
      onCreate({ name: name.trim(), description: description.trim(), content, targets }).finally(() => {
        setSaving(false)
      })
    }
  })

  return (
    <box
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
      }}
    >
      <box
        style={{
          width: 72,
          border: true,
          borderColor: colors.primary,
          backgroundColor: "#1a1a2e",
          flexDirection: "column",
          paddingLeft: 1,
          paddingRight: 1,
          paddingTop: 1,
          paddingBottom: 1,
        }}
        title="Create Skill"
      >
        <text fg={colors.text}>Name</text>
        <box
          style={{
            height: 3,
            width: "100%",
            border: true,
            borderColor: focusedField === 0 ? colors.primary : colors.border,
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <input
            placeholder="skill name"
            focused={focusedField === 0 && !saving}
            onInput={(value: string) => setName(value)}
            onSubmit={() => setFocusedField(1)}
          />
        </box>
        <text fg={colors.text}>Description</text>
        <box
          style={{
            height: 3,
            width: "100%",
            border: true,
            borderColor: focusedField === 1 ? colors.primary : colors.border,
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <input
            placeholder="short description"
            focused={focusedField === 1 && !saving}
            onInput={(value: string) => setDescription(value)}
            onSubmit={() => setFocusedField(2)}
          />
        </box>
        <text fg={colors.text}>Content</text>
        <box
          style={{
            height: 3,
            width: "100%",
            border: true,
            borderColor: focusedField === 2 ? colors.primary : colors.border,
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <input
            placeholder="optional SKILL.md body or frontmatter"
            focused={focusedField === 2 && !saving}
            onInput={(value: string) => setContent(value)}
            onSubmit={() => {}}
          />
        </box>
        <text>{" "}</text>
        <text fg={colors.text}>Targets</text>
        {agents.map((agent, index) => (
          <text key={agent.name} fg={targets.includes(agent.name) ? colors.primary : colors.textDim}>
            {index + 1}. {targets.includes(agent.name) ? "[x]" : "[ ]"} {agent.displayName}
          </text>
        ))}
        <text>{" "}</text>
        <text fg={colors.textDim}>Tab=switch field  1-9 toggle targets  Ctrl+S=create  Esc=cancel</text>
      </box>
    </box>
  )
}
