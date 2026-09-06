import crypto from "node:crypto"
import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"

export type SkillVersionChangeKind = "modified" | "only-agent" | "only-master"

export interface SkillVersionChange {
  relativePath: string
  kind: SkillVersionChangeKind
}

export interface SyncAgentCopyOptions {
  skillName: string
  agentName: string
  masterPath: string
  agentPath: string
  backupRoot: string
}

export interface SyncAgentCopyResult {
  previousMasterBackupPath: string
  sourceCopyBackupPath: string
}

const IGNORED_DIRECTORIES = new Set([".git", "node_modules"])
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"])

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256")
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest("hex")
}

async function snapshotSkill(rootPath: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>()

  async function walk(directory: string, relativeDirectory = ""): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue
      if (entry.isFile() && IGNORED_FILES.has(entry.name)) continue

      const absolutePath = path.join(directory, entry.name)
      const relativePath = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath)
      } else if (entry.isFile()) {
        snapshot.set(relativePath, await hashFile(absolutePath))
      } else if (entry.isSymbolicLink()) {
        const target = await fs.readlink(absolutePath)
        snapshot.set(
          relativePath,
          crypto.createHash("sha256").update(`symlink:${target}`).digest("hex"),
        )
      }
    }
  }

  await walk(rootPath)
  return snapshot
}

/** 为 Skill 的全部有效文件生成与目录位置和时间戳无关的内容指纹。 */
export async function createSkillContentFingerprint(rootPath: string): Promise<string> {
  const snapshot = await snapshotSkill(rootPath)
  const hash = crypto.createHash("sha256")
  for (const [relativePath, fileHash] of [...snapshot.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    hash.update(relativePath)
    hash.update("\0")
    hash.update(fileHash)
    hash.update("\0")
  }
  return hash.digest("hex")
}

/**
 * “版本未同步”只表示两个 Skill 目录的有效内容不同。
 * 目录位置、创建时间、修改时间以及顶层链接类型都不参与判定。
 */
export async function compareSkillContents(
  masterPath: string,
  agentPath: string,
): Promise<SkillVersionChange[]> {
  const [master, agent] = await Promise.all([
    snapshotSkill(masterPath),
    snapshotSkill(agentPath),
  ])
  const relativePaths = Array.from(new Set([...master.keys(), ...agent.keys()])).sort()

  return relativePaths.flatMap((relativePath): SkillVersionChange[] => {
    const masterHash = master.get(relativePath)
    const agentHash = agent.get(relativePath)
    if (masterHash === agentHash) return []
    if (masterHash === undefined) return [{ relativePath, kind: "only-agent" }]
    if (agentHash === undefined) return [{ relativePath, kind: "only-master" }]
    return [{ relativePath, kind: "modified" }]
  })
}

function safePathSegment(value: string): string {
  return path.basename(value).replace(/[^a-zA-Z0-9._-]/g, "-") || "skill"
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.lstat(targetPath)
    return true
  } catch {
    return false
  }
}

async function removePath(targetPath: string): Promise<void> {
  const stat = await fs.lstat(targetPath).catch(() => null)
  if (!stat) return
  if (stat.isSymbolicLink()) {
    await fs.unlink(targetPath)
    return
  }
  await fs.rm(targetPath, { recursive: true, force: true })
}

/**
 * 将某个 Agent 的独立副本提升为新母版，并把该 Agent 改回母版链接。
 * 同步前的母版和来源副本都会保留；任一步失败时恢复原状态。
 */
export async function syncAgentCopyToMaster(
  options: SyncAgentCopyOptions,
): Promise<SyncAgentCopyResult> {
  const skillName = safePathSegment(options.skillName)
  const agentName = safePathSegment(options.agentName)
  const masterStat = await fs.lstat(options.masterPath)
  const agentStat = await fs.lstat(options.agentPath)
  if (!masterStat.isDirectory() || masterStat.isSymbolicLink()) {
    throw new Error("母版不是可同步的 Skill 目录")
  }
  if (!agentStat.isDirectory() || agentStat.isSymbolicLink()) {
    throw new Error("该 Agent 当前没有可同步的独立副本")
  }
  if (!(await pathExists(path.join(options.masterPath, "SKILL.md")))) {
    throw new Error("母版缺少 SKILL.md，无法同步")
  }
  if (!(await pathExists(path.join(options.agentPath, "SKILL.md")))) {
    throw new Error("独立副本缺少 SKILL.md，无法同步")
  }

  const changes = await compareSkillContents(options.masterPath, options.agentPath)
  if (changes.length === 0) {
    throw new Error("独立副本已与母版一致")
  }

  const backupId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`
  const previousMasterBackupPath = path.join(
    options.backupRoot,
    "universal",
    skillName,
    backupId,
  )
  const sourceCopyBackupPath = path.join(
    options.backupRoot,
    agentName === "universal" ? "project-universal" : agentName,
    skillName,
    backupId,
  )
  const stagingPath = path.join(
    options.backupRoot,
    ".staging",
    `${skillName}-${crypto.randomUUID()}`,
  )

  await Promise.all([
    fs.mkdir(path.dirname(previousMasterBackupPath), { recursive: true }),
    fs.mkdir(path.dirname(sourceCopyBackupPath), { recursive: true }),
    fs.mkdir(path.dirname(stagingPath), { recursive: true }),
  ])

  let masterBackedUp = false
  let masterInstalled = false
  let sourceCopyBackedUp = false
  let agentCopyRemoved = false

  try {
    await fs.cp(options.agentPath, stagingPath, { recursive: true })
    // 项目副本可能与母版位于不同磁盘。rename 无法跨卷，因此先复制
    // 一份可恢复备份，再删除原位置并建立指向新母版的链接。
    await fs.cp(options.agentPath, sourceCopyBackupPath, { recursive: true })
    sourceCopyBackedUp = true
    await fs.rename(options.masterPath, previousMasterBackupPath)
    masterBackedUp = true
    await fs.rename(stagingPath, options.masterPath)
    masterInstalled = true
    await removePath(options.agentPath)
    agentCopyRemoved = true

    const type = process.platform === "win32" ? "junction" : undefined
    const linkTarget = type
      ? options.masterPath
      : path.relative(path.dirname(options.agentPath), options.masterPath)
    await fs.symlink(linkTarget, options.agentPath, type)
    if ((await fs.realpath(options.agentPath)) !== (await fs.realpath(options.masterPath))) {
      throw new Error("同步后的 Agent 链接没有指向母版")
    }

    return { previousMasterBackupPath, sourceCopyBackupPath }
  } catch (error) {
    const rollbackErrors: unknown[] = []
    try {
      if (agentCopyRemoved) {
        await removePath(options.agentPath)
        await fs.cp(sourceCopyBackupPath, options.agentPath, { recursive: true })
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError)
    }
    try {
      if (masterInstalled) {
        await removePath(options.masterPath)
      }
      if (masterBackedUp) {
        await fs.rename(previousMasterBackupPath, options.masterPath)
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError)
    }
    await removePath(stagingPath).catch((rollbackError) => rollbackErrors.push(rollbackError))
    if (sourceCopyBackedUp && rollbackErrors.length === 0) {
      await removePath(sourceCopyBackupPath).catch((rollbackError) =>
        rollbackErrors.push(rollbackError),
      )
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], "同步失败，且未能完整恢复原状态")
    }
    throw error
  }
}
