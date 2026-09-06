import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { findSkillDirectories } from "../src/main/skill-directory-scanner"

async function withFixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-global-scan-"))
  try {
    await run(root)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function createSkill(skillDir: string): Promise<void> {
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(path.join(skillDir, "SKILL.md"), "---\nname: test\ndescription: test\n---\n")
}

test("全局目录可递归发现任意分组层级的 Skill", async () => {
  await withFixture(async (root) => {
    const nested = path.join(root, "team", "frontend", "react", "review")
    const flat = path.join(root, "pdf")
    await Promise.all([createSkill(nested), createSkill(flat)])

    const discovered = await findSkillDirectories(root)
    assert.deepEqual(
      new Set(discovered.map((skill) => skill.canonicalPath)),
      new Set([await fs.realpath(nested), await fs.realpath(flat)]),
    )
  })
})

test("命中 Skill 后不扫描其支持文件目录", async () => {
  await withFixture(async (root) => {
    const skill = path.join(root, "pdf")
    const nested = path.join(skill, "references", "not-a-skill")
    await Promise.all([createSkill(skill), createSkill(nested)])

    const discovered = await findSkillDirectories(root)
    assert.deepEqual(discovered.map((item) => item.canonicalPath), [await fs.realpath(skill)])
  })
})

test("跳过依赖和构建产物目录", async () => {
  await withFixture(async (root) => {
    const visible = path.join(root, "visible")
    await Promise.all([
      createSkill(visible),
      createSkill(path.join(root, "node_modules", "hidden")),
      createSkill(path.join(root, "build", "generated")),
      createSkill(path.join(root, ".git", "internal")),
    ])

    const discovered = await findSkillDirectories(root)
    assert.deepEqual(discovered.map((item) => item.canonicalPath), [await fs.realpath(visible)])
  })
})

test("Junction 循环不会重复或无限递归", async () => {
  await withFixture(async (root) => {
    const skill = path.join(root, "skills", "shared")
    const loop = path.join(root, "skills", "back-to-root")
    await createSkill(skill)
    await fs.symlink(
      process.platform === "win32" ? root : path.relative(path.dirname(loop), root),
      loop,
      process.platform === "win32" ? "junction" : undefined,
    )

    const discovered = await findSkillDirectories(root)
    assert.deepEqual(discovered.map((item) => item.canonicalPath), [await fs.realpath(skill)])
  })
})
