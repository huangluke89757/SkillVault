import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { electronAPI } from "./electron-api"

export type AppLocale = "zh-CN" | "en-US"

const UI_LANGUAGE_KEY = "ui.language"

const zhCN: Record<string, string> = {
  "Loading view...": "正在加载页面…",
  Installed: "已安装",
  Discover: "发现",
  Servers: "服务器",
  "Scan Sources": "扫描来源",
  Settings: "设置",
  Theme: "主题",
  "Desktop v": "桌面版 v",
  "Local Library": "本地技能库",
  Library: "技能库",
  "New Skill": "新建技能",
  "Search skills...": "搜索技能…",
  "Scanning...": "正在扫描…",
  "Deselect All": "取消全选",
  "Select All": "全选",
  "Scanning for installed skills...": "正在扫描已安装技能…",
  "No skills installed yet.": "尚未安装技能。",
  "Head to Discover to find skills.": "前往“发现”查找技能。",
  "No favorites yet.": "暂无收藏。",
  "Click the star on any skill to save it here.": "点击技能上的星标即可收藏。",
  "No skills match your search.": "没有符合搜索条件的技能。",
  "Clear filters": "清除筛选",
  "All Skills": "全部技能",
  "All scopes": "全部范围",
  "Global Skills": "全局技能",
  "Project Skills": "项目技能",
  "All projects": "全部项目",
  Favorites: "收藏",
  Tools: "工具",
  Collections: "集合",
  Collection: "集合",
  "Create collection": "新建集合",
  "None yet": "暂无",
  "Rename collection": "重命名集合",
  "Delete collection": "删除集合",
  "None configured": "未配置",
  "Remove from favorites": "取消收藏",
  "Add to favorites": "添加收藏",
  "+ New Collection": "+ 新建集合",
  selected: "已选择",
  Delete: "删除",
  Cancel: "取消",
  "Remove selected": "移除所选目标",
  "Remove all": "全部移除",
  "Select a skill to view details": "选择一个技能查看详情",
  "Editing raw `SKILL.md`": "正在编辑原始 `SKILL.md`",
  Saved: "已保存",
  "Save failed": "保存失败",
  "Saving...": "正在保存…",
  Save: "保存",
  View: "查看",
  Edit: "编辑",
  "Show in Finder": "在文件管理器中显示",
  "Remove skill": "移除技能",
  "scope:": "范围：",
  "project:": "项目：",
  "supporting files:": "附属文件：",
  "No collections yet.": "暂无集合。",
  "Loading content...": "正在加载内容…",
  "Skill content not available. This skill may not have a SKILL.md file.": "技能内容不可用，该技能可能没有 SKILL.md 文件。",
  "Supporting Files": "附属文件",
  bytes: "字节",
  Preview: "预览",
  "Select a supporting file to preview it.": "选择一个附属文件进行预览。",
  "Preview unavailable.": "无法预览。",
  "Create a local skill and install it into one or more targets.": "创建本地技能，并安装到一个或多个目标。",
  "Skill name": "技能名称",
  "Short description": "简短描述",
  Targets: "目标",
  Create: "创建",
  "New Collection": "新建集合",
  "Rename Collection": "重命名集合",
  "Create a collection for grouping local skills.": "创建集合来整理本地技能。",
  "Choose a new name for this collection.": "为这个集合设置新名称。",
  "Collection name": "集合名称",
  "Remove from": "从以下目标移除",
  "Remove from all": "从全部目标移除",
  "This skill is installed in": "该技能已安装到",
  "agent:": "个 Agent：",
  "Configure your SkillsGate Desktop preferences.": "配置 SkillsGate 桌面版偏好。",
  Language: "界面语言",
  "Choose the language used by the desktop app": "选择桌面端显示语言",
  Chinese: "简体中文",
  English: "English",
  Installation: "安装",
  "Default scope": "默认范围",
  "Where skills are installed by default": "设置技能的默认安装范围",
  Global: "全局",
  Project: "项目",
  Custom: "自定义",
  global: "全局",
  project: "项目",
  custom: "自定义",
  "Install method": "安装方式",
  "How skill files are placed in agent directories": "设置技能文件写入 Agent 目录的方式",
  Symlink: "符号链接",
  Copy: "复制",
  Search: "搜索",
  "Search preference": "搜索偏好",
  "Preferred search method for discovering skills": "发现技能时优先使用的搜索方式",
  Semantic: "语义搜索",
  Keyword: "关键词搜索",
  Privacy: "隐私",
  Telemetry: "遥测",
  "Send anonymous usage data to help improve SkillsGate": "发送匿名使用数据，帮助改进 SkillsGate",
  Updates: "更新",
  "Desktop app updates": "桌面端更新",
  Version: "版本",
  "Check for updates from GitHub Releases.": "从 GitHub Releases 检查更新。",
  "Latest available:": "最新版本：",
  "Download progress:": "下载进度：",
  "Checking...": "正在检查…",
  "Check now": "立即检查",
  "Checking for updates...": "正在检查更新…",
  "You are up to date": "当前已是最新版本",
  "Update check failed": "更新检查失败",
  "Update checks are disabled in development builds": "开发构建中已禁用更新检查",
  "Restart to install": "重启并安装",
  "Scan Paths": "扫描路径",
  "Custom scan directories": "自定义扫描目录",
  "SkillsGate will scan direct skill folders and project-local tool paths inside these roots.": "SkillsGate 会扫描这些根目录下的技能文件夹和项目级工具路径。",
  Add: "添加",
  "No custom scan paths configured.": "尚未配置自定义扫描路径。",
  Remove: "移除",
  "Default Targets": "默认目标",
  "Install targets": "安装目标",
  "These targets are used for installs and new local skill creation when no explicit target set is chosen.": "未明确选择目标时，安装和新建本地技能将使用这些目标。",
  "Sync Rules": "同步规则",
  "Mirror installs to additional targets": "将安装同步到其他目标",
  "Any skill installed or created in the desktop app will also be linked into these targets.": "在桌面端安装或创建的技能也会链接到这些目标。",
  About: "关于",
  "Manage AI agent skills from your desktop.": "在桌面端统一管理 AI Agent 技能。",
  "Add folders that SkillsGate should crawl for direct skill bundles and project-local tool skill directories.": "添加需要扫描的目录，以发现独立技能包和项目级 Agent 技能目录。",
  "Bring Your Own Skill Folders": "添加自己的技能目录",
  "Point SkillsGate at places like `~/projects`, `~/workspaces`, or `~/my-skills`. It will discover:": "可添加 `~/projects`、`~/workspaces` 或 `~/my-skills` 等目录，SkillsGate 将发现：",
  "Direct skill folders:": "独立技能目录：",
  "Project-local tool paths:": "项目级工具路径：",
  "Current Coverage": "当前覆盖范围",
  "custom scan source": "个自定义扫描来源",
  "Global installs still scanned automatically": "仍会自动扫描全局安装目录",
  "Project-local paths discovered under each root": "扫描每个根目录下的项目级路径",
  "Custom Roots": "自定义根目录",
  "Add and remove folders to include in local skill discovery.": "添加或移除本地技能发现范围。",
  "Add Root": "添加根目录",
  "No custom roots yet. Add one above to start discovering extra local skills.": "暂无自定义根目录，请先在上方添加。",
  "Direct skills and project-local tool paths under this root will be discovered.": "将发现该根目录下的独立技能和项目级工具路径。",
  "Remote Servers": "远程服务器",
  "Connect to remote machines via SSH to discover and sync skills.": "通过 SSH 连接远程设备，发现并同步技能。",
  "Loading servers...": "正在加载服务器…",
  "No servers configured.": "尚未配置服务器。",
  "Add a server to discover skills from remote machines.": "添加服务器以发现远程设备上的技能。",
  "Add your first server": "添加第一台服务器",
  "Edit Server": "编辑服务器",
  "Add Server": "添加服务器",
  "Configure an SSH connection to discover remote skills.": "配置 SSH 连接以发现远程技能。",
  Label: "名称",
  Host: "主机",
  Port: "端口",
  Username: "用户名",
  "Skills Base Path": "技能根路径",
  "SSH Key Path": "SSH 密钥路径",
  "(optional)": "（可选）",
  "Auto-discover (id_ed25519, id_rsa, ...)": "自动发现（id_ed25519、id_rsa 等）",
  "Save Changes": "保存修改",
  "Connection OK": "连接正常",
  "Browse skills": "浏览技能",
  Browse: "浏览",
  "Test connection": "测试连接",
  Test: "测试",
  "Manage this server": "管理此服务器",
  "Syncing...": "正在同步…",
  "Manage ▾": "管理 ▾",
  "Edit server": "编辑服务器",
  "Delete server": "删除服务器",
  "Sync complete:": "同步完成：",
  "Sync failed:": "同步失败：",
  "Last error:": "最近错误：",
  "sync failed": "同步失败",
  "never synced": "从未同步",
  never: "从未",
  "just now": "刚刚",
  "Unknown error": "未知错误",
  "Test failed unexpectedly": "测试意外失败",
  "Back to Servers": "返回服务器",
  "remote skill": "个远程技能",
  "Loading skills...": "正在加载技能…",
  "No skills found on this server.": "该服务器上未发现技能。",
  "Try syncing the server to discover skills.": "请先同步服务器以发现技能。",
  remote: "远程",
  "Skill content not cached. Sync the server to fetch content.": "技能内容尚未缓存，请同步服务器后获取。",
  "Refresh from remote": "从远程刷新",
  "Pull the latest list of skills on this server.": "拉取该服务器上的最新技能列表。",
  "Push to remote": "推送到远程",
  "Send your local skills. Adds new ones, updates changed ones, never deletes.": "发送本地技能：新增缺失项、更新变更项，不会删除远程技能。",
  "Mirror to remote": "镜像到远程",
  "Match this server one-to-one. Anything on the remote that you don't have locally is deleted.": "让远程与本地完全一致；远程多出的技能将被删除。",
  "Match this server one-to-one with your local skills.": "让该服务器与本地技能完全一致。",
  "Computing diff…": "正在计算差异…",
  "to add,": "个待新增，",
  "to update,": "个待更新，",
  "to delete,": "个待删除，",
  "unchanged.": "个无变化。",
  "Nothing to": "无需",
  mirror: "镜像",
  push: "推送",
  "— the remote already matches your local skills.": "——远程技能已与本地一致。",
  "Mirror mode will delete": "镜像模式将从远程删除",
  "from the remote.": "个技能。",
  "Mirroring to remote…": "正在镜像到远程…",
  "Pushing to remote…": "正在推送到远程…",
  "Operation failed": "操作失败",
  Apply: "执行",
  Done: "完成",
  Official: "官方",
  "Skill by a verified organization": "来自已验证组织的技能",
  "No agents selected": "未选择 Agent",
  "Installing...": "正在安装…",
  "Preparing download...": "正在准备下载…",
  "Reading repository...": "正在读取仓库信息…",
  "Downloading Skill...": "正在下载 Skill…",
  "Trying another download method...": "正在尝试其他下载方式…",
  "Installing to selected Agents...": "正在安装到所选 Agent…",
  "Installation complete": "安装完成",
  "Installation failed": "安装失败",
  Install: "安装",
  installs: "次安装",
  GitHub: "GitHub",
  "Skill content not available.": "技能内容不可用。",
  "Browse and search skills from skills.sh.": "浏览并搜索 skills.sh 中的技能。",
  "skills loaded": "个技能已加载",
  "Search by name or keyword... (Enter to search)": "按名称或关键词搜索（按 Enter 开始）",
  Results: "搜索结果",
  Trending: "热门",
  "Official only": "仅官方",
  "Loading popular skills...": "正在加载热门技能…",
  "Loading catalog...": "正在加载技能目录…",
  "No skills found": "未找到技能",
  "No more results": "没有更多结果",
  "is ready to install.": "已准备好安装。",
  Later: "稍后",
  "Restart & Update": "重启并更新",
  "Downloading update": "正在下载更新",
  Dismiss: "关闭",
  Skill: "技能",
  Scope: "范围",
  Agents: "Agent",
  Market: "市场",
  "Install to": "安装到",
  installed: "已安装",
  default: "默认",
  "⌘ All Skills": "⌘ 全部技能",
  "▣ Skill Market": "▣ Skill 市场",
  "Skill Market": "Skill 市场",
  "+ New Skill": "+ 新建 Skill",
}

