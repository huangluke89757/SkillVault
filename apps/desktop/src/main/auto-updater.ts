import type { BrowserWindow } from "electron"
import { app } from "electron"
import { autoUpdater } from "electron-updater"

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
    setUpdateState({
      status: "not-available",
      availableVersion: undefined,
      downloadedVersion: undefined,
      progressPercent: undefined,
      message: "You are up to date",
    })
  })

  autoUpdater.on("error", (error) => {
    setUpdateState({
      status: "error",
      message: error?.message || "Update check failed",
      progressPercent: undefined,
    })
  })

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

  return updateState
}

export async function downloadAppUpdate(): Promise<UpdateState> {
  if (!app.isPackaged) return updateState
  if (updateState.status !== "available") return updateState

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
  autoUpdater.quitAndInstall()
}
