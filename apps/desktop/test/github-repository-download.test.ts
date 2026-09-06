import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import AdmZip from "adm-zip"
import {
  acquireGitHubRepository,
  cleanupDownloadTempDirectories,
  downloadGitHubSkillFiles,
} from "../src/main/github-repository-download"

async function withTempDirectory(
  run: (root: string) => Promise<void>,
): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-github-download-"))
  try {
    await run(root)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

function createRepositoryArchive(): Buffer {
  const zip = new AdmZip()
  zip.addFile("demo-repo-HEAD/SKILL.md", Buffer.from("# Demo Skill", "utf-8"))
  zip.addFile("demo-repo-HEAD/references/guide.md", Buffer.from("guide", "utf-8"))
  return zip.toBuffer()
}

test("应用异常退出后会清理上次未完成的市场下载", async () => {
  await withTempDirectory(async (root) => {
    const stale = path.join(root, "skillvault-1788254552151-fd526f39")
    const unrelated = path.join(root, "skillvault-user-data")
    await fs.mkdir(stale)
    await fs.mkdir(unrelated)

    await cleanupDownloadTempDirectories(root)

    await assert.rejects(fs.access(stale))
    await fs.access(unrelated)
  })
})

test("系统没有 Git 时自动改用 GitHub 压缩包下载", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    const result = await acquireGitHubRepository({
      owner: "demo-owner",
      repo: "demo-repo",
      destination,
      clone: async () => ({ success: false, error: "spawn git ENOENT" }),
      fetchArchive: async () => createRepositoryArchive(),
    })

    assert.deepEqual(result, { success: true, method: "archive" })
    assert.equal(
      await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"),
      "# Demo Skill",
    )
    assert.equal(
      await fs.readFile(path.join(destination, "references", "guide.md"), "utf-8"),
      "guide",
    )
  })
})

test("Git 克隆留下不完整目录时，降级下载会先清理再安装", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    const result = await acquireGitHubRepository({
      owner: "demo-owner",
      repo: "demo-repo",
      destination,
      clone: async (_url, cloneDestination) => {
        await fs.mkdir(cloneDestination, { recursive: true })
        await fs.writeFile(path.join(cloneDestination, "partial.lock"), "partial")
        return { success: false, error: "connection reset" }
      },
      fetchArchive: async () => createRepositoryArchive(),
    })

    assert.equal(result.success, true)
    await assert.rejects(fs.access(path.join(destination, "partial.lock")))
    assert.equal(await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"), "# Demo Skill")
  })
})

test("Git 可用时保持原有克隆方式，不重复下载压缩包", async () => {
  await withTempDirectory(async (root) => {
    let archiveRequested = false
    const result = await acquireGitHubRepository({
      owner: "demo-owner",
      repo: "demo-repo",
      destination: path.join(root, "repository"),
      clone: async () => ({ success: true }),
      fetchArchive: async () => {
        archiveRequested = true
        return createRepositoryArchive()
      },
    })

    assert.deepEqual(result, { success: true, method: "git" })
    assert.equal(archiveRequested, false)
  })
})

test("只下载市场中选中的 Skill，不拉取同仓库的其他内容", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    const requestedUrls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      requestedUrls.push(url)
      if (url.includes("/git/trees/HEAD")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "skills/find-skills/SKILL.md", type: "blob", mode: "100644" },
            { path: "skills/find-skills/references/guide.md", type: "blob", mode: "100644" },
            { path: "skills/other-skill/SKILL.md", type: "blob", mode: "100644" },
          ],
        })
      }
      if (url.endsWith("skills/find-skills/SKILL.md")) {
        return new Response("# Find Skills")
      }
      if (url.endsWith("skills/find-skills/references/guide.md")) {
        return new Response("guide")
      }
      throw new Error(`Unexpected request: ${url}`)
    }

    await downloadGitHubSkillFiles(
      "vercel-labs",
      "skills",
      "find-skills",
      destination,
      fetchImpl,
    )

    assert.equal(await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"), "# Find Skills")
    assert.equal(
      await fs.readFile(path.join(destination, "references", "guide.md"), "utf-8"),
      "guide",
    )
    assert.equal(requestedUrls.some((url) => url.includes("other-skill")), false)
  })
})

