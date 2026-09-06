import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { findCustomSkillLocations } from "../src/main/custom-skill-scanner"

const PROBES = [
  { subpath: ".claude/skills" },
  { subpath: ".codex/skills" },
  { subpath: ".agents/skills" },
]

async function withFixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-custom-scan-"))
  try {
    await run(root)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function createSkill(skillDir: string, name: string): Promise<void> {
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: test\n---\n`,
  )
}

test("自定义目录本身是项目时可以发现项目 Skill", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(root, ".claude", "skills", "dbs-hook")
    await createSkill(skillDir, "dbs-hook")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(skillDir))
    assert.equal(locations[0].scope, "project")
    assert.equal(locations[0].projectName, path.basename(root))
  })
})

test("可以发现自定义目录下两级项目中的 Skill", async () => {
  await withFixture(async (root) => {
    const projectRoot = path.join(root, "project11", "skillvault")
    const skillDir = path.join(projectRoot, ".agents", "skills", "finesse-ui")
    await createSkill(skillDir, "finesse-ui")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(skillDir))
    assert.equal(locations[0].projectName, "skillvault")
  })
})

test("同一 Skill 的项目 Junction 只显示一次", async () => {
  await withFixture(async (root) => {
    const projectRoot = path.join(root, "project")
    const masterDir = path.join(projectRoot, ".agents", "skills", "finesse-ui")
    const claudeDir = path.join(projectRoot, ".claude", "skills", "finesse-ui")
    await createSkill(masterDir, "finesse-ui")
    await fs.mkdir(path.dirname(claudeDir), { recursive: true })
    await fs.symlink(
      process.platform === "win32" ? masterDir : path.relative(path.dirname(claudeDir), masterDir),
      claudeDir,
      process.platform === "win32" ? "junction" : undefined,
    )

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(masterDir))
  })
})

test("可以发现任意层级项目中的 Skill", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(
      root,
      "level-one",
      "level-two",
      "level-three",
      ".claude",
      "skills",
      "too-deep",
    )
    await createSkill(skillDir, "too-deep")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(skillDir))
    assert.equal(locations[0].scope, "project")
    assert.equal(locations[0].projectName, "level-three")
  })
})

test("可以递归发现自定义目录中的深层独立 Skill", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(root, "collections", "writing", "humanizer-zh")
    await createSkill(skillDir, "humanizer-zh")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(skillDir))
    assert.equal(locations[0].scope, "custom")
  })
})

test("添加工作区根目录时不把嵌套 Git 仓库的素材 Skill 当作已安装", async () => {
  await withFixture(async (root) => {
    const repository = path.join(root, "research", "downloaded-repository")
    const repositorySkill = path.join(repository, "skills", "not-installed")
    const projectSkill = path.join(repository, ".agents", "skills", "project-skill")
    await fs.mkdir(path.join(repository, ".git"), { recursive: true })
    await createSkill(repositorySkill, "not-installed")
    await createSkill(projectSkill, "project-skill")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.deepEqual(locations.map((location) => location.canonicalPath), [
      await fs.realpath(projectSkill),
    ])
    assert.equal(locations[0].scope, "project")
  })
})

test("显式添加仓库本身时仍能扫描仓库中的 Skill 集合", async () => {
  await withFixture(async (root) => {
    const repositorySkill = path.join(root, "skills", "explicit-skill")
    await fs.mkdir(path.join(root, ".git"), { recursive: true })
    await createSkill(repositorySkill, "explicit-skill")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].canonicalPath, await fs.realpath(repositorySkill))
    assert.equal(locations[0].scope, "custom")
  })
})

test("自定义扫描不会进入虚拟环境和工具依赖目录", async () => {
  await withFixture(async (root) => {
    const visibleSkill = path.join(root, "collections", "visible-skill")
    await createSkill(visibleSkill, "visible-skill")
    await createSkill(
      path.join(root, "project", ".venv", "Lib", "site-packages", "dependency-skill"),
      "dependency-skill",
    )
    await createSkill(
      path.join(root, "project", ".tools", "runner", ".deps", "bundled-skill"),
      "bundled-skill",
    )

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.deepEqual(locations.map((location) => location.canonicalPath), [
      await fs.realpath(visibleSkill),
    ])
  })
})

test("自定义扫描不会跟随普通 Junction 跳到其他目录", async () => {
  await withFixture(async (root) => {
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-external-skill-"))
    const externalSkill = path.join(externalRoot, "linked-skill")
    const link = path.join(root, "generated-links", "linked-skill")
    try {
      await createSkill(externalSkill, "linked-skill")
      await fs.mkdir(path.dirname(link), { recursive: true })
      await fs.symlink(
        process.platform === "win32"
          ? externalSkill
          : path.relative(path.dirname(link), externalSkill),
        link,
        process.platform === "win32" ? "junction" : undefined,
      )

      const locations = await findCustomSkillLocations(root, PROBES)

      assert.equal(locations.length, 0)
    } finally {
      await fs.rm(externalRoot, { recursive: true, force: true })
    }
  })
})

test("项目内分组目录中的 Skill 保留 Agent 归属", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(
      root,
      "project",
      ".claude",
      "skills",
      "team",
      "review",
    )
    await createSkill(skillDir, "review")

    const locations = await findCustomSkillLocations(root, [
      { subpath: ".claude/skills", agentName: "claude-code" },
    ])

    assert.equal(locations.length, 1)
    assert.equal(locations[0].scope, "project")
    assert.equal(locations[0].agentName, "claude-code")
    assert.equal(locations[0].projectName, "project")
  })
})

test("保留直接存放多个独立 Skill 的原有用法", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(root, "standalone-skill")
    await createSkill(skillDir, "standalone-skill")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].scope, "custom")
    assert.equal(locations[0].canonicalPath, await fs.realpath(skillDir))
  })
})

test("项目探针会把对应 Agent 带回扫描结果", async () => {
  await withFixture(async (root) => {
    const claudeDir = path.join(root, "project", ".claude", "skills", "dbs-hook")
    const universalDir = path.join(root, "project", ".agents", "skills", "finesse-ui")
    await createSkill(claudeDir, "dbs-hook")
    await createSkill(universalDir, "finesse-ui")

    const locations = await findCustomSkillLocations(root, [
      { subpath: ".claude/skills", agentName: "claude-code" },
      { subpath: ".agents/skills", agentName: "universal" },
    ])
    assert.equal(locations.length, 2)
    const byCanonical = new Map(locations.map((l) => [l.canonicalPath, l]))
    assert.equal(
      byCanonical.get(await fs.realpath(claudeDir))?.agentName,
      "claude-code",
    )
    assert.equal(
      byCanonical.get(await fs.realpath(universalDir))?.agentName,
      "universal",
    )
  })
})

test("非探针来源的 Skill 不归属任何 Agent", async () => {
  await withFixture(async (root) => {
    const skillDir = path.join(root, "standalone-skill")
    await createSkill(skillDir, "standalone-skill")

    const locations = await findCustomSkillLocations(root, PROBES)

    assert.equal(locations.length, 1)
    assert.equal(locations[0].agentName, null)
  })
})
