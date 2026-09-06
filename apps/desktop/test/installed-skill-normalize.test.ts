import assert from "node:assert/strict"
import test from "node:test"
import { normalizeInstalledSkills } from "../src/renderer/lib/installed-skill-normalize"

test("旧 IPC 数据缺少 projectNames 时补成可安全渲染的数组", () => {
  const normalized = normalizeInstalledSkills([
    { name: "global-skill", projectName: null },
    { name: "project-skill", projectName: "demo-project" },
  ])

  assert.deepEqual(normalized.map((skill) => skill.projectNames), [
    [],
    ["demo-project"],
  ])
})

test("异常 IPC 结果不会让整个页面崩溃", () => {
  assert.deepEqual(normalizeInstalledSkills(undefined), [])
  assert.deepEqual(normalizeInstalledSkills(null), [])
})

test("保留聚合结果中的多个项目归属且不修改原数组", () => {
  const projectNames = ["project-a", "project-b"]
  const [normalized] = normalizeInstalledSkills([{ projectName: "project-a", projectNames }])

  assert.deepEqual(normalized.projectNames, projectNames)
  assert.notEqual(normalized.projectNames, projectNames)
})

test("旧 IPC 数据缺少 locations 时使用当前真实路径补齐", () => {
  const [normalized] = normalizeInstalledSkills([{
    name: "demo",
    path: "D:/project/.agents/skills/demo",
    canonicalPath: "D:/project/.agents/skills/demo",
    scope: "project" as const,
    projectName: "project",
    agents: ["通用 Skill 目录"],
  }])

  assert.deepEqual(normalized.locations, [{
    path: "D:/project/.agents/skills/demo",
    canonicalPath: "D:/project/.agents/skills/demo",
    scope: "project",
    projectName: "project",
    agents: ["通用 Skill 目录"],
  }])
})
