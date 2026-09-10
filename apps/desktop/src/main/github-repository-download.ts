import crypto from "node:crypto"
import dns from "node:dns"
import fs from "node:fs/promises"
import path from "node:path"
import AdmZip from "adm-zip"

dns.setDefaultResultOrder("ipv4first")

type CloneResult = { success: boolean; error?: string }
type CloneRepository = (url: string, destination: string) => Promise<CloneResult>
type FetchArchive = (owner: string, repo: string) => Promise<Buffer>
type DownloadSkillFiles = (
  owner: string,
  repo: string,
  skillId: string,
  destination: string,
) => Promise<void>

export interface GitHubDownloadProgress {
  stage: "resolving" | "downloading" | "fallback"
  completed: number
  total: number
  downloadedBytes: number
  totalBytes: number
}

type AcquireResult =
  | { success: true; method: "files" | "git" | "archive" }
  | { success: false; error: string }

export async function cleanupMarketplaceTempDirectories(tempRoot: string): Promise<void> {
  const entries = await fs.readdir(tempRoot, { withFileTypes: true }).catch(() => [])
  await Promise.all(entries
    .filter((entry) =>
      entry.isDirectory() && /^skillsgate-\d{10,}-[0-9a-f]{8}$/i.test(entry.name),
    )
    .map((entry) =>
      fs.rm(path.join(tempRoot, entry.name), { recursive: true, force: true }),
    ))
}

async function fetchBufferWithRetry(
  url: string,
  fetchImpl: typeof fetch,
  attempts: number,
  maxBytes: number,
  expectedBytes?: number,
  headers?: Record<string, string>,
  onBytes?: (receivedBytes: number) => void,
): Promise<Buffer> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    onBytes?.(0)
    const controller = new AbortController()
    let inactivityTimer: ReturnType<typeof setTimeout> | undefined
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => controller.abort(), 45_000)
    }

    try {
      resetInactivityTimer()
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "SkillVault", ...headers },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`GitHub download HTTP ${response.status}`)
      }
      if (!response.body) {
        throw new Error("GitHub download response has no body")
      }

      const chunks: Buffer[] = []
      let totalBytes = 0
      const reader = response.body.getReader()
      while (true) {
        resetInactivityTimer()
        const { done, value } = await reader.read()
        if (done) break
        const chunk = Buffer.from(value)
        totalBytes += chunk.length
        if (totalBytes > maxBytes) {
          throw new Error("GitHub download is too large")
        }
        chunks.push(chunk)
        onBytes?.(totalBytes)
      }
      if (expectedBytes !== undefined && totalBytes !== expectedBytes) {
        throw new Error(`GitHub download size mismatch: expected ${expectedBytes}, received ${totalBytes}`)
      }
      return Buffer.concat(chunks, totalBytes)
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(inactivityTimer)
    }
  }

  throw lastError
}

