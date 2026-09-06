import fs from "node:fs/promises"
import path from "node:path"

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".venv",
  "venv",
  ".deps",
  "site-packages",
  "__pycache__",
])

export interface SkillDirectory {
  path: string
  canonicalPath: string
  isSymbolicLink: boolean
}

interface SkillDirectoryScanOptions {
  /** 自定义工作区扫描时，不把其中完整的 Git 仓库当作已安装 Skill 集合。 */
  stopAtNestedRepositories?: boolean
  /** 自定义扫描不能通过 Junction 或符号链接越过用户选择的目录边界。 */
  skipSymbolicLinks?: boolean
  /** 隐藏目录由项目探针单独处理，通用递归不进入缓存和工具目录。 */
  skipHiddenDirectories?: boolean
}

async function hasSkillMd(directory: string): Promise<boolean> {
  try {
    return (await fs.stat(path.join(directory, "SKILL.md"))).isFile()
  } catch {
    return false
  }
}

/**
 * 递归发现技能目录；一旦命中 SKILL.md，就不再进入该技能的支持文件目录。
 */
export async function findSkillDirectories(
  skillsRoot: string,
  options: SkillDirectoryScanOptions = {},
): Promise<SkillDirectory[]> {
  const results: SkillDirectory[] = []
  const visited = new Set<string>()

  async function visit(directory: string): Promise<void> {
    let canonicalPath: string
    let isSymbolicLink = false
    try {
      const [stat, realPath] = await Promise.all([
        fs.lstat(directory),
        fs.realpath(directory),
      ])
      if (!stat.isDirectory() && !stat.isSymbolicLink()) return
      if (options.skipSymbolicLinks && stat.isSymbolicLink()) return
      canonicalPath = realPath
      isSymbolicLink = stat.isSymbolicLink()
    } catch {
      return
    }

    const key = process.platform === "win32"
      ? canonicalPath.toLowerCase()
      : canonicalPath
    if (visited.has(key)) return
    visited.add(key)

    if (options.stopAtNestedRepositories) {
      try {
        await fs.stat(path.join(directory, ".git"))
        return
      } catch {
        // 不是嵌套 Git 仓库，继续扫描。
      }
    }

    if (await hasSkillMd(directory)) {
      results.push({ path: directory, canonicalPath, isSymbolicLink })
      return
    }

    let entries
    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    await Promise.all(
      entries
        .filter((entry) =>
          (entry.isDirectory() || entry.isSymbolicLink()) &&
          (!options.skipHiddenDirectories || !entry.name.startsWith(".")) &&
          !SKIPPED_DIRECTORIES.has(entry.name),
        )
        .map((entry) => visit(path.join(directory, entry.name))),
    )
  }

  let entries
  try {
    entries = await fs.readdir(skillsRoot, { withFileTypes: true })
  } catch {
    return results
  }

  await Promise.all(
    entries
      .filter((entry) =>
        (entry.isDirectory() || entry.isSymbolicLink()) &&
        (!options.skipHiddenDirectories || !entry.name.startsWith(".")) &&
        !SKIPPED_DIRECTORIES.has(entry.name),
      )
      .map((entry) => visit(path.join(skillsRoot, entry.name))),
  )

  return results
}
