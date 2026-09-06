import path from "node:path"

function normalizeRemotePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/+$/, "")
  if (normalized.startsWith("~/")) {
    const suffix = path.posix.normalize(normalized.slice(2))
    return suffix === "." ? "~" : `~/${suffix}`
  }
  return path.posix.normalize(normalized || ".")
}

export function assertRemoteSkillDeletePath(
  skillsBasePath: string,
  remoteSkillDir: string,
): string {
  const base = normalizeRemotePath(skillsBasePath)
  const target = normalizeRemotePath(remoteSkillDir)
  if (["", ".", "/", "~"].includes(base)) {
    throw new Error(`拒绝使用远程根目录作为 Skill 目录：${skillsBasePath || "<empty>"}`)
  }
  if (target === base || !target.startsWith(`${base}/`)) {
    throw new Error(`拒绝删除 Skill 根目录或范围之外的目标：${remoteSkillDir}`)
  }
  const relative = target.slice(base.length + 1)
  if (!relative || relative === "." || relative === ".." || relative.includes("/")) {
    throw new Error(`远程删除目标必须是 Skill 根目录的直接子目录：${remoteSkillDir}`)
  }
  return target
}
