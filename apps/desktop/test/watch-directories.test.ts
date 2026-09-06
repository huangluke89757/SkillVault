import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { resolveWatchDirectories } from "../src/main/watch-directories"

test("文件监听只创建通用目录，不创建尚不存在的 Agent 目录", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skillvault-watch-"))
  const canonicalDir = path.join(root, ".agents", "skills")
  const existingAgentDir = path.join(root, ".claude", "skills")
  const missingAgentDir = path.join(root, ".copilot", "skills")

  try {
    await fs.mkdir(existingAgentDir, { recursive: true })
    await fs.mkdir(path.dirname(missingAgentDir), { recursive: true })

    const directories = await resolveWatchDirectories(
      canonicalDir,
      [existingAgentDir, missingAgentDir],
    )

    assert.ok(directories.includes(await fs.realpath(canonicalDir)))
    assert.ok(directories.includes(await fs.realpath(existingAgentDir)))
    await assert.rejects(fs.stat(missingAgentDir))
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
