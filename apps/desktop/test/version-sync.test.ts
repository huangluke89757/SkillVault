import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  compareSkillContents,
  createSkillContentFingerprint,
  syncAgentCopyToMaster,
} from "../src/main/version-sync"

async function withFixture(
  run: (masterPath: string, agentPath: string) => Promise<void>,
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-version-sync-"))
  const masterPath = path.join(root, "master")
  const agentPath = path.join(root, "agent")
  await Promise.all([
    fs.mkdir(masterPath, { recursive: true }),
    fs.mkdir(agentPath, { recursive: true }),
  ])
  try {
    await run(masterPath, agentPath)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

test("相同内容位于不同目录时不算版本未同步", async () => {
  await withFixture(async (masterPath, agentPath) => {
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "same content"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "same content"),
    ])
    await fs.utimes(path.join(agentPath, "SKILL.md"), new Date(0), new Date(0))

    assert.deepEqual(await compareSkillContents(masterPath, agentPath), [])
  })
})

test("内容指纹只由 Skill 的有效文件内容决定", async () => {
  await withFixture(async (masterPath, agentPath) => {
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "same content"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "same content"),
    ])

    assert.equal(
      await createSkillContentFingerprint(masterPath),
      await createSkillContentFingerprint(agentPath),
    )

    await fs.writeFile(path.join(agentPath, "reference.md"), "extra content")
    assert.notEqual(
      await createSkillContentFingerprint(masterPath),
      await createSkillContentFingerprint(agentPath),
    )
  })
})

test("只报告真实的文件内容差异", async () => {
  await withFixture(async (masterPath, agentPath) => {
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "master"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "agent"),
      fs.writeFile(path.join(masterPath, "master-only.md"), "master only"),
      fs.writeFile(path.join(agentPath, "agent-only.md"), "agent only"),
    ])

    assert.deepEqual(await compareSkillContents(masterPath, agentPath), [
      { relativePath: "SKILL.md", kind: "modified" },
      { relativePath: "agent-only.md", kind: "only-agent" },
      { relativePath: "master-only.md", kind: "only-master" },
    ])
  })
})

test("忽略依赖目录和系统生成文件", async () => {
  await withFixture(async (masterPath, agentPath) => {
    await Promise.all([
      fs.mkdir(path.join(masterPath, "node_modules", "pkg"), { recursive: true }),
      fs.mkdir(path.join(agentPath, "node_modules", "pkg"), { recursive: true }),
    ])
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "same"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "same"),
      fs.writeFile(path.join(masterPath, "node_modules", "pkg", "index.js"), "master"),
      fs.writeFile(path.join(agentPath, "node_modules", "pkg", "index.js"), "agent"),
      fs.writeFile(path.join(masterPath, ".DS_Store"), "master"),
      fs.writeFile(path.join(agentPath, ".DS_Store"), "agent"),
    ])

    assert.deepEqual(await compareSkillContents(masterPath, agentPath), [])
  })
})

test("将独立副本同步为母版，并保留同步前的双方版本", async () => {
  await withFixture(async (masterPath, agentPath) => {
    const backupRoot = path.join(path.dirname(masterPath), "backups")
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "old master"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "new agent copy"),
      fs.writeFile(path.join(agentPath, "agent-only.md"), "agent only"),
    ])

    const result = await syncAgentCopyToMaster({
      skillName: "demo-skill",
      agentName: "claude-code",
      masterPath,
      agentPath,
      backupRoot,
    })

    assert.equal(await fs.readFile(path.join(masterPath, "SKILL.md"), "utf8"), "new agent copy")
    assert.equal(await fs.readFile(path.join(masterPath, "agent-only.md"), "utf8"), "agent only")
    assert.equal((await fs.lstat(agentPath)).isSymbolicLink(), true)
    assert.equal(await fs.realpath(agentPath), await fs.realpath(masterPath))
    assert.equal(
      await fs.readFile(path.join(result.previousMasterBackupPath, "SKILL.md"), "utf8"),
      "old master",
    )
    assert.equal(
      await fs.readFile(path.join(result.sourceCopyBackupPath, "SKILL.md"), "utf8"),
      "new agent copy",
    )
  })
})

