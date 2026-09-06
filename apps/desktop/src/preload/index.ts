import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"

function subscribe<T>(
  channel: string,
  callback: (payload: T) => void,
): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => {
    callback(payload)
  }
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  setAppLanguage: (locale: "zh-CN" | "en-US") =>
    ipcRenderer.send("app:set-language", locale),

  // Agents
  detectAgents: () => ipcRenderer.invoke("agents:detect"),

  // Skills
  listInstalled: () => ipcRenderer.invoke("skills:list-installed"),
  rescanSkills: () => ipcRenderer.invoke("skills:rescan"),
  exportSkillsPackage: (request: {
    scope: "selected" | "all" | "global" | "project"
    selectedPaths?: string[]
  }) => ipcRenderer.invoke("skills:export-package", request),
  inspectImportSkillsPackage: () => ipcRenderer.invoke("skills:inspect-import-package"),
  importSkillsPackage: (archivePath: string) =>
    ipcRenderer.invoke("skills:import-package", archivePath),
  createSkill: (data: {
    name: string
    description?: string
    content?: string
    agentNames?: string[]
  }) => ipcRenderer.invoke("skills:create", data),
  removeSkill: (request: {
    name: string
    targets: Array<{
      path: string
      canonicalPath: string
      scope: "global" | "project" | "custom"
      projectName?: string | null
    }>
  }) => ipcRenderer.invoke("skills:remove", request),
  updateSkill: (name: string) => ipcRenderer.invoke("skills:update", name),
  readSkillContent: (skillPath: string) =>
    ipcRenderer.invoke("skill:read-content", skillPath),
  listSupportingFiles: (skillPath: string) =>
    ipcRenderer.invoke("skill:list-supporting-files", skillPath),
  readSupportingFile: (skillPath: string, relativePath: string) =>
    ipcRenderer.invoke("skill:read-supporting-file", skillPath, relativePath),
  writeSkillContent: (filePath: string, content: string) =>
    ipcRenderer.invoke("skill:write-content", filePath, content),
  openInFinder: (filePath: string) =>
    ipcRenderer.invoke("skill:open-in-finder", filePath),
  removeFromAgent: (request: {
    name: string
    targets: Array<{
      path: string
      canonicalPath: string
      scope: "global" | "project" | "custom"
      projectName?: string | null
    }>
  }, agentName: string) =>
    ipcRenderer.invoke("skills:remove-from-agent", request, agentName),
  addToAgent: (skillName: string, canonicalPath: string, agentName: string) =>
    ipcRenderer.invoke("skills:add-to-agent", skillName, canonicalPath, agentName),
  syncAgentCopyToMaster: (skillName: string, agentName: string, agentPath: string) =>
    ipcRenderer.invoke("skills:sync-agent-copy-to-master", skillName, agentName, agentPath),

  // Remote servers
  serversList: () => ipcRenderer.invoke("servers:list"),
  serversCreate: (data: {
    label: string
    host: string
    port?: number
    username: string
    skillsBasePath?: string
    sshKeyPath?: string | null
  }) => ipcRenderer.invoke("servers:create", data),
  serversUpdate: (
    id: string,
    fields: {
      label?: string
      host?: string
      port?: number
      username?: string
      skillsBasePath?: string
      sshKeyPath?: string | null
    },
  ) => ipcRenderer.invoke("servers:update", id, fields),
  serversDelete: (id: string) => ipcRenderer.invoke("servers:delete", id),
  serversTest: (id: string) => ipcRenderer.invoke("servers:test", id),
  serversSync: (id: string) => ipcRenderer.invoke("servers:sync", id),
  serversSkills: (serverId: string) =>
    ipcRenderer.invoke("servers:skills", serverId),
  serversReadSkill: (serverId: string, remotePath: string) =>
    ipcRenderer.invoke("servers:read-skill", serverId, remotePath),
  serversWriteSkill: (serverId: string, remotePath: string, content: string) =>
    ipcRenderer.invoke("servers:write-skill", serverId, remotePath, content),
  serversCount: () => ipcRenderer.invoke("servers:count"),
  serversPushPreview: (serverId: string, mirror: boolean) =>
    ipcRenderer.invoke("servers:push-preview", serverId, mirror),
  serversPushApply: (serverId: string, preview: unknown) =>
    ipcRenderer.invoke("servers:push-apply", serverId, preview),

  // Settings
  settingsGet: (key: string, defaultValue: unknown) =>
    ipcRenderer.invoke("settings:get", key, defaultValue),
  settingsSet: (key: string, value: unknown) =>
    ipcRenderer.invoke("settings:set", key, value),
  settingsAll: () => ipcRenderer.invoke("settings:all"),

  // Favorites
  favoritesList: () => ipcRenderer.invoke("favorites:list"),
  favoritesToggle: (name: string) =>
    ipcRenderer.invoke("favorites:toggle", name),
  favoritesAddMany: (names: string[]) =>
    ipcRenderer.invoke("favorites:add-many", names),

  // Updates
  updatesGetState: () => ipcRenderer.invoke("updates:get-state"),
  updatesCheck: () => ipcRenderer.invoke("updates:check"),
  updatesDownload: () => ipcRenderer.invoke("updates:download"),
  updatesInstall: () => ipcRenderer.invoke("updates:install"),
  updatesReleaseNotes: () => ipcRenderer.invoke("updates:release-notes"),
  appGetVersion: () => ipcRenderer.invoke("app:get-version"),

  // Events
  onSkillsUpdated: (callback: (skills: unknown[]) => void) => {
    return subscribe("skills:updated", callback)
  },
  onMigrationProgress: (callback: (progress: unknown) => void) => {
    return subscribe("skills:migration-progress", callback)
  },
  onPendingAgentRestored: (callback: (result: unknown) => void) => {
    return subscribe("skills:pending-agent-restored", callback)
  },
  onUpdateState: (callback: (state: unknown) => void) => {
    return subscribe("updates:state", callback)
  },
})
