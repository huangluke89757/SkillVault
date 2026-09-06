import fs from "node:fs/promises"
import path from "node:path"
import { compareSkillContents } from "./version-sync"

function comparisonKey(value: string): string {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

/**
 * 同一 Agent 可能同时有新旧两个全局目录。只要其中一个与当前 Skill
 * 身份匹配，取消适配就要一次清理该 Agent 下所有同名位置。
 */
export function selectAgentSkillRemovalCandidates<
  T extends { canonicalPath: string },
>(matches: T[], selectedRealPaths: Set<string>): T[] | null {
  const selectedKeys = new Set(Array.from(selectedRealPaths, comparisonKey))
  const hasIdentityMatch = matches.some((match) =>
    selectedKeys.has(comparisonKey(match.canonicalPath)),
  )
  if (!hasIdentityMatch && matches.length > 1) return null
  return matches
}

export async function prepareAgentSkillTarget(
  agentTargetDir: string,
  canonicalDir: string,
  detach: (targetPath: string) => Promise<void>,
  archiveIdentical: (targetPath: string) => Promise<void>,
): Promise<"missing" | "unlinked" | "archived-identical" | "detached"> {
  const existingTarget = await fs.lstat(agentTargetDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null
    throw error
  })
  if (!existingTarget) return "missing"
  if (existingTarget.isSymbolicLink()) {
    await fs.unlink(agentTargetDir)
    return "unlinked"
  }
  if (!existingTarget.isDirectory()) {
    throw new Error("Agent 同名位置不是 Skill 目录")
  }

  let hasContentDifference = true
  try {
    hasContentDifference = (await compareSkillContents(canonicalDir, agentTargetDir)).length > 0
  } catch {
    // 比对失败时必须保留实体副本，不能以安装为由直接覆盖。
  }
  if (hasContentDifference) {
    await detach(agentTargetDir)
    return "detached"
  }
  await archiveIdentical(agentTargetDir)
  return "archived-identical"
}
