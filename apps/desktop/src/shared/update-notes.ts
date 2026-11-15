/**
 * 版本更新弹窗的纯逻辑：版本比较与「当前版本 / 最新版本」双区块模型。
 *
 * 这里不依赖 electron / react，主进程、渲染进程与单元测试共用同一套判断，
 * 避免「主进程说已是最新、界面仍提示下载」这类文案与状态不一致的问题。
 */

export interface UpdateReleaseNotes {
  version: string
  name: string
  body: string
  url: string
  publishedAt: string
}

/** 更新弹窗需要的状态子集（与 auto-updater 的 UpdateState 对齐，避免循环依赖） */
export interface UpdateStateSnapshot {
  status: string
  availableVersion?: string
  downloadedVersion?: string
}

export interface UpdateNotesInput {
  appVersion: string
  state?: UpdateStateSnapshot | null
  currentNotes: UpdateReleaseNotes | null
  latestNotes: UpdateReleaseNotes | null
}

export type UpdateNotesSection =
  | {
      kind: "notes"
      version: string
      title: string
      body: string
      publishedAt: string
      url: string
    }
  | { kind: "up-to-date"; version: string; message: string }
  | { kind: "empty"; version: string; message: string }

export interface UpdateNotesViewModel {
  currentVersion: string
  latestVersion: string
  isUpToDate: boolean
  /** 是否展示下载 / 复制给 Agent 更新等更新操作 */
  showUpdateActions: boolean
  current: UpdateNotesSection
  latest: UpdateNotesSection
}

export const UP_TO_DATE_MESSAGE = "您当前已装载最新版本👍，无需更新"
export const CURRENT_NOTES_EMPTY_MESSAGE = "暂无该版本的更新说明"
export const LATEST_NOTES_EMPTY_MESSAGE = "暂时无法获取最新版本信息，请稍后点击「检查更新」重试"

/** 去掉 tag 前缀（v1.3.3 / V1.3.3 / desktop-v1.3.3）并裁剪空白 */
export function normalizeVersion(value?: string | null): string {
  if (!value) return ""
  return value
    .trim()
    .replace(/^desktop-v/i, "")
    .replace(/^v/i, "")
    .trim()
}

export function versionsEqual(a?: string | null, b?: string | null): boolean {
  const left = normalizeVersion(a)
  const right = normalizeVersion(b)
  return left !== "" && left === right
}

/** 语义化版本比较（忽略 tag 前缀），无法解析的片段按 0 处理 */
export function compareVersions(a?: string | null, b?: string | null): number {
  const left = normalizeVersion(a)
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0)
  const right = normalizeVersion(b)
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

/** 从 Release 名称里提取可读标题；缺省时回退到版本号 */
function notesTitle(notes: UpdateReleaseNotes, version: string): string {
  const name = notes.name?.trim()
  if (name) return name
  return version ? `SkillVault ${version}` : "SkillVault 更新"
}

function notesSection(notes: UpdateReleaseNotes, fallbackVersion: string): UpdateNotesSection {
  const version = normalizeVersion(notes.version) || normalizeVersion(fallbackVersion)
  const body = notes.body ?? ""
  if (body.trim() === "") {
    return { kind: "empty", version, message: CURRENT_NOTES_EMPTY_MESSAGE }
  }
  return {
    kind: "notes",
    version,
    title: notesTitle(notes, version),
    body,
    publishedAt: notes.publishedAt ?? "",
    url: notes.url ?? "",
  }
}

/**
 * 生成弹窗双区块模型：
 * - 当前版本区块：当前已装版本的更新介绍（取不到时为「暂无该版本的更新说明」）
 * - 最新版本区块：有更新时展示最新版更新介绍；当前已是最新时替换为 👍 提示
 */
export function buildUpdateNotesViewModel(input: UpdateNotesInput): UpdateNotesViewModel {
  const appVersion = normalizeVersion(input.appVersion) || input.appVersion
  const state = input.state ?? null
  const latestVersion =
    normalizeVersion(input.latestNotes?.version) ||
    normalizeVersion(state?.downloadedVersion) ||
    normalizeVersion(state?.availableVersion)
  const isUpToDate = versionsEqual(appVersion, latestVersion)

  const current = input.currentNotes
    ? notesSection(input.currentNotes, appVersion)
    : { kind: "empty" as const, version: appVersion, message: CURRENT_NOTES_EMPTY_MESSAGE }

  let latest: UpdateNotesSection
  if (isUpToDate) {
    latest = { kind: "up-to-date", version: latestVersion, message: UP_TO_DATE_MESSAGE }
  } else if (input.latestNotes) {
    latest = notesSection(input.latestNotes, latestVersion)
  } else {
    latest = { kind: "empty", version: latestVersion, message: LATEST_NOTES_EMPTY_MESSAGE }
  }

  return {
    currentVersion: appVersion,
    latestVersion,
    isUpToDate,
    showUpdateActions: !isUpToDate,
    current,
    latest,
  }
}

/** 从安装文件名（如 SkillVault-Setup-1.3.3.exe）里提取版本号 */
export function extractVersionFromFileName(fileName?: string | null): string {
  if (!fileName) return ""
  const baseName = fileName.replace(/\.(exe|msi|dmg|zip|blockmap|appimage)$/i, "")
  const match = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/.exec(baseName)
  return match?.[1] ?? ""
}

/**
 * 判断更新缓存里的待装版本是否已经过期（当前版本已追上或超过它）。
 * 过期缓存应清理，否则会残留安装包并被反复复用。
 */
export function shouldCleanPendingUpdate(currentVersion: string, pendingVersion: string): boolean {
  if (!pendingVersion) return false
  return compareVersions(currentVersion, pendingVersion) >= 0
}