// ---------------------------------------------------------------------------
// Reverse direction: hardcoded Chinese source strings -> English.
// The convention is English source + zhCN dictionary above, but a number of
// newer components were written with Chinese literals. Translating both ways
// keeps every page correct in both locales without rewriting those files.
// ---------------------------------------------------------------------------
const zhToEn: Record<string, string> = {
  // Sidebar / brand
  在线目录: "Online catalog",
  本地模式: "Local mode",
  切换为英文: "Switch to English",
  // Home list & header
  技能库: "Library",
  全部技能: "All Skills",
  收藏: "Favorites",
  新建: "New",
  暂无合集: "No collections yet",
  个本地: "local",
  全局: "Global",
  项目: "Project",
  自定义: "Custom",
  全部范围: "All scopes",
  搜索技能: "Search skills",
  选择: "Select",
  全选: "Select all",
  取消全选: "Deselect all",
  完成: "Done",
  类别: "Category",
  简介: "Description",
  暂无简介: "No description",
  导入: "Import",
  导入中: "Importing",
  导出: "Export",
  导出中: "Exporting",
  刷新: "Refresh",
  扫描中: "Scanning",
  添加目录: "Add folders",
  已收藏: "Favorited",
  适配中: "Adapting",
  "适配到 Agent": "Adapt to agent",
  已适配: "Adapted",
  个: "",
  个技能: "skills",
  // Categories
  视频: "Video",
  音频: "Audio",
  图像: "Images",
  设计: "Design",
  安全: "Security",
  文档: "Docs",
  社媒: "Social",
  写作: "Writing",
  开发: "Dev",
  数据: "Data",
  通用: "General",
  // Detail panel / agent adaptation
  "Agent 适配": "Agent adaptation",
  "点击立即生效；关闭最后一个 Agent 后，本地母本仍会保留":
    "Applies immediately; the local master copy is kept after the last agent is disabled",
  "开关仅控制是否启用，不会同步独立副本中的修改":
    "The switch only controls availability and does not sync changes from independent copies",
  "：存在未同步的独立副本": ": Has an unsynced independent copy",
  "适配失败，请重试": "adaptation failed, please retry",
  "适配已生效，但列表刷新失败": "Adaptation applied, but the list failed to refresh",
  中存在未同步的独立副本: "has an unsynced independent copy",
  个文件与母版不同: "files differ from the master",
  同步至母版: "Sync to master",
  同步中: "Syncing",
  内容已修改: "Content modified",
  仅母版中存在: "Only in the master",
  仅该副本中存在: "Only in this copy",
  另有: "Another",
  个不同文件未列出: "different files are not shown",
  该副本中的修改当前仅在: "Changes in this copy currently apply only in",
  "中生效。同步至母版后，使用母版的其他 Agent 将自动更新。":
    ". After syncing to the master, other agents using the master will update automatically.",
  "同步失败，请重试": "sync failed, please retry",
  集合: "Collections",
  "暂无集合。": "No collections yet.",
  回到顶部: "Back to top",
  关闭: "Close",
  // Migration dialog
  "导出 Skill": "Export skills",
  "导入 Skill": "Import skills",
  "生成可在其他设备恢复的本地迁移包": "Build a migration package restorable on other devices",
  "检查迁移包并恢复本地 Skill": "Inspect a migration package and restore local skills",
  选择导出范围: "Choose export scope",
  "已选择的 Skill": "Selected skills",
  "全部 Skill": "All skills",
  "全局 Skill": "Global skills",
  "项目 Skill": "Project skills",
  "迁移包会保存 Skill 文件以及原有的 Agent 启用关系。":
    "The package keeps skill files and their agent bindings.",
  迁移包: "Package",
  可导入: "Importable",
  同名跳过: "Duplicates skipped",
  可立即恢复: "Ready to restore",
  "未安装，导入后待适配": "Not installed, adapt after import",
  "暂未识别，保留适配记录": "Unknown, bindings kept",
  "本机新增，不自动启用": "New on this machine, not auto-enabled",
  "以后检测到缺失的 Agent 时，会自动恢复原有适配；本机新增 Agent 可在导入后通过批量操作启用。":
    "Missing agents get their bindings restored automatically once detected; new agents can be enabled later via bulk actions.",
  正在准备导出: "Preparing export",
  正在准备导入: "Preparing import",
  导出完成: "Export complete",
  导入完成: "Import complete",
  已导入: "Imported",
  已恢复适配: "Bindings restored",
  "等待 Agent": "Pending agents",
  个失败项: "failures",
  取消: "Cancel",
  选择位置并导出: "Choose location & export",
  开始导入: "Start import",
  "刷新失败，请检查扫描目录": "Refresh failed, check your scan folders",
  "无法读取迁移包，请选择有效的 .skillbox 文件":
    "Cannot read the package; choose a valid .skillbox file",
  "当前范围没有可导出的本地 Skill": "No local skills in this scope to export",
  "导出失败，请重试或更换保存位置": "Export failed; retry or choose another location",
  "导出失败：目标文件正在使用中，请关闭后重试":
    "Export failed: the target file is in use; close it and retry",
  "导入失败，迁移包可能已损坏或目标目录不可写":
    "Import failed; the package may be corrupt or the destination is not writable",
  "批量收藏失败": "Bulk favorite failed",
  // Scan sources dialog
  自定义扫描目录: "Custom scan folders",
  "添加本地文件夹后，SkillVault 会扫描其中的 SKILL.md 和项目级 Agent 目录。":
    "After adding local folders, SkillVault scans them for SKILL.md files and project-level agent directories.",
  添加: "Add",
  "暂无自定义目录，Agent 的默认目录仍会自动扫描。":
    "No custom folders yet; default agent directories are still scanned.",
  移除: "Remove",
  保存并扫描: "Save & scan",
  // Skill Market
  "▣ Skill Market": "▣ Skill Market",
  "搜索并安装社区 Skill，数据来源和安装方式保持原样。":
    "Search and install community skills; source and install method stay untouched.",
  "按名称或关键词搜索（输入即搜）": "Search by name or keyword (searches as you type)",
  搜索结果: "Results",
  热门: "Trending",
  仅官方: "Official only",
  "正在载入热门技能...": "Loading trending skills...",
  "正在搜索...": "Searching...",
  没有找到相关: "No skills found",
  "‹ 上一页": "‹ Prev",
  "下一页 ›": "Next ›",
  页: "",
  详情: "Details",
  "详情 →": "Details →",
  社区: "Community",
  "选择安装目标": "Choose install targets",
  "点击筛选已适配 Skill": "Click to filter adapted skills",
  "+ 新建": "+ New",
  共: "Total",
  项: "items",
  "项 · 翻页自动加载更多": "items · more load as you page",
  "个本地 Skill · 跨": "local skills · across",
  "没有找到相关 Skill": "No skills found",
  // Update dialog
  版本更新: "App updates",
  检查更新: "Check for updates",
  "检查中…": "Checking…",
  "正在检查更新…": "Checking for updates…",
  "当前已是最新版本。": "You are up to date.",
  "启动时会自动检查更新，也可以手动检查。":
    "Updates are checked automatically at launch; you can also check manually.",
  "正在载入更新内容…": "Loading release notes…",
  "暂无更新说明。": "No release notes available.",
  "查看 GitHub Release": "View GitHub release",
  立即重启安装: "Restart & install",
  "更可靠地发现并同步 Skill": "Find and sync skills more reliably",
  "本次更新修复了项目级 Skill 扫描、同名条目与独立副本同步问题，并新增 3 个 Agent 适配。":
    "This update fixes project-level skill scanning, duplicate entries, and independent copy syncing, and adds three Agent integrations.",
  "更新不会更改现有 Skill、Agent 适配关系或独立副本。":
    "The update keeps your existing skills, Agent bindings, and independent copies.",
  "复制给 Agent 更新": "Copy update request for Agent",
  "更新请求已复制": "Update request copied",
  "复制失败，请重试": "Copy failed, try again",
  "立即下载更新": "Download update",
  "重启并安装": "Restart & install",
  等待下载: "Waiting",
  下载完成: "Downloaded",
  "请稍后重试": "Try again later",
  "检查更新失败：": "Update check failed: ",
}

