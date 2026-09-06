export {}

declare global {
  interface DetectedAgent {
    name: string
    displayName: string
    shortCode: string
    isSharedSkillDirectory: boolean
  }

  interface InstalledSkill {
    name: string
    description: string
    path: string
    canonicalPath: string
    agents: string[]
    agentShortCodes: string[]
    scope: "global" | "project" | "custom"
    projectName: string | null
    projectNames: string[]
    locations: SkillLocation[]
    hasSupportingFiles: boolean
    supportingFiles: Array<{
      relativePath: string
      size: number
    }>
    versionMismatches: Array<{
      agentName: string
      agentDisplayName: string
      agentPath: string
      changes: Array<{
        relativePath: string
        kind: "modified" | "only-agent" | "only-master"
      }>
      totalChanges: number
    }>
    source?: string
    sourceType?: string
    installedAt?: string
    updatedAt?: string
  }

  interface SkillLocation {
    path: string
    canonicalPath: string
    scope: "global" | "project" | "custom"
    projectName: string | null
    agents: string[]
  }

  interface SkillRemovalRequest {
    name: string
    targets: Array<Pick<SkillLocation, "path" | "canonicalPath" | "scope" | "projectName">>
  }

  interface SkillRemovalResult {
    skills: InstalledSkill[]
    removedPaths: string[]
    collections: Record<string, string[]>
    errors: Array<{ path: string; message: string }>
  }

  // Remote server types
  interface RemoteServer {
    id: string
    label: string
    host: string
    port: number
    username: string
    skillsBasePath: string
    sshKeyPath: string | null
    lastSyncAt: string | null
    lastSyncError: string | null
    createdAt: string
    skillCount?: number
  }

  interface RemoteSkill {
    id: string
    serverId: string
    name: string
    description: string | null
    remotePath: string
    content: string | null
    contentHash: string | null
    syncedAt: string
  }

  interface SyncResult {
    added: number
    updated: number
    removed: number
    unchanged: number
    error?: string
  }

  interface PushPlanEntry {
    folderName: string
    name: string
    localPath: string
    remotePath: string
    remoteDir: string
    reason: "added" | "updated" | "deleted" | "unchanged"
    localHash?: string
    remoteHash?: string
  }

  interface UpdateState {
    status:
      | "idle"
      | "checking"
      | "available"
      | "downloading"
      | "downloaded"
      | "not-available"
      | "error"
    version: string
    availableVersion?: string
    downloadedVersion?: string
    progressPercent?: number
    message?: string
  }

  interface MigrationAgentSummary {
    name: string
    displayName: string
    skillCount: number
  }

  interface ImportPackagePreview {
    cancelled: boolean
    filePath?: string
    fileName?: string
    skillCount?: number
    importableCount?: number
    duplicateCount?: number
    availableAgents?: MigrationAgentSummary[]
    missingAgents?: MigrationAgentSummary[]
    unknownAgents?: MigrationAgentSummary[]
    newAgents?: Array<{ name: string; displayName: string }>
  }

  interface MigrationProgress {
    operation: "export" | "import"
    stage: "preparing" | "packing" | "writing" | "importing" | "adapting" | "refreshing" | "complete"
    current: number
    total: number
    percent: number
    skillName?: string
    message: string
  }

  interface ElectronAPI {
    setAppLanguage: (locale: "zh-CN" | "en-US") => void
    detectAgents: () => Promise<DetectedAgent[]>
    listInstalled: () => Promise<InstalledSkill[]>
    rescanSkills: () => Promise<InstalledSkill[]>
    exportSkillsPackage: (request: {
      scope: "selected" | "all" | "global" | "project"
      selectedPaths?: string[]
    }) => Promise<{
      cancelled: boolean
      filePath: string | null
      skillCount: number
    }>
    inspectImportSkillsPackage: () => Promise<ImportPackagePreview>
    importSkillsPackage: (archivePath: string) => Promise<{
      cancelled: boolean
      imported: number
      skipped: number
      adapted: number
      pending: number
      errors: string[]
    }>
    createSkill: (data: {
      name: string
      description?: string
      content?: string
      agentNames?: string[]
    }) => Promise<{ name: string; path: string; targets: string[] }>
    removeSkill: (request: SkillRemovalRequest) => Promise<SkillRemovalResult>
    updateSkill: (name: string) => Promise<void>
    readSkillContent: (path: string) => Promise<string>
    listSupportingFiles: (
      path: string,
    ) => Promise<Array<{ relativePath: string; size: number }>>
    readSupportingFile: (path: string, relativePath: string) => Promise<string>
    writeSkillContent: (filePath: string, content: string) => Promise<void>
    openInFinder: (filePath: string) => Promise<void>
    removeFromAgent: (request: SkillRemovalRequest, agentName: string) => Promise<void>
    addToAgent: (
      skillName: string,
      canonicalPath: string,
      agentName: string,
    ) => Promise<void>
    syncAgentCopyToMaster: (
      skillName: string,
      agentName: string,
      agentPath: string,
    ) => Promise<{
      previousMasterBackupPath: string
      sourceCopyBackupPath: string
    }>

    // Remote servers
    serversList: () => Promise<RemoteServer[]>
    serversCreate: (data: {
      label: string
      host: string
      port?: number
      username: string
      skillsBasePath?: string
      sshKeyPath?: string | null
    }) => Promise<RemoteServer>
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
    ) => Promise<RemoteServer | null>
    serversDelete: (id: string) => Promise<void>
    serversTest: (id: string) => Promise<{ ok: boolean; error?: string }>
    serversSync: (id: string) => Promise<SyncResult>
    serversSkills: (serverId: string) => Promise<RemoteSkill[]>
    serversReadSkill: (serverId: string, remotePath: string) => Promise<string>
    serversWriteSkill: (
      serverId: string,
      remotePath: string,
      content: string,
    ) => Promise<{ ok: boolean }>
    serversCount: () => Promise<number>
    serversPushPreview: (serverId: string, mirror: boolean) => Promise<{
      toAdd: PushPlanEntry[]
      toUpdate: PushPlanEntry[]
      toDelete: PushPlanEntry[]
      unchanged: PushPlanEntry[]
      mirror: boolean
    }>
    serversPushApply: (
      serverId: string,
      preview: unknown,
    ) => Promise<{
      added: number
      updated: number
      deleted: number
      unchanged: number
      errors: { folderName: string; message: string }[]
    }>

    // Settings
    settingsGet: <T>(key: string, defaultValue: T) => Promise<T>
    settingsSet: (key: string, value: unknown) => Promise<void>
    settingsAll: () => Promise<Record<string, unknown>>

    // Favorites
    favoritesList: () => Promise<string[]>
    favoritesToggle: (name: string) => Promise<boolean>
    favoritesAddMany: (names: string[]) => Promise<string[]>

    updatesGetState: () => Promise<UpdateState>
    updatesCheck: () => Promise<UpdateState>
    updatesDownload: () => Promise<UpdateState>
    updatesInstall: () => Promise<void>
    updatesReleaseNotes: () => Promise<{
      version: string
      name: string
      body: string
      url: string
      publishedAt: string
    } | null>
    appGetVersion: () => Promise<string>

    onSkillsUpdated: (
      callback: (skills: InstalledSkill[]) => void,
    ) => () => void
    onMigrationProgress: (
      callback: (progress: MigrationProgress) => void,
    ) => () => void
    onPendingAgentRestored: (
      callback: (result: { restored: number; agents: string[] }) => void,
    ) => () => void
    onUpdateState: (callback: (state: UpdateState) => void) => () => void
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}