export async function fetchGitHubArchive(
  owner: string,
  repo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer> {
  const url = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/HEAD`
  return fetchBufferWithRetry(url, fetchImpl, 2, 512 * 1024 * 1024)
}

interface GitHubTreeEntry {
  path: string
  type: string
  mode?: string
  size?: number
}

export async function downloadGitHubSkillFiles(
  owner: string,
  repo: string,
  skillId: string,
  destination: string,
  fetchImpl: typeof fetch = fetch,
  onProgress?: (progress: GitHubDownloadProgress) => void,
): Promise<void> {
  onProgress?.({
    stage: "resolving",
    completed: 0,
    total: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  })
  const treeResponse = await fetchImpl(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SkillVault",
      },
      signal: AbortSignal.timeout(45_000),
    },
  )
  if (!treeResponse.ok) {
    throw new Error(`GitHub tree HTTP ${treeResponse.status}`)
  }

  const treeData = await treeResponse.json() as {
    truncated?: boolean
    tree?: GitHubTreeEntry[]
  }
  if (treeData.truncated || !Array.isArray(treeData.tree)) {
    throw new Error("GitHub repository tree is incomplete")
  }

  const candidates = [
    `skills/${skillId}/SKILL.md`,
    `skills/.curated/${skillId}/SKILL.md`,
    `skills/.experimental/${skillId}/SKILL.md`,
    `${skillId}/SKILL.md`,
  ]
  const conventionalEntry = candidates
    .map((candidate) => treeData.tree?.find(
      (entry) => entry.type === "blob" && entry.path === candidate,
    ))
    .find((entry): entry is GitHubTreeEntry => Boolean(entry))
  const nestedEntry = treeData.tree.find((entry) =>
    entry.type === "blob" &&
    path.posix.basename(entry.path) === "SKILL.md" &&
    path.posix.basename(path.posix.dirname(entry.path)).toLowerCase() === skillId.toLowerCase(),
  )
  const rootEntry = repo.toLowerCase() === skillId.toLowerCase()
    ? treeData.tree.find(
      (entry) => entry.type === "blob" && entry.path === "SKILL.md",
    )
    : undefined
  const skillEntry = conventionalEntry ?? nestedEntry ?? rootEntry
  if (!skillEntry) {
    throw new Error(`Skill ${skillId} was not found in the repository tree`)
  }

  const skillRoot = path.posix.dirname(skillEntry.path)
  const rootPrefix = skillRoot === "." ? "" : `${skillRoot}/`
  const files = treeData.tree.filter(
    (entry) => entry.type === "blob" && entry.path.startsWith(rootPrefix),
  )
  if (files.length === 0) {
    throw new Error(`Skill ${skillId} has no downloadable files`)
  }

  const totalBytes = files.reduce((sum, entry) => sum + (entry.size ?? 0), 0)
  if (totalBytes > 1024 * 1024 * 1024) {
    throw new Error("Skill files exceed 1 GB")
  }

  await fs.rm(destination, { recursive: true, force: true })
  await fs.mkdir(destination, { recursive: true })
  let nextIndex = 0
  let completedFiles = 0
  const receivedByFile = new Array<number>(files.length).fill(0)
  let lastProgressAt = 0
  const emitDownloadProgress = (force = false) => {
    const now = Date.now()
    if (!force && now - lastProgressAt < 250) return
    lastProgressAt = now
    onProgress?.({
      stage: "downloading",
      completed: completedFiles,
      total: files.length,
      downloadedBytes: receivedByFile.reduce((sum, size) => sum + size, 0),
      totalBytes,
    })
  }
  emitDownloadProgress(true)
  const downloadFile = async (fileIndex: number) => {
    const entry = files[fileIndex]
    const relativePath = rootPrefix
      ? entry.path.slice(rootPrefix.length)
      : entry.path
    const targetPath = path.resolve(destination, relativePath)
    const destinationRoot = `${path.resolve(destination)}${path.sep}`
    if (!targetPath.startsWith(destinationRoot)) {
      throw new Error("GitHub repository contains an invalid file path")
    }

    const encodedPath = entry.path.split("/").map(encodeURIComponent).join("/")
    const fileUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/HEAD/${encodedPath}`
    let content: Buffer
    try {
      content = await fetchBufferWithRetry(
        fileUrl,
        fetchImpl,
        3,
        512 * 1024 * 1024,
        entry.size,
        undefined,
        (receivedBytes) => {
          receivedByFile[fileIndex] = receivedBytes
          emitDownloadProgress()
        },
      )
    } catch (rawError) {
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=HEAD`
      try {
        content = await fetchBufferWithRetry(
          apiUrl,
          fetchImpl,
          2,
          512 * 1024 * 1024,
          entry.size,
          { Accept: "application/vnd.github.raw+json" },
          (receivedBytes) => {
            receivedByFile[fileIndex] = receivedBytes
            emitDownloadProgress()
          },
        )
      } catch {
        throw rawError
      }
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, content)
    if (process.platform !== "win32" && entry.mode?.endsWith("755")) {
      await fs.chmod(targetPath, 0o755)
    }
    completedFiles += 1
    emitDownloadProgress(true)
  }

  let workerFailure: unknown
  const workers = Array.from({ length: Math.min(4, files.length) }, async () => {
    while (workerFailure === undefined && nextIndex < files.length) {
      const fileIndex = nextIndex
      nextIndex += 1
      try {
        await downloadFile(fileIndex)
      } catch (error) {
        workerFailure ??= error
      }
    }
  })
  await Promise.allSettled(workers)
  if (workerFailure !== undefined) throw workerFailure
}

async function extractRepositoryArchive(
  archive: Buffer,
  destination: string,
): Promise<void> {
  const extractRoot = `${destination}.archive-${crypto.randomUUID().slice(0, 8)}`
  try {
    await fs.rm(extractRoot, { recursive: true, force: true })
    await fs.mkdir(extractRoot, { recursive: true })

    const zip = new AdmZip(archive)
    if (zip.getEntryCount() === 0) {
      throw new Error("GitHub archive is empty")
    }
    await zip.extractAllToAsync(extractRoot, true, false)

    const extracted = await fs.readdir(extractRoot, { withFileTypes: true })
    const contentRoot =
      extracted.length === 1 && extracted[0].isDirectory()
        ? path.join(extractRoot, extracted[0].name)
        : extractRoot
    const contentEntries = await fs.readdir(contentRoot, { withFileTypes: true })
    if (contentEntries.length === 0) {
      throw new Error("GitHub archive has no files")
    }

    await fs.mkdir(destination, { recursive: true })
    for (const entry of contentEntries) {
      await fs.rename(
        path.join(contentRoot, entry.name),
        path.join(destination, entry.name),
      )
    }
  } finally {
    await fs.rm(extractRoot, { recursive: true, force: true }).catch(() => {})
  }
}

export async function acquireGitHubRepository({
  owner,
  repo,
  skillId,
  destination,
  clone,
  fetchArchive = fetchGitHubArchive,
  downloadSkillFiles = downloadGitHubSkillFiles,
  fetchImpl = fetch,
  onProgress,
}: {
  owner: string
  repo: string
  skillId?: string
  destination: string
  clone: CloneRepository
  fetchArchive?: FetchArchive
  downloadSkillFiles?: DownloadSkillFiles
  fetchImpl?: typeof fetch
  onProgress?: (progress: GitHubDownloadProgress) => void
}): Promise<AcquireResult> {
  let directDownloadFailed = false
  if (skillId) {
    try {
      if (downloadSkillFiles === downloadGitHubSkillFiles) {
        await downloadGitHubSkillFiles(
          owner,
          repo,
          skillId,
          destination,
          fetchImpl,
          onProgress,
        )
      } else {
        await downloadSkillFiles(owner, repo, skillId, destination)
      }
      return { success: true, method: "files" }
    } catch (error) {
      console.warn(
        `[marketplace] Direct skill download failed for ${owner}/${repo}/${skillId}; falling back to repository download`,
        error,
      )
      directDownloadFailed = true
      await fs.rm(destination, { recursive: true, force: true }).catch(() => {})
    }
  }

  onProgress?.({
    stage: "fallback",
    completed: 0,
    total: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  })
  const tryArchive = async (): Promise<boolean> => {
    try {
      await extractRepositoryArchive(
        fetchArchive === fetchGitHubArchive
          ? await fetchGitHubArchive(owner, repo, fetchImpl)
          : await fetchArchive(owner, repo),
        destination,
      )
      return true
    } catch (error) {
      console.warn(
        `[marketplace] GitHub archive download failed for ${owner}/${repo}`,
        error,
      )
      await fs.rm(destination, { recursive: true, force: true }).catch(() => {})
      return false
    }
  }

  if (directDownloadFailed && await tryArchive()) {
    return { success: true, method: "archive" }
  }

  const repositoryUrl = `https://github.com/${owner}/${repo}.git`
  const cloneResult = await clone(repositoryUrl, destination)
  if (cloneResult.success) {
    return { success: true, method: "git" }
  }

  console.warn(
    directDownloadFailed
      ? `[marketplace] Git clone also failed for ${owner}/${repo}`
      : `[marketplace] Git clone failed for ${owner}/${repo}; falling back to GitHub archive`,
    cloneResult.error,
  )
  await fs.rm(destination, { recursive: true, force: true }).catch(() => {})

  if (!directDownloadFailed && await tryArchive()) {
    return { success: true, method: "archive" }
  }
  return {
    success: false,
    error: "无法下载 Skill，请检查网络连接后重试。",
  }
}