function translateZhToEnDynamic(source: string): string | null {
  const rules: Array<[RegExp, (...matches: string[]) => string]> = [
    [/^(\d+) 个本地 Skill · 跨$/, (count) => `${count} local skills · across`],
    [/^个 Agent$/, () => "agents"],
    [/^个本地 Skill · 跨 (\d+) 个 Agent$/, (count, agents) => `${count} local skills · across ${agents} agents`],
    [/^导出所选 (\d+)$/, (count) => `Export selected ${count}`],
    [/^导出选中的 (\d+) 个 Skill$/, (count) => `Export ${count} selected skills`],
    [/^已刷新 (\d+) 个本地 Skill$/, (count) => `Refreshed ${count} local skills`],
    [/^已收藏 (\d+) 个 Skill$/, (count) => `Favorited ${count} skills`],
    [/^已适配 (\d+) 个 Skill，(\d+) 个失败$/, (done, failed) => `Adapted ${done} skills, ${failed} failed`],
    [/^已将 (\d+) 个 Skill 适配到 (.+)$/, (count, agent) => `Adapted ${count} skills to ${agent}`],
    [/^检测到 (.+)，已自动恢复 (\d+) 项 Skill 适配$/, (agents, count) => `Detected ${agents}; restored ${count} skill bindings automatically`],
    [/^(.+) 适配失败，请重试$/, (agent) => `${agent} adaptation failed, please retry`],
    [/^已打包 (\d+) 个 Skill$/, (count) => `Packed ${count} skills`],
    [/^共 (\d+) 项 · 翻页自动加载更多$/, (count) => `${count} items · more load as you page`],
    [/^共 (\d+) 项$/, (count) => `${count} items`],
    [/^(\d+) 项$/, (count) => `${count} items`],
    [/^第$/, () => "Page"],
    [/^新版本 (.+) 可用$/, (version) => `Version ${version} available`],
    [/^当前版本 (.+) → 新版本 (.+)$/, (current, next) => `Current ${current} → new ${next}`],
    [/^发现新版本 (.+)，正在后台下载…$/, (version) => `Version ${version} found, downloading in the background…`],
    [/^正在下载 (.+)…$/, (version) => `Downloading ${version}…`],
    [/^正在下载 SkillVault (.+)…$/, (version) => `Downloading SkillVault ${version}…`],
    [/^下载中 (\d+)%$/, (percent) => `Downloading ${percent}%`],
    [/^发布于 (.+) · 当前版本 (.+)$/, (date, version) => `Released ${date} · Current ${version}`],
    [/^(.+) 已准备就绪，可立即下载。$/, (version) => `${version} is ready to download.`],
    [/^(.+) 已下载完成，重启后即可生效。$/, (version) => `${version} is downloaded and will be installed after restart.`],
    [/^(.+) 已下载完成，重启后生效。$/, (version) => `${version} downloaded; it will apply after a restart.`],
    [/^选择 (.+)$/, (name) => `Select ${name}`],
    [/^当前版本 (.+)$/, (version) => `Current ${version}`],
    [/^→ 新版本 (.+)$/, (version) => `→ new ${version}`],
    [/^："(.*)"$/, (query) => `: "${query}"`],
  ]
  for (const [pattern, replacement] of rules) {
    const match = source.match(pattern)
    if (match) return replacement(...match.slice(1))
  }
  return null
}

