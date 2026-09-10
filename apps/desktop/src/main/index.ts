import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  shell,
  nativeImage,
} from "electron"
import os from "node:os"
import path from "node:path"
import {
  hasActiveMarketplaceInstalls,
  registerIpcHandlers,
  setMainWindow,
} from "./ipc-handlers"
import { SkillsFileWatcher } from "./file-watcher"
import { closeDb } from "./db/index"
import { initAutoUpdater } from "./auto-updater"
import { setupCloseBehavior } from "./close-behavior"

// GUI builds on Windows can inherit a closed stdout/stderr pipe. Electron
// forwards renderer console messages to these streams, and an unhandled EPIPE
// would otherwise terminate the main process during startup.
for (const stream of [process.stdout, process.stderr]) {
  stream?.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code !== "EPIPE") process.exitCode = 1
  })
}
process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") return
  dialog.showErrorBox("SkillVault", String(error.stack || error))
  app.exit(1)
})

if (process.platform === "win32") {
  const windowsBuild = Number(os.release().split(".")[2])
  if (windowsBuild >= 26200 && windowsBuild < 27000) {
    // Windows Insider 26200/26300 currently crashes sandboxed Electron child processes.
    app.commandLine.appendSwitch("no-sandbox")
    app.commandLine.appendSwitch("disable-gpu")
  }
}

// Only allow one running instance. A second launch just focuses (and
// un-hides) the existing window instead of starting another app.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

let mainWindow: BrowserWindow | null = null
let fileWatcher: SkillsFileWatcher | null = null

function createWindow(): void {
  // Load app icon
  const iconPath = path.join(__dirname, "../../resources/icon.png")
  const icon = nativeImage.createFromPath(iconPath)

  // Set dock icon on macOS (needed for dev mode)
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon)
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "SkillVault",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (app.isPackaged) {
    mainWindow.webContents.on("console-message", (event) => event.preventDefault())
  }

  // ready-to-show can silently never fire if the renderer fails to load.
  const showTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn("ready-to-show did not fire within 5s — forcing window visible")
      mainWindow.show()
    }
  }, 5000)

  mainWindow.on("ready-to-show", () => {
    clearTimeout(showTimeout)
    mainWindow?.show()
  })

  // Open external links in the default browser (only http/https)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        shell.openExternal(url)
      }
    } catch {
      // Invalid URL — ignore
    }
    return { action: "deny" }
  })

  // Prevent navigating the main window to external URLs
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedOrigins = [
      "file://",
      ...(process.env.ELECTRON_RENDERER_URL ? [process.env.ELECTRON_RENDERER_URL] : []),
    ]
    if (!allowedOrigins.some((origin) => url.startsWith(origin))) {
      event.preventDefault()
      try {
        const parsed = new URL(url)
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          shell.openExternal(url)
        }
      } catch {
        // Invalid URL — ignore
      }
    }
  })

  // Give the IPC handlers a reference to the window so rescanAndCache
  // can push skills:updated events to the renderer.
  setMainWindow(mainWindow)

  // Start the file watcher once the window is created
  fileWatcher = new SkillsFileWatcher(mainWindow)
  fileWatcher.start().catch((err) => {
    console.error("Failed to start file watcher:", err)
  })

  mainWindow.on("closed", () => {
    clearTimeout(showTimeout)
    fileWatcher?.stop()
    fileWatcher = null
    mainWindow = null
  })

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  setupCloseBehavior(mainWindow, hasActiveMarketplaceInstalls)

  initAutoUpdater(mainWindow)
}

app.whenReady().then(() => {
  // Second instance was told to quit — don't open a window here.
  if (!gotSingleInstanceLock) return

  Menu.setApplicationMenu(null)

  try {
    registerIpcHandlers()
  } catch (err) {
    // better-sqlite3 can fail to load (arch mismatch, missing prebuild,
    // sandbox restrictions). Show a dialog so the user knows why the app is broken.
    console.error("Failed to register IPC handlers:", err)
    const isChinese = app.getLocale().toLowerCase().startsWith("zh")
    dialog.showErrorBox(
      isChinese ? "SkillVault 启动失败" : "SkillVault failed to start",
      (isChinese
        ? "无法加载必需的原生模块，请尝试重新安装应用。\n\n"
        : "A required native module could not be loaded. Try reinstalling the app.\n\n") + String(err),
    )
  }

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("will-quit", () => {
  closeDb()
})
