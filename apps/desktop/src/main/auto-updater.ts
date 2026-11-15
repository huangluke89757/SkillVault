import type { BrowserWindow } from "electron"
import { app } from "electron"
import { autoUpdater } from "electron-updater"
import fs from "node:fs"
import path from "node:path"
import {
  extractVersionFromFileName,
  shouldCleanPendingUpdate,
  UP_TO_DATE_MESSAGE,
  versionsEqual,
} from "../shared/update-notes"

export type UpdateStateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "not-available"
  | "error"

export interface UpdateState {
  status: UpdateStateStatus
  version: string
  availableVersion?: string
  downloadedVersion?: string
  progressPercent?: number
  message?: string
}

let mainWindow: BrowserWindow | null = null
let initialized = false

let updateState: UpdateState = {
  status: "idle",
  version: app.getVersion(),
}

function broadcastUpdateState(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send("updates:state", updateState)
}

function setUpdateState(next: Partial<UpdateState>): void {
  updateState = {
    ...updateState,
    ...next,
    version: app.getVersion(),
  }
  broadcastUpdateState()
}

export function getUpdateState(): UpdateState {
  return updateState
}

/** electron-updater 的下载缓存目录（由 app-update.yml 的 updaterCacheDirName 决定） */
function resolveUpdaterCacheDir(): string | null {
  try {
    const updateConfigPath = path.join(process.resourcesPath, "app-update.yml")
    const content = fs.readFileSync(updateConfigPath, "utf8")
    const cacheDirName =
      /^\s*updaterCacheDirName:\s*(.+?)\s*$/m.exec(content)?.[1]?.replace(/^["']|["']$/g, "")
    if (!cacheDirName) return null
    const baseDir = process.env.LOCALAPPDATA || app.getPath("appData")
    return path.join(baseDir, cacheDirName)
  } catch {
    return null
  }
}

/**
 * 清理已经过期（当前版本已追上或超过）的待装缓存。
 * 不清理仍在等待安装的缓存，避免误删用户已下载的新版本安装包。
 */
function cleanupStalePendingUpdate(): void {
  try {
    const cacheDir = resolveUpdaterCacheDir()
    if (!cacheDir) return
    const pendingDir = path.join(cacheDir, "pending")
    const pendingInfoPath = path.join(pendingDir, "update-info.json")
    if (!fs.existsSync(pendingInfoPath)) return
    const pendingInfo = JSON.parse(fs.readFileSync(pendingInfoPath, "utf8")) as {
      fileName?: string
    }
    const pendingVersion = extractVersionFromFileName(pendingInfo.fileName)
    if (!pendingVersion || !shouldCleanPendingUpdate(app.getVersion(), pendingVersion)) return
    fs.rmSync(pendingDir, { recursive: true, force: true })
    const cachedInstaller = path.join(cacheDir, "installer.exe")
    if (fs.existsSync(cachedInstaller)) fs.rmSync(cachedInstaller, { force: true })
  } catch {
    // 缓存清理失败不影响更新流程
  }
}

/** 已是最新版本时统一收敛为 not-available，避免界面继续提示下载 */
function settleAsUpToDate(message = UP_TO_DATE_MESSAGE): void {
  setUpdateState({
    status: "not-available",
    availableVersion: undefined,
    downloadedVersion: undefined,
    progressPercent: undefined,
    message,
  })
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  if (initialized || !app.isPackaged) {
    broadcastUpdateState()
    return
  }

  initialized = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      status: "checking",
      message: "Checking for updates...",
      progressPercent: undefined,
    })
  })

  autoUpdater.on("update-available", (info) => {
    // 版本一致时（例如更新包已装但进程仍是旧版、或 latest.yml 滞后）不再进入可下载状态
    if (versionsEqual(info.version, app.getVersion())) {
      settleAsUpToDate()
      return
    }
    setUpdateState({
      status: "available",
      availableVersion: info.version,
      message: `Update ${info.version} available`,
    })
  })

  autoUpdater.on("download-progress", (progress) => {
    setUpdateState({
      status: "downloading",
      progressPercent: progress.percent,
      message: `Downloading update ${updateState.availableVersion ?? ""}`.trim(),
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      status: "downloaded",
      downloadedVersion: info.version,
      progressPercent: 100,
      message: `Update ${info.version} ready to install`,
    })
  })

  autoUpdater.on("update-not-available", () => {
    settleAsUpToDate()
  })

  autoUpdater.on("error", (error) => {
    setUpdateState({
      status: "error",
      message: error?.message || "Update check failed",
      progressPercent: undefined,
    })
  })

  cleanupStalePendingUpdate()
  void checkForAppUpdates()
}

export async function checkForAppUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    setUpdateState({
      status: "idle",
      message: "Update checks are disabled in development builds",
    })
    return updateState
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    setUpdateState({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }

  // 事件之外再复核一次：可下载版本与当前版本一致时，不允许继续提示下载
  if (
    updateState.status === "available" &&
    versionsEqual(updateState.availableVersion, app.getVersion())
  ) {
    settleAsUpToDate()
  }

  return updateState
}

export async function downloadAppUpdate(): Promise<UpdateState> {
  if (!app.isPackaged) return updateState
  if (updateState.status !== "available") return updateState
  if (versionsEqual(updateState.availableVersion, app.getVersion())) {
    settleAsUpToDate()
    return updateState
  }

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    setUpdateState({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }

  return updateState
}

export function quitAndInstallUpdate(): void {
  if (!app.isPackaged) return
  if (versionsEqual(updateState.downloadedVersion, app.getVersion())) {
    settleAsUpToDate()
    return
  }
  autoUpdater.quitAndInstall()
}