function translateDynamic(source: string): string | null {
  const rules: Array<[RegExp, (...matches: string[]) => string]> = [
    [/^(\d+) skills?$/, (count) => `${count} 个技能`],
    [/^(\d+) remote skills?$/, (count) => `${count} 个远程技能`],
    [/^(\d+) custom scan sources?$/, (count) => `${count} 个自定义扫描来源`],
    [/^Version (.+)$/, (version) => `版本 ${version}`],
    [/^Latest available: (.+)$/, (version) => `最新版本：${version}`],
    [/^Download progress: (.+)$/, (progress) => `下载进度：${progress}`],
    [/^(\d+) installs$/, (count) => `${count} 次安装`],
    [/^Downloading (\d+)\/(\d+) files$/, (completed, total) => `正在下载：${completed}/${total} 个文件`],
    [/^Downloading (\d+)\/(\d+) files · (.+)\/(.+)$/, (completed, total, downloaded, size) => `正在下载：${completed}/${total} 个文件 · ${downloaded}/${size}`],
    [/^Remove "(.+)"$/, (name) => `移除“${name}”`],
    [/^Dragging “(.+)”$/, (name) => `正在拖动“${name}”`],
    [/^Remove "(.+)" from (.+)\?$/, (name, agent) => `确定从 ${agent} 移除“${name}”吗？`],
    [/^Delete collection "(.+)"\?$/, (name) => `确定删除集合“${name}”吗？`],
    [/^Update (.+) available$/, (version) => `发现新版本 ${version}`],
    [/^Update (.+) ready to install$/, (version) => `版本 ${version} 已可安装`],
    [/^Downloading update (.+)$/, (version) => `正在下载版本 ${version}`],
    [/^Added "(.+)" to (.+)$/, (name, agent) => `已将“${name}”添加到 ${agent}`],
    [/^Failed to add "(.+)" to (.+)$/, (name, agent) => `无法将“${name}”添加到 ${agent}`],
    [/^(\d+) skills? · (\d+) not yet pushed$/, (total, pending) => `${total} 个技能 · ${pending} 个尚未推送`],
    [/^(\d+) skills? · (\d+) only on remote$/, (total, remote) => `${total} 个技能 · ${remote} 个仅在远程`],
    [/^(\d+) skills? · in sync$/, (total) => `${total} 个技能 · 已同步`],
    [/^(\d+)m ago$/, (value) => `${value} 分钟前`],
    [/^(\d+)h ago$/, (value) => `${value} 小时前`],
    [/^(\d+)d ago$/, (value) => `${value} 天前`],
    [/^All agents \((\d+)\)$/, (count) => `全部 Agent（${count}）`],
    [/^(\d+) agents? selected$/, (count) => `已选 ${count} 个 Agent`],
    [/^for "(.*)"$/, (query) => `"${query}" 的结果`],
  ]

  for (const [pattern, replacement] of rules) {
    const match = source.match(pattern)
    if (match) return replacement(...match.slice(1))
  }
  return null
}

