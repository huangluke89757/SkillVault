import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  assertSafePathSegment,
  isPathInside,
  removeSkillPath,
  validateSkillRemovalRequest,
} from "../src/main/skill-removal"

const root = path.join(os.tmpdir(), "skillvault-removal-root")

test("只允许删除授权根目录中的直接 Skill 目录，不能删除根目录本身", () => {
  const skillPath = path.join(root, "demo-skill")
  const request = validateSkillRemovalRequest({
    name: "demo-skill",
    targets: [{
      path: skillPath,
      canonicalPath: skillPath,
      scope: "custom",
    }],
  }, [root])

  assert.equal(request.targets[0].path, path.resolve(skillPath))
  assert.throws(() => validateSkillRemovalRequest({
    name: "demo-skill",
    targets: [{ path: root, canonicalPath: root, scope: "custom" }],
  }, [root]), /根目录/)
})

test("路径前缀相同的相邻目录不属于授权根目录", () => {
  assert.equal(isPathInside(root, path.join(root, "demo")), true)
  assert.equal(isPathInside(root, `${root}-other${path.sep}demo`), false)
})

test("显示路径合法但母本越界时同样拒绝删除", () => {
  const skillPath = path.join(root, "demo")
  assert.throws(() => validateSkillRemovalRequest({
    name: "demo",
    targets: [{
      path: skillPath,
      canonicalPath: path.join(os.tmpdir(), "outside", "demo"),
      scope: "global",
    }],
  }, [root]), /授权范围之外/)
})

test("拒绝空目录名、点目录和路径穿越，同时允许中文目录名", () => {
  for (const value of ["", ".", "..", `..${path.sep}demo`, "demo/child", "demo\\child"]) {
    assert.throws(() => assertSafePathSegment(value), /无效/)
  }
  assert.equal(assertSafePathSegment("中文技能"), "中文技能")
})

test("批量删除按真实路径去重，不会按同名 Skill 合并目标", () => {
  const first = path.join(root, "project-a", "same-name")
  const second = path.join(root, "project-b", "same-name")
  const request = validateSkillRemovalRequest({
    name: "same-name",
    targets: [
      { path: first, canonicalPath: first, scope: "project" },
      { path: first, canonicalPath: first, scope: "project" },
      { path: second, canonicalPath: second, scope: "project" },
    ],
  }, [root])

  assert.deepEqual(request.targets.map((target) => target.path), [
    path.resolve(first),
    path.resolve(second),
  ])
})

test("Junction 只解除链接，实体目录进入回收站", async () => {
  const calls: string[] = []
  const operations = {
    lstat: async () => ({ isSymbolicLink: () => true, isDirectory: () => true }),
    unlink: async (targetPath: string) => { calls.push(`unlink:${targetPath}`) },
    trash: async (targetPath: string) => { calls.push(`trash:${targetPath}`) },
  }
  await removeSkillPath("D:/skills/link", operations)
  assert.deepEqual(calls, ["unlink:D:/skills/link"])

  calls.length = 0
  operations.lstat = async () => ({ isSymbolicLink: () => false, isDirectory: () => true })
  await removeSkillPath("D:/skills/entity", operations)
  assert.deepEqual(calls, ["trash:D:/skills/entity"])
})

test("真实文件系统中删除 Junction 不会触碰母本", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-removal-link-"))
  const master = path.join(fixture, "master")
  const link = path.join(fixture, "link")
  await fs.mkdir(master)
  await fs.writeFile(path.join(master, "SKILL.md"), "master")
  await fs.symlink(master, link, process.platform === "win32" ? "junction" : "dir")
  try {
    const result = await removeSkillPath(link, {
      lstat: (targetPath) => fs.lstat(targetPath),
      unlink: (targetPath) => fs.unlink(targetPath),
      trash: async () => { throw new Error("Junction 不应进入实体目录删除分支") },
    })
    assert.equal(result, "link")
    await assert.rejects(fs.lstat(link))
    assert.equal(await fs.readFile(path.join(master, "SKILL.md"), "utf8"), "master")
  } finally {
    await fs.rm(fixture, { recursive: true, force: true })
  }
})

test("真实实体 Skill 通过回收站操作完整移出原位置", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-removal-entity-"))
  const skillDir = path.join(fixture, "demo-skill")
  const recycleDir = path.join(fixture, "recycle", "demo-skill")
  await fs.mkdir(path.join(skillDir, "references"), { recursive: true })
  await fs.writeFile(path.join(skillDir, "SKILL.md"), "skill")
  await fs.writeFile(path.join(skillDir, "references", "guide.md"), "guide")
  try {
    const result = await removeSkillPath(skillDir, {
      lstat: (targetPath) => fs.lstat(targetPath),
      unlink: (targetPath) => fs.unlink(targetPath),
      trash: async (targetPath) => {
        await fs.mkdir(path.dirname(recycleDir), { recursive: true })
        await fs.rename(targetPath, recycleDir)
      },
    })
    assert.equal(result, "directory")
    await assert.rejects(fs.lstat(skillDir))
    assert.equal(await fs.readFile(path.join(recycleDir, "SKILL.md"), "utf8"), "skill")
    assert.equal(await fs.readFile(path.join(recycleDir, "references", "guide.md"), "utf8"), "guide")
  } finally {
    await fs.rm(fixture, { recursive: true, force: true })
  }
})