test("项目通用目录副本同步时，母版与副本备份不会相互覆盖", async () => {
  await withFixture(async (masterPath, agentPath) => {
    const backupRoot = path.join(path.dirname(masterPath), "backups")
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "old master"),
      fs.writeFile(path.join(agentPath, "SKILL.md"), "project universal copy"),
    ])

    const result = await syncAgentCopyToMaster({
      skillName: "demo-skill",
      agentName: "universal",
      masterPath,
      agentPath,
      backupRoot,
    })

    assert.notEqual(result.previousMasterBackupPath, result.sourceCopyBackupPath)
    assert.equal(
      await fs.readFile(path.join(result.previousMasterBackupPath, "SKILL.md"), "utf8"),
      "old master",
    )
    assert.equal(
      await fs.readFile(path.join(result.sourceCopyBackupPath, "SKILL.md"), "utf8"),
      "project universal copy",
    )
  })
})

test(
  "项目副本与母版位于不同磁盘时仍可同步",
  { skip: path.parse(os.homedir()).root.toLowerCase() === path.parse(os.tmpdir()).root.toLowerCase() },
  async () => {
    const masterRoot = await fs.mkdtemp(
      path.join(os.homedir(), ".skillvault-version-sync-cross-volume-"),
    )
    const agentRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "skillvault-version-sync-cross-volume-"),
    )
    const masterPath = path.join(masterRoot, "master")
    const agentPath = path.join(agentRoot, "agent")
    const backupRoot = path.join(masterRoot, "backups")

    try {
      await Promise.all([
        fs.mkdir(masterPath, { recursive: true }),
        fs.mkdir(agentPath, { recursive: true }),
      ])
      await Promise.all([
        fs.writeFile(path.join(masterPath, "SKILL.md"), "old master"),
        fs.writeFile(path.join(agentPath, "SKILL.md"), "project copy"),
      ])

      const result = await syncAgentCopyToMaster({
        skillName: "demo-skill",
        agentName: "universal",
        masterPath,
        agentPath,
        backupRoot,
      })

      assert.equal(await fs.readFile(path.join(masterPath, "SKILL.md"), "utf8"), "project copy")
      assert.equal(await fs.realpath(agentPath), await fs.realpath(masterPath))
      assert.equal(
        await fs.readFile(path.join(result.sourceCopyBackupPath, "SKILL.md"), "utf8"),
        "project copy",
      )
    } finally {
      await fs.rm(masterRoot, { recursive: true, force: true })
      await fs.rm(agentRoot, { recursive: true, force: true })
    }
  },
)

test("多个独立副本依次同步时，已链接 Agent 跟随最新母版", async () => {
  await withFixture(async (masterPath, firstAgentPath) => {
    const backupRoot = path.join(path.dirname(masterPath), "backups")
    const secondAgentPath = path.join(path.dirname(masterPath), "second-agent")
    await fs.mkdir(secondAgentPath, { recursive: true })
    await Promise.all([
      fs.writeFile(path.join(masterPath, "SKILL.md"), "master"),
      fs.writeFile(path.join(firstAgentPath, "SKILL.md"), "first agent"),
      fs.writeFile(path.join(secondAgentPath, "SKILL.md"), "second agent"),
    ])

    await syncAgentCopyToMaster({
      skillName: "demo-skill",
      agentName: "claude-code",
      masterPath,
      agentPath: firstAgentPath,
      backupRoot,
    })
    assert.deepEqual(await compareSkillContents(masterPath, secondAgentPath), [
      { relativePath: "SKILL.md", kind: "modified" },
    ])

    await syncAgentCopyToMaster({
      skillName: "demo-skill",
      agentName: "kimi-code",
      masterPath,
      agentPath: secondAgentPath,
      backupRoot,
    })

    assert.equal(await fs.readFile(path.join(firstAgentPath, "SKILL.md"), "utf8"), "second agent")
    assert.deepEqual(await compareSkillContents(masterPath, firstAgentPath), [])
    assert.deepEqual(await compareSkillContents(masterPath, secondAgentPath), [])
  })
})
