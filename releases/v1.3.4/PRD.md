# SkillVault v1.3.4 产品需求文档（PRD）

- 版本：v1.3.4
- 日期：2026-11-16
- 类型：缺陷修复（自动更新安装目录嵌套 / 重复下载）+ 界面改版（版本更新弹窗双区块说明）
- 关联：`releases/v1.3.4/RELEASE-CHECKLIST.md`、Issue #8、PR #9（squash 合并提交 `9697c1f`）

## 一、问题（为什么要改）

1. **自动更新装进嵌套目录，旧版本没被覆盖**：本机实测，正在运行的安装是 `D:\SkillVault`（v1.3.2，快捷方式指向 `D:\SkillVault\SkillVault.exe`），但更新装出的 v1.3.3 落到了 `D:\SkillVault\SkillVault`（第二份安装）。根因是注册表 `HKCU\Software\274718ce-cd07-5a38-9a81-e389d609c1c3\InstallLocation` 被写成 `D:SkillVault`（盘符后缺反斜杠）。electron-builder 的 NSIS 模板用该值作 `$INSTDIR`，NSIS 按「驱动器相对路径」把它相对安装器当前目录（应用目录 `D:\SkillVault`）解析，于是拼成嵌套路径。
2. **已是最新仍在反复下载**：系统/安装器认为已安装 v1.3.3，实际运行的仍是 v1.3.2，于是每次检查更新都判定 v1.3.3 可下载，反复下载约 86 MiB 安装包（`%LOCALAPPDATA%\@skillvaultdesktop-updater\pending\SkillVault-Setup-1.3.3.exe` 为证）。
3. **版本更新界面缺少「当前版本」说明**：原弹窗只有「最新版本」一份更新介绍，用户想看「我现在这版改了什么」没有入口；已是最新版本时也缺少明确反馈（👍 提示）。
4. **状态文案不一致**：更新横幅在 `available`（有新版本但未下载，`autoDownload=false`）时仍显示「Downloading…」。

## 二、目标与非目标

### 目标

- G1：自动更新不再生成嵌套目录或第二份安装；被截断的安装路径在安装时自动补全并写回注册表，覆盖交互安装与静默升级两条链路。
- G2：可下载/已下载版本与当前运行版本一致时，不进入下载流程；启动时清理已过期的更新缓存。
- G3：版本更新弹窗改为「当前版本」「最新版本」双区块，两份更新说明都可查看；当前=最新时，最新区块显示「您当前已装载最新版本👍，无需更新」，并隐藏下载 / 复制更新等操作。
- G4：更新横幅、设置页文案与真实状态一致。

### 非目标

- 不自动删除用户机器上已经产生的嵌套安装目录（自动删目录风险高，改为文档说明 + 人工清理建议）。
- 不改动安装模式默认（仍为当前用户安装），不引入新的提权流程。
- 不提升其他模块的版本号，不发新功能。

## 三、方案

| 层 | 实现 |
|---|---|
| 安装器 | 新增 `apps/desktop/resources/installer.nsh`（electron-builder 自动从 buildResources 加载）：`customInit` 先归一化 **HKCU / HKLM 的 `InstallLocation`** 并写回注册表（覆盖「安装模式页」「静默升级提权分支」等会再次读取注册表的旁路），再归一化 `$INSTDIR`。仅当「第 2 字符是 `:` 且第 3 字符不是 `\`」时改写为 `X:\...` |
| 主进程 | `auto-updater.ts`：`update-available`、检查后复核、`downloadAppUpdate`、`quitAndInstallUpdate` 四处校验版本一致 → 收敛为 `not-available`；启动时清理已过期 `pending` 缓存（当前版本已追上待装版本才删） |
| 共享逻辑 | 新增 `src/shared/update-notes.ts`：版本归一化/比较、`buildUpdateNotesViewModel`（notes / up-to-date / empty 三态）、安装包文件名取版本、过期缓存判定 |
| IPC | `updates:release-notes` 同时返回 `current`（`releases/tags/v<当前版本>`）与 `latest`（`releases/latest`），单边失败返回 `null` 不阻塞另一边 |
| 渲染层 | 更新弹窗双区块；当前版本 notes 缺失时降级「暂无该版本的更新说明」；已最新时标题「SkillVault 已是最新版本」、主按钮退回「检查更新」；设置页与横幅文案对齐 |

## 四、验收标准

- [ ] 单测通过：`npx tsx --test apps/desktop/test/*.test.ts`（101 用例，100 通过 / 1 历史 skip）
- [ ] `npx electron-vite build` 通过
- [ ] 打包出 `SkillVault-Setup-1.3.4.exe`（含新增 NSIS 脚本，编译无错）
- [ ] NSIS 归一化逻辑隔离验证：`D:SkillVault → D:\SkillVault`；`D:\SkillVault` / `D:\SkillVault\` / `\\server\share` / `SkillVault` 不变；`d:skillvault → d:\skillvault`
- [ ] 弹窗在「有新版」时显示两个区块；「已最新」时最新区块为 👍 提示且无下载按钮
- [ ] 更新器判定最新且 GitHub notes 取不到时，弹窗不出现「可复制更新请求」自相矛盾

## 五、风险与取舍

| 风险 | 影响 | 处置 |
|---|---|---|
| 注册表值带引号或纯相对路径时不归一化 | 低 | 现场值为 `D:SkillVault`（无引号）；electron-builder 写入格式不会带引号，PR 文档中如实说明 |
| 已存在的嵌套目录不会被自动删除 | 中 | 发布说明给人工清理步骤；自动删除目录另议 |
| 安装器脚本仅覆盖 Windows NSIS | 低 | 当前自动更新只发布 Windows 安装包；macOS/Linux 另行处理 |
| GitHub API 未认证限流（60 次/小时） | 低 | 弹窗打开时才请求、每次两份；失败降级为提示文案，不阻塞更新流程 |

## 六、后续（v1.4 候选）

- 一次性清理历史嵌套安装目录的受控方案（疑似路径 + 二次确认）
- `InstallLocation` 损坏来源的写入侧排查（哪条链路写出了 `D:SkillVault`）
- 更新说明请求加 ETag / 本地缓存，降低限流影响
