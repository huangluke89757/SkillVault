interface VersionMismatch {
  agentPath: string
}

interface SkillLocation {
  path: string
  canonicalPath: string
  scope: "global" | "project" | "custom"
  projectName: string | null
  agents: string[]
}

interface MergeableSkill {
  name: string
  path: string
  canonicalPath?: string
  agents: string[]
  agentShortCodes: string[]
  scope: "global" | "project" | "custom"
  projectName: string | null
  projectNames?: string[]
  contentFingerprint?: string | null
  locations?: SkillLocation[]
  versionMismatches: VersionMismatch[]
}

function getProjectSkillKey(skill: MergeableSkill, nameKey: string): string | null {
  const normalizedPath = skill.path.replace(/\\/g, "/")
  const match = normalizedPath.match(
    /^(.*)\/(?:\.[^/]+\/(?:skills|rules)|data\/skills)\//i,
  )
  if (!match) return null
  return `${match[1].toLowerCase()}\u0000${nameKey}`
}

/**
 * 同一 Skill 的全局母版、项目适配位置和自定义副本不是多个逻辑 Skill。
 * 没有全局母版时，同一项目内不同 Agent 的同名副本也聚合为一行。
 */
export function mergeProjectSkillsIntoGlobal<T extends MergeableSkill>(skills: T[]): T[] {
  const copies = skills.map((skill) => ({
    ...skill,
    agents: [...skill.agents],
    agentShortCodes: [...skill.agentShortCodes],
    projectNames: [
      ...(skill.projectNames ?? (skill.projectName ? [skill.projectName] : [])),
    ],
    locations: (skill.locations ?? [{
      path: skill.path,
      canonicalPath: skill.canonicalPath ?? skill.path,
      scope: skill.scope,
      projectName: skill.projectName,
      agents: [...skill.agents],
    }]).map((location) => ({ ...location, agents: [...location.agents] })),
    versionMismatches: [...skill.versionMismatches],
  })) as T[]
  const globalByName = new Map<string, T>()
  const projectByName = new Map<string, T>()
  const projectByContent = new Map<string, T>()

  for (const skill of copies) {
    const nameKey = skill.name.trim().toLowerCase()
    if (skill.scope === "global") {
      if (!globalByName.has(nameKey)) globalByName.set(nameKey, skill)
      continue
    }
    if (skill.scope !== "project" || skill.agents.length === 0) {
      continue
    }
    const projectKey = getProjectSkillKey(skill, nameKey)
    if (projectKey && !projectByName.has(projectKey)) {
      projectByName.set(projectKey, skill)
    }
    if (skill.contentFingerprint) {
      const contentKey = `${nameKey}\u0000${skill.contentFingerprint}`
      if (!projectByContent.has(contentKey)) projectByContent.set(contentKey, skill)
    }
  }

  return copies.filter((skill) => {
    if (skill.scope === "global") return true
    const nameKey = skill.name.trim().toLowerCase()
    const projectKey = getProjectSkillKey(skill, nameKey)
    const contentKey = skill.contentFingerprint
      ? `${nameKey}\u0000${skill.contentFingerprint}`
      : null
    const projectMaster = (
      skill.scope === "project" && projectKey
        ? projectByName.get(projectKey)
        : undefined
    )
    const contentMaster = (
      skill.scope === "project" && contentKey
        ? projectByContent.get(contentKey)
        : undefined
    )
    const globalMaster = globalByName.get(nameKey)
    if (
      globalMaster &&
      skill.scope === "custom" &&
      (
        !globalMaster.contentFingerprint ||
        !skill.contentFingerprint ||
        globalMaster.contentFingerprint !== skill.contentFingerprint
      )
    ) {
      return true
    }
    const master = globalMaster ?? (
      projectMaster !== skill ? projectMaster : undefined
    ) ?? contentMaster ?? projectMaster
    if (!master) return true
    if (skill.scope === "project" && skill.agents.length === 0) return true
    if (master === skill) return true

    const knownProjectNames = new Set(master.projectNames ?? [])
    for (const projectName of skill.projectNames ?? []) {
      if (knownProjectNames.has(projectName)) continue
      master.projectNames?.push(projectName)
      knownProjectNames.add(projectName)
    }

    skill.agents.forEach((agent, index) => {
      if (master.agents.includes(agent)) return
      master.agents.push(agent)
      const shortCode = skill.agentShortCodes[index]
      if (shortCode) master.agentShortCodes.push(shortCode)
    })

    const knownMismatchPaths = new Set(
      master.versionMismatches.map((mismatch) => mismatch.agentPath),
    )
    for (const mismatch of skill.versionMismatches) {
      if (knownMismatchPaths.has(mismatch.agentPath)) continue
      master.versionMismatches.push(mismatch)
      knownMismatchPaths.add(mismatch.agentPath)
    }

    const knownLocationPaths = new Set(
      (master.locations ?? []).map((location) => location.path.toLowerCase()),
    )
    for (const location of skill.locations ?? []) {
      const locationKey = location.path.toLowerCase()
      if (knownLocationPaths.has(locationKey)) continue
      master.locations?.push({ ...location, agents: [...location.agents] })
      knownLocationPaths.add(locationKey)
    }

    return false
  })
}
