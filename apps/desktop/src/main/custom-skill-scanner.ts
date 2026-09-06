import fs from "node:fs/promises"
import type { Dirent } from "node:fs"
import path from "node:path"
import { findSkillDirectories } from "./skill-directory-scanner"

export interface CustomSkillLocation {
  skillDir: string
  canonicalPath: string
  scope: "project" | "custom"
  projectName: string | null
  /** 命中探针对应的 agentRegistry key；非探针来源（自定义根/平铺目录）为 null。 */
  agentName: string | null
}

interface ProjectProbe {
  subpath: string
  agentName?: string | null
}

const SKIPPED_PROJECT_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".venv",
  "venv",
  "__pycache__",
])

async function hasSkillMd(directory: string): Promise<boolean> {
  try {
    return (await fs.stat(path.join(directory, "SKILL.md"))).isFile()
  } catch {
    return false
  }
}

async function readDirectory(directory: string): Promise<Dirent<string>[]> {
  try {
    return await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function pathKey(value: string): string {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

/**
 * 扫描用户明确添加的自定义目录。
 *
 * 递归发现目录中的 Skill，并识别其中标准 Agent 项目目录。不会读取
 * 项目文件，也不会递归进入 Junction 或符号链接。
 */
export async function findCustomSkillLocations(
  rootPath: string,
  projectProbes: ProjectProbe[],
): Promise<CustomSkillLocation[]> {
  const resolvedRoot = path.resolve(rootPath)
  const results: CustomSkillLocation[] = []
  const seenSkills = new Map<string, number>()

  async function addSkill(
    skillDir: string,
    scope: "project" | "custom",
    projectName: string | null,
    agentName: string | null = null,
  ): Promise<void> {
    if (!(await hasSkillMd(skillDir))) return

    const canonicalPath = await fs.realpath(skillDir).catch(() => path.resolve(skillDir))
    const key = pathKey(canonicalPath)
    const existingIndex = seenSkills.get(key)
    if (existingIndex !== undefined) {
      // 项目目录能提供 Agent 归属，优先于同一路径先被通用递归扫描到的结果。
      if (scope === "project" && results[existingIndex].scope !== "project") {
        results[existingIndex] = { skillDir, canonicalPath, scope, projectName, agentName }
      }
      return
    }
    seenSkills.set(key, results.length)
    results.push({ skillDir, canonicalPath, scope, projectName, agentName })
  }

  await addSkill(resolvedRoot, "custom", null)

  const genericSkills = await findSkillDirectories(resolvedRoot, {
    stopAtNestedRepositories: true,
    skipSymbolicLinks: true,
    skipHiddenDirectories: true,
  })
  for (const skill of genericSkills) {
    await addSkill(skill.path, "custom", null)
  }

  const queue = [resolvedRoot]
  const visitedDirectories = new Set<string>()
  for (let index = 0; index < queue.length; index += 1) {
    const directory = queue[index]
    const canonicalPath = await fs.realpath(directory).catch(() => path.resolve(directory))
    const key = pathKey(canonicalPath)
    if (visitedDirectories.has(key)) continue
    visitedDirectories.add(key)

    // Skill 内的子目录是支持文件，不能被当成项目根目录继续扫描。
    if (await hasSkillMd(directory)) continue

    const entries = await readDirectory(directory)
    if (entries.length === 0) continue
    const entriesByName = new Map(entries.map((entry) => [entry.name, entry]))
    const projectName = path.basename(directory) || directory
    for (const probe of projectProbes) {
      const firstSegment = probe.subpath.split(/[\\/]/, 1)[0]
      const firstEntry = entriesByName.get(firstSegment)
      if (!firstEntry || (!firstEntry.isDirectory() && !firstEntry.isSymbolicLink())) {
        continue
      }

      const probeDir = path.join(directory, probe.subpath)
      const skillDirectories = await findSkillDirectories(probeDir)
      for (const skill of skillDirectories) {
        await addSkill(
          skill.path,
          "project",
          projectName,
          probe.agentName ?? null,
        )
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      if (entry.name.startsWith(".") || SKIPPED_PROJECT_DIRECTORIES.has(entry.name)) continue
      queue.push(path.join(directory, entry.name))
    }
  }

  return results
}
