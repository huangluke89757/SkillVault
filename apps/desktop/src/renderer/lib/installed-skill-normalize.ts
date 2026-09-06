interface SkillProjectFields {
  path?: string
  canonicalPath?: string
  scope?: "global" | "project" | "custom"
  projectName?: string | null
  projectNames?: string[]
  agents?: string[]
  locations?: Array<{
    path: string
    canonicalPath: string
    scope: "global" | "project" | "custom"
    projectName: string | null
    agents: string[]
  }>
}

/** 兼容缓存、监听器或旧版本 IPC 返回的单项目结构。 */
export function normalizeInstalledSkills<T extends SkillProjectFields>(
  skills: T[] | null | undefined,
): Array<T & { projectNames: string[]; locations: NonNullable<SkillProjectFields["locations"]> }> {
  if (!Array.isArray(skills)) return []
  return skills.map((skill) => ({
    ...skill,
    projectNames: Array.isArray(skill.projectNames)
      ? [...skill.projectNames]
      : skill.projectName
        ? [skill.projectName]
        : [],
    locations: Array.isArray(skill.locations) && skill.locations.length > 0
      ? skill.locations.map((location) => ({
          ...location,
          agents: Array.isArray(location.agents) ? [...location.agents] : [],
        }))
      : skill.path && skill.canonicalPath && skill.scope
        ? [{
            path: skill.path,
            canonicalPath: skill.canonicalPath,
            scope: skill.scope,
            projectName: skill.projectName ?? null,
            agents: Array.isArray(skill.agents) ? [...skill.agents] : [],
          }]
        : [],
  }))
}