function translateSource(source: string, locale: AppLocale): string {
  const leading = source.match(/^\s*/)?.[0] ?? ""
  const trailing = source.match(/\s*$/)?.[0] ?? ""
  const trimmed = source.trim()
  if (!trimmed) return source
  const translated =
    locale === "en-US"
      ? zhToEn[trimmed] ?? translateZhToEnDynamic(trimmed)
      : zhCN[trimmed] ?? translateDynamic(trimmed)
  return translated != null ? `${leading}${translated}${trailing}` : source
}

interface NodeTranslation {
  source: string
  applied: string
}

const textTranslations = new WeakMap<Text, NodeTranslation>()
const attributeTranslations = new WeakMap<Element, Map<string, NodeTranslation>>()
const translatedAttributes = ["placeholder", "title", "aria-label"]

function shouldSkip(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement
  return Boolean(element?.closest(".skill-prose, .cm-editor, [data-no-localize], pre, code"))
}

function translateTextNode(node: Text, locale: AppLocale): void {
  if (shouldSkip(node)) return
  const current = node.nodeValue ?? ""
  const previous = textTranslations.get(node)
  const source = previous && current === previous.applied ? previous.source : current
  const applied = translateSource(source, locale)
  textTranslations.set(node, { source, applied })
  if (current !== applied) node.nodeValue = applied
}

