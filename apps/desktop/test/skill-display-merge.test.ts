import assert from "node:assert/strict"
import test from "node:test"
import { mergeProjectSkillsIntoGlobal } from "../src/main/skill-display-merge"

function createSkill(
  canonicalPath: string,
  scope: "global" | "project" | "custom",
  agents: string[],
  versionMismatches: Array<{
    agentName: string
    agentDisplayName: string
    agentPath: string
    changes: Array<{
      relativePath: string
      kind: "modified" | "only-agent" | "only-master"
    }>
    totalChanges: number
  }> = [],
  projectName: string | null = null,
  contentFingerprint: string | null = null,
) {
  return {
    name: "finesse-ui",
    path: canonicalPath,
    canonicalPath,
    agents,
    agentShortCodes: agents.map((agent) => agent === "Claude Code" ? "CC" : "UA"),
    scope,
    projectName,
    projectNames: projectName ? [projectName] : [],
    contentFingerprint,
    locations: [{
      path: canonicalPath,
      canonicalPath,
      scope,
      projectName,
      agents: [...agents],
    }],
    versionMismatches,
  }
}

test("同名项目副本与全局母版聚合为一行并汇总 Agent", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("C:/Users/test/.agents/skills/finesse-ui", "global", ["通用 Skill 目录"]),
    createSkill("D:/project/.claude/skills/finesse-ui", "project", ["Claude Code"]),
  ])

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].agents, ["通用 Skill 目录", "Claude Code"])
  assert.deepEqual(merged[0].agentShortCodes, ["UA", "CC"])
  assert.deepEqual(merged[0].locations.map((location) => location.path), [
    "C:/Users/test/.agents/skills/finesse-ui",
    "D:/project/.claude/skills/finesse-ui",
  ])
})

test("同名项目副本内容不同时仍为一行，并保留版本差异", () => {
  const mismatch = {
    agentName: "claude-code",
    agentDisplayName: "Claude Code",
    agentPath: "D:/project/.claude/skills/finesse-ui",
    changes: [{ relativePath: "SKILL.md", kind: "modified" as const }],
    totalChanges: 1,
  }
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("C:/Users/test/.agents/skills/finesse-ui", "global", ["通用 Skill 目录"]),
    createSkill(
      "D:/project/.claude/skills/finesse-ui",
      "project",
      ["Claude Code"],
      [mismatch],
    ),
  ])

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].versionMismatches, [mismatch])
})

test("没有全局母版时不擅自合并不同项目中的同名 Skill", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("D:/team-a/app/.claude/skills/finesse-ui", "project", ["Claude Code"], [], "app"),
    createSkill("E:/team-b/app/.agents/skills/finesse-ui", "project", ["通用 Skill 目录"], [], "app"),
  ])

  assert.equal(merged.length, 2)
})

test("没有全局母版时同一项目的多 Agent 副本聚合为一行", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill(
      "D:/project/.claude/skills/h3-prompt-writing",
      "project",
      ["Claude Code"],
      [],
      "MiniMax-H3-official",
    ),
    createSkill(
      "D:/project/.agents/skills/h3-prompt-writing",
      "project",
      ["通用 Skill 目录"],
      [],
      "MiniMax-H3-official",
    ),
  ])

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].agents, ["Claude Code", "通用 Skill 目录"])
  assert.deepEqual(merged[0].agentShortCodes, ["CC", "UA"])
})

test("不同项目中的同名同内容 Skill 聚合为一行并保留全部项目归属", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill(
      "D:/project-a/.claude/skills/finesse-ui",
      "project",
      ["Claude Code"],
      [],
      "project-a",
      "same-content",
    ),
    createSkill(
      "D:/project-b/.agents/skills/finesse-ui",
      "project",
      ["通用 Skill 目录"],
      [],
      "project-b",
      "same-content",
    ),
  ])

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].agents, ["Claude Code", "通用 Skill 目录"])
  assert.deepEqual(merged[0].projectNames, ["project-a", "project-b"])
})

test("不同项目中的同名不同内容 Skill 保持分开", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill(
      "D:/project-a/.claude/skills/finesse-ui",
      "project",
      ["Claude Code"],
      [],
      "project-a",
      "content-a",
    ),
    createSkill(
      "D:/project-b/.agents/skills/finesse-ui",
      "project",
      ["通用 Skill 目录"],
      [],
      "project-b",
      "content-b",
    ),
  ])

  assert.equal(merged.length, 2)
})

test("没有 Agent 归属的项目内容不作为适配副本合并", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("C:/Users/test/.agents/skills/finesse-ui", "global", ["通用 Skill 目录"]),
    createSkill("D:/project/.cursor/rules/finesse-ui", "project", []),
  ])

  assert.equal(merged.length, 2)
})

test("同名自定义副本与全局母版聚合为一行", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("C:/Users/test/.agents/skills/xiaotangkimicut", "global", ["通用 Skill 目录"], [], null, "same"),
    createSkill("C:/Users/test/.kimi-code/skills/xiaotangkimicut", "custom", [], [], null, "same"),
  ])

  assert.equal(merged.length, 1)
  assert.equal(merged[0].scope, "global")
})

test("同名但内容不同的自定义 Skill 不与全局母版误合并", () => {
  const merged = mergeProjectSkillsIntoGlobal([
    createSkill("C:/Users/test/.agents/skills/demo", "global", ["通用 Skill 目录"], [], null, "global-content"),
    createSkill("D:/sources/demo", "custom", [], [], null, "custom-content"),
  ])

  assert.equal(merged.length, 2)
})