test("GitHub Raw 不可用时通过 Contents API 下载所选文件", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    const requestedUrls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      requestedUrls.push(url)
      if (url.includes("/git/trees/HEAD")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "skills/find-skills/SKILL.md", type: "blob", size: 13 },
          ],
        })
      }
      if (url.includes("raw.githubusercontent.com")) {
        throw new Error("raw host unavailable")
      }
      if (url.includes("api.github.com/repos/vercel-labs/skills/contents/")) {
        return new Response("# Find Skills")
      }
      throw new Error(`Unexpected request: ${url}`)
    }

    await downloadGitHubSkillFiles(
      "vercel-labs",
      "skills",
      "find-skills",
      destination,
      fetchImpl,
    )

    assert.equal(await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"), "# Find Skills")
    assert.equal(
      requestedUrls.some((url) => url.includes("api.github.com/repos/vercel-labs/skills/contents/")),
      true,
    )
  })
})

test("支持仓库中非标准层级的 Skill 目录", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.includes("/git/trees/HEAD")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "packages/community/find-skills/SKILL.md", type: "blob" },
            { path: "packages/community/find-skills/guide.md", type: "blob" },
            { path: "SKILL.md", type: "blob" },
          ],
        })
      }
      if (url.endsWith("packages/community/find-skills/SKILL.md")) {
        return new Response("# Find Skills")
      }
      if (url.endsWith("packages/community/find-skills/guide.md")) {
        return new Response("guide")
      }
      throw new Error(`Unexpected request: ${url}`)
    }

    await downloadGitHubSkillFiles(
      "demo-owner",
      "demo-repo",
      "find-skills",
      destination,
      fetchImpl,
    )

    assert.equal(await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"), "# Find Skills")
    assert.equal(await fs.readFile(path.join(destination, "guide.md"), "utf-8"), "guide")
  })
})

test("文件响应被截断时会重试并校验完整大小", async () => {
  await withTempDirectory(async (root) => {
    const destination = path.join(root, "repository")
    let fileAttempts = 0
    const progress: Array<{ downloadedBytes: number; totalBytes: number }> = []
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      if (url.includes("/git/trees/HEAD")) {
        return Response.json({
          truncated: false,
          tree: [
            { path: "skills/demo-skill/SKILL.md", type: "blob", size: 5 },
          ],
        })
      }
      if (url.includes("raw.githubusercontent.com")) {
        fileAttempts += 1
        return new Response(fileAttempts === 1 ? "bad" : "valid")
      }
      throw new Error(`Unexpected request: ${url}`)
    }

    await downloadGitHubSkillFiles(
      "demo-owner",
      "demo-repo",
      "demo-skill",
      destination,
      fetchImpl,
      (value) => progress.push(value),
    )

    assert.equal(fileAttempts, 2)
    assert.equal(await fs.readFile(path.join(destination, "SKILL.md"), "utf-8"), "valid")
    assert.equal(progress.at(-1)?.downloadedBytes, 5)
    assert.equal(progress.at(-1)?.totalBytes, 5)
  })
})

test("市场安装有明确 Skill 时优先直连下载，不依赖 Git", async () => {
  await withTempDirectory(async (root) => {
    let cloneCalled = false
    let archiveRequested = false
    const destination = path.join(root, "repository")
    const result = await acquireGitHubRepository({
      owner: "demo-owner",
      repo: "demo-repo",
      skillId: "demo-skill",
      destination,
      clone: async () => {
        cloneCalled = true
        return { success: false }
      },
      downloadSkillFiles: async (_owner, _repo, _skillId, target) => {
        await fs.mkdir(target, { recursive: true })
        await fs.writeFile(path.join(target, "SKILL.md"), "# Demo Skill")
      },
      fetchArchive: async () => {
        archiveRequested = true
        return createRepositoryArchive()
      },
    })

    assert.deepEqual(result, { success: true, method: "files" })
    assert.equal(cloneCalled, false)
    assert.equal(archiveRequested, false)
  })
})

test("所选文件直连失败后先尝试压缩包，避免等待 Git", async () => {
  await withTempDirectory(async (root) => {
    let cloneCalled = false
    const result = await acquireGitHubRepository({
      owner: "demo-owner",
      repo: "demo-repo",
      skillId: "demo-skill",
      destination: path.join(root, "repository"),
      clone: async () => {
        cloneCalled = true
        return { success: false, error: "clone timeout" }
      },
      downloadSkillFiles: async () => {
        throw new Error("raw host unavailable")
      },
      fetchArchive: async () => createRepositoryArchive(),
    })

    assert.deepEqual(result, { success: true, method: "archive" })
    assert.equal(cloneCalled, false)
  })
})
