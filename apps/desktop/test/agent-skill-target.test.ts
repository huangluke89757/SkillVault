import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  prepareAgentSkillTarget,
  selectAgentSkillRemovalCandidates,
} from "../src/main/agent-skill-target"

async function withFixture(run: (root: string, master: string, agent: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-agent-target-"))
  const master = path.join(root, "master")
  const agent = path.join(root, "agent")
  await Promise.all([fs.mkdir(master), fs.mkdir(agent)])
  try {
    await run(root, master, agent)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

test("适配时遇到内容不同的实体副本会先完整保留", async () => {
  await withFixture(async (root, master, agent) => {
    await Promise.all([
      fs.writeFile(path.join(master, "SKILL.md"), "master"),
      fs.writeFile(path.join(agent, "SKILL.md"), "agent changes"),
    ])
    const backup = path.join(root, "detached")
    const result = await prepareAgentSkillTarget(agent, master, async (target) => {
      await fs.rename(target, backup)
    }, async () => {
      throw new Error("不应归档内容不同的副本")
    })

    assert.equal(result, "detached")
    assert.equal(await fs.readFile(path.join(backup, "SKILL.md"), "utf8"), "agent changes")
    await assert.rejects(fs.stat(agent))
  })
})

test("适配时归档内容一致的冗余副本", async () => {
  await withFixture(async (root, master, agent) => {
    await Promise.all([
      fs.writeFile(path.join(master, "SKILL.md"), "same"),
      fs.writeFile(path.join(agent, "SKILL.md"), "same"),
    ])
    const archive = path.join(root, "archive")
    const result = await prepareAgentSkillTarget(agent, master, async () => {
      throw new Error("不应暂存一致副本")
    }, async (target) => {
      await fs.rename(target, archive)
    })

    assert.equal(result, "archived-identical")
    await assert.rejects(fs.stat(agent))
    assert.equal(await fs.readFile(path.join(archive, "SKILL.md"), "utf8"), "same")
    assert.equal(await fs.readFile(path.join(master, "SKILL.md"), "utf8"), "same")
  })
})

test("取消适配时同时处理 Agent 的新旧全局目录", () => {
  const matches = [
    { path: "agent-primary", canonicalPath: path.resolve("master") },
    { path: "agent-legacy", canonicalPath: path.resolve("legacy-copy") },
  ]
  const selected = new Set([path.resolve("master")])

  assert.deepEqual(selectAgentSkillRemovalCandidates(matches, selected), matches)
})

test("多个同名位置都与当前 Skill 无关时拒绝猜测", () => {
  const matches = [
    { path: "agent-primary", canonicalPath: path.resolve("copy-a") },
    { path: "agent-legacy", canonicalPath: path.resolve("copy-b") },
  ]

  assert.equal(
    selectAgentSkillRemovalCandidates(matches, new Set([path.resolve("master")])),
    null,
  )
})
