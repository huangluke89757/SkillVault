export interface SkillAgentBindingSource {
  scope: "global" | "project" | "custom"
  agents: string[]
  locations: Array<{
    scope: "global" | "project" | "custom"
    agents: string[]
  }>
}

export type AgentAdaptationState = "all" | "partial" | "none"

export interface AgentAdaptationSummary {
  adaptedCount: number
  total: number
  state: AgentAdaptationState
}

const UNIVERSAL_AGENT_NAMES = new Set([
  "Universal (.agents/skills)",
  "通用 Skill 目录",
])

/** 全局 Agent 适配只以 Agent 全局目录中的真实位置为准。 */
export function getAdaptedAgentNames(skill: SkillAgentBindingSource): string[] {
  return Array.from(new Set(
    skill.locations
      .filter((location) => location.scope === "global")
      .flatMap((location) =>
        location.agents.some((agentName) => UNIVERSAL_AGENT_NAMES.has(agentName))
          ? []
          : location.agents,
      )
      .filter((agentName) => !UNIVERSAL_AGENT_NAMES.has(agentName)),
  ))
}

/** 左侧 Agent 筛选表示“这个 Agent 可在全局使用”，包含直接读取通用目录的 Agent。 */
export function getAgentFilterNames(skill: SkillAgentBindingSource): string[] {
  return Array.from(new Set(
    skill.locations
      .filter((location) => location.scope === "global")
      .flatMap((location) => location.agents),
  ))
}

/** 全局 Skill 行不把项目内的 Agent 目录误当成全局适配。 */
export function getSkillListAgentNames(skill: SkillAgentBindingSource): string[] {
  if (skill.scope !== "global") return Array.from(new Set(skill.agents))
  return getAgentFilterNames(skill)
}

/** 批量适配面板：汇总所选 Skill 在某个 Agent 下的适配状态。 */
export function summarizeAgentAdaptation(
  agentDisplayName: string,
  skills: SkillAgentBindingSource[],
): AgentAdaptationSummary {
  const total = skills.length
  const adaptedCount = skills.filter((skill) =>
    getAdaptedAgentNames(skill).includes(agentDisplayName),
  ).length
  const state: AgentAdaptationState =
    total > 0 && adaptedCount === total
      ? "all"
      : adaptedCount > 0
        ? "partial"
        : "none"
  return { adaptedCount, total, state }
}
