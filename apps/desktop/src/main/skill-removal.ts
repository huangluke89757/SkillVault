import path from "node:path"

export type SkillRemovalScope = "global" | "project" | "custom"

export interface SkillRemovalTarget {
  path: string
  canonicalPath: string
  scope: SkillRemovalScope
  projectName?: string | null
}

export interface SkillRemovalRequest {
  name: string
  targets: SkillRemovalTarget[]
}

interface RemovalPathOperations {
  lstat: (targetPath: string) => Promise<{
    isDirectory: () => boolean
    isSymbolicLink: () => boolean
  }>
  unlink: (targetPath: string) => Promise<void>
  trash: (targetPath: string) => Promise<void>
}

function comparisonKey(value: string): string {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

export function assertSafePathSegment(value: string): string {
  const trimmed = value.trim()
  if (
    !trimmed ||
    trimmed === "." ||
    trimmed === ".." ||
    /[\\/\0]/.test(trimmed) ||
    path.basename(trimmed) !== trimmed
  ) {
    throw new Error(`无效的 Skill 目录名：${value || "<empty>"}`)
  }
  return trimmed
}

export function isPathInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath))
  return Boolean(
    relative &&
    relative !== "." &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  )
}

export function validateSkillRemovalRequest(
  input: SkillRemovalRequest,
  allowedRoots: string[],
): SkillRemovalRequest {
  const name = typeof input?.name === "string" ? input.name.trim() : ""
  if (!name) throw new Error("Skill 名称不能为空")
  if (!Array.isArray(input?.targets) || input.targets.length === 0) {
    throw new Error("没有可删除的 Skill 位置")
  }

  const roots = allowedRoots.map((root) => path.resolve(root))
  const seen = new Set<string>()
  const targets: SkillRemovalTarget[] = []
  for (const candidate of input.targets) {
    if (!candidate || !["global", "project", "custom"].includes(candidate.scope)) {
      throw new Error("无效的 Skill 删除范围")
    }
    const resolved = path.resolve(candidate.path)
    const canonicalPath = path.resolve(candidate.canonicalPath || resolved)
    assertSafePathSegment(path.basename(resolved))
    assertSafePathSegment(path.basename(canonicalPath))
    if (roots.some((root) => (
      comparisonKey(root) === comparisonKey(resolved) ||
      comparisonKey(root) === comparisonKey(canonicalPath)
    ))) {
      throw new Error("拒绝删除 Skill 根目录")
    }
    if (
      !roots.some((root) => isPathInside(root, resolved)) ||
      !roots.some((root) => isPathInside(root, canonicalPath))
    ) {
      throw new Error(`Skill 路径位于授权范围之外：${resolved}`)
    }
    const key = comparisonKey(resolved)
    if (seen.has(key)) continue
    seen.add(key)
    targets.push({
      path: resolved,
      canonicalPath,
      scope: candidate.scope,
      projectName: candidate.projectName ?? null,
    })
  }

  return { name, targets }
}

export async function removeSkillPath(
  targetPath: string,
  operations: RemovalPathOperations,
): Promise<"link" | "directory"> {
  const stat = await operations.lstat(targetPath)
  if (stat.isSymbolicLink()) {
    await operations.unlink(targetPath)
    return "link"
  }
  if (!stat.isDirectory()) {
    throw new Error(`删除目标不是 Skill 目录：${targetPath}`)
  }
  await operations.trash(targetPath)
  return "directory"
}
