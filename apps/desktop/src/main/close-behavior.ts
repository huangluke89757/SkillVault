import { app, dialog, Menu, Tray, nativeImage } from "electron"
import type { BrowserWindow } from "electron"
import path from "node:path"
import { openDb } from "./db/index"
import { SettingsStore } from "./db/settings"

// What the window close button should do. Persisted in the settings table
// once the user ticks "remember my choice".
type CloseBehavior = "tray" | "quit"

let isQuitting = false
let tray: Tray | null = null
let settingsStore: SettingsStore | null = null

app.on("before-quit", () => {
  isQuitting = true
})
app.on("will-quit", () => {
  tray?.destroy()
  tray = null
})

function getSettings(): SettingsStore | null {
  try {
    settingsStore ??= new SettingsStore(openDb())
    return settingsStore
  } catch {
    // DB unavailable — fall back to asking every time.
    return null
  }
}

function getSavedBehavior(): CloseBehavior | null {
  return getSettings()?.get<CloseBehavior | null>("closeBehavior", null) ?? null
}

function saveBehavior(behavior: CloseBehavior): void {
  getSettings()?.set("closeBehavior", behavior)
}

interface CloseStrings {
  title: string
  message: string
  detail: string
  minimize: string
  quit: string
  remember: string
  trayShow: string
  trayQuit: string
  activeTitle: string
  activeMessage: string
  activeDetail: string
  quitAnyway: string
}

function getStrings(): CloseStrings {
  if (app.getLocale().toLowerCase().startsWith("zh")) {
    return {
      title: "关闭 SkillVault",
      message: "要最小化到系统托盘，还是直接关闭？",
      detail: "选择“最小化到托盘”后，应用会继续在后台运行，可从托盘图标重新打开。",
      minimize: "最小化到托盘",
      quit: "直接关闭",
      remember: "记住我的选择，以后不再询问",
      trayShow: "显示 SkillVault",
      trayQuit: "退出",
      activeTitle: "Skill 仍在下载",
      activeMessage: "退出将中断正在进行的下载",
      activeDetail: "可先最小化到托盘，SkillVault 会继续在后台完成安装。",
      quitAnyway: "仍然退出",
    }
  }
  return {
    title: "Close SkillVault",
    message: "Minimize to the system tray, or quit the app?",
    detail: "Minimizing to the tray keeps the app running in the background. You can reopen it from the tray icon.",
    minimize: "Minimize to Tray",
    quit: "Quit",
    remember: "Remember my choice and don't ask again",
    trayShow: "Show SkillVault",
    trayQuit: "Quit",
    activeTitle: "Skill download in progress",
    activeMessage: "Quitting will interrupt the current download",
    activeDetail: "Minimize to the tray to let SkillVault finish installing in the background.",
    quitAnyway: "Quit Anyway",
  }
}

function showWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function ensureTray(win: BrowserWindow, strings: CloseStrings): void {
  if (tray) return

  const iconPath = path.join(__dirname, "../../resources/icon.png")
  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(image)
  tray.setToolTip("SkillVault")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: strings.trayShow, click: () => showWindow(win) },
      { type: "separator" },
      {
        label: strings.trayQuit,
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on("click", () => showWindow(win))
}

function minimizeToTray(win: BrowserWindow, strings: CloseStrings): void {
  ensureTray(win, strings)
  win.hide()
}

/**
 * Intercepts the window close button: asks whether to minimize to the tray
 * or quit, and honors a remembered choice from then on.
 */
export function setupCloseBehavior(
  win: BrowserWindow,
  hasActiveBackgroundWork: () => boolean = () => false,
): void {
  const strings = getStrings()

  win.on("close", (event) => {
    if (isQuitting) return

    const saved = getSavedBehavior()
    const hasActiveWork = hasActiveBackgroundWork()
    if (saved === "quit" && !hasActiveWork) return
    if (saved === "tray") {
      event.preventDefault()
      minimizeToTray(win, strings)
      return
    }

    // No remembered choice — ask first.
    event.preventDefault()
    void (async () => {
      if (win.isDestroyed()) return
      const { response, checkboxChecked } = await dialog.showMessageBox(win, {
        type: hasActiveWork ? "warning" : "question",
        title: hasActiveWork ? strings.activeTitle : strings.title,
        message: hasActiveWork ? strings.activeMessage : strings.message,
        detail: hasActiveWork ? strings.activeDetail : strings.detail,
        buttons: [strings.minimize, hasActiveWork ? strings.quitAnyway : strings.quit],
        defaultId: 0,
        cancelId: 0,
        checkboxLabel: saved ? undefined : strings.remember,
        noLink: true,
      })
      if (win.isDestroyed()) return

      if (response === 0) {
        if (!saved && checkboxChecked) saveBehavior("tray")
        minimizeToTray(win, strings)
      } else {
        if (!saved && checkboxChecked) saveBehavior("quit")
        isQuitting = true
        win.close()
      }
    })()
  })
}
