import assert from "node:assert/strict"
import test from "node:test"
import {
  getAdaptedAgentNames,
  getAgentFilterNames,
  getSkillListAgentNames,
} from "../src/renderer/lib/skill-agent-bindings"

test("项目内的 Agent Skill 不冒充全局适配", () => {
  const skill = {
    scope: "global" as const,
    agents: ["Claude Code", "ZCode", "通用 Skill 目录"],
    locations: [
      { scope: "global" as const, agents: ["ZCode"] },
      { scope: "global" as const, agents: ["通用 Skill 目录"] },
      { scope: "project" as const, agents: ["Claude Code"] },
    ],
  }

  assert.deepEqual(getAdaptedAgentNames(skill), ["ZCode"])
  assert.deepEqual(getAgentFilterNames(skill), ["ZCode", "通用 Skill 目录"])
  assert.deepEqual(getSkillListAgentNames(skill), ["ZCode", "通用 Skill 目录"])
})

test("项目 Skill 仍显示它的项目 Agent 归属，但不标记为全局适配", () => {
  const skill = {
    scope: "project" as const,
    agents: ["Claude Code"],
    locations: [
      { scope: "project" as const, agents: ["Claude Code"] },
    ],
  }

  assert.deepEqual(getAdaptedAgentNames(skill), [])
  assert.deepEqual(getAgentFilterNames(skill), [])
  assert.deepEqual(getSkillListAgentNames(skill), ["Claude Code"])
})

test("同一 Agent 的多个全局目录只计一次适配", () => {
  const skill = {
    scope: "global" as const,
    agents: ["OpenCode"],
    locations: [
      { scope: "global" as const, agents: ["OpenCode"] },
      { scope: "global" as const, agents: ["OpenCode"] },
    ],
  }

  assert.deepEqual(getAdaptedAgentNames(skill), ["OpenCode"])
})

test("直接读取通用目录的 Agent 可筛选，但不显示可取消的适配", () => {
  const skill = {
    scope: "global" as const,
    agents: ["Zed", "通用 Skill 目录"],
    locations: [
      { scope: "global" as const, agents: ["Zed", "通用 Skill 目录"] },
    ],
  }

  assert.deepEqual(getAgentFilterNames(skill), ["Zed", "通用 Skill 目录"])
  assert.deepEqual(getAdaptedAgentNames(skill), [])
})