function translateElement(element: Element, locale: AppLocale): void {
  if (shouldSkip(element)) return
  const records = attributeTranslations.get(element) ?? new Map<string, NodeTranslation>()
  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute)
    if (current === null) continue
    const previous = records.get(attribute)
    const source = previous && current === previous.applied ? previous.source : current
    const applied = translateSource(source, locale)
    records.set(attribute, { source, applied })
    if (current !== applied) element.setAttribute(attribute, applied)
  }
  attributeTranslations.set(element, records)
}

function translateTree(root: Node, locale: AppLocale): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return
  if (root.nodeType === Node.ELEMENT_NODE) translateElement(root as Element, locale)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text, locale)
    else translateElement(current as Element, locale)
    current = walker.nextNode()
  }
}

interface LocalizationContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  translate: (source: string) => string
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null)

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("zh-CN")

  useEffect(() => {
    electronAPI.settingsGet<AppLocale>(UI_LANGUAGE_KEY, "zh-CN")
      .then((stored) => {
        const next = stored === "en-US" ? "en-US" : "zh-CN"
        setLocaleState(next)
        electronAPI.setAppLanguage(next)
      })
      .catch(() => {})
  }, [])

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    const root = document.getElementById("root")
    if (!root) return
    translateTree(root, locale)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target, locale)
        if (mutation.type === "attributes") translateTree(mutation.target, locale)
        for (const node of mutation.addedNodes) translateTree(node, locale)
      }
    })
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    })
    return () => observer.disconnect()
  }, [locale])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    electronAPI.setAppLanguage(next)
    electronAPI.settingsSet(UI_LANGUAGE_KEY, next).catch(() => {})
  }, [])

  const translate = useCallback((source: string) => translateSource(source, locale), [locale])
  const value = useMemo(
    () => ({ locale, setLocale, translate }),
    [locale, setLocale, translate],
  )
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}

export function useLocalization(): LocalizationContextValue {
  const value = useContext(LocalizationContext)
  if (!value) throw new Error("useLocalization must be used inside LocalizationProvider")
  return value
}
