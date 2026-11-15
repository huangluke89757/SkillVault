# SkillVault v1.3.4 发布清单

- 版本：v1.3.4
- 日期：2026-11-16
- 类型：缺陷修复（自动更新嵌套安装 / 重复下载）+ 界面改版（版本更新弹窗双区块，Issue #8）
- 关联 PRD：`releases/v1.3.4/PRD.md`、Issue #8（已关闭）、PR #9（已合并）

## 一、代码改动

- [x] PR #9 合并入 main（squash 合并提交 `9697c1f`）：`resources/installer.nsh` 在 `customInit` 归一化 HKCU/HKLM 的 `InstallLocation` 并写回、归一化 `$INSTDIR`；`auto-updater.ts` 四处版本一致性护栏 + 启动清理过期 pending 缓存；`shared/update-notes.ts` 版本模型与单测；更新弹窗「当前版本 / 最新版本」双区块；设置页与更新横幅文案对齐
- [x] 版本 → 1.3.4；README 更新日志新增 v1.3.4
- [x] 单测：101 用例，100 通过 / 1 skipped（历史跨磁盘环境用例）
- [x] `electron-vite build` 通过

## 二、打包与发版

- [x] 先清理 `apps/desktop/out` 再重新构建，避免旧 chunk 混入安装包
- [x] 打包到 `release-134`：`SkillVault-Setup-1.3.4.exe`（90,252,169 字节 ≈ 86.08 MiB）/ blockmap（94,927 字节）/ `latest.yml`（version: 1.3.4）
- [x] 提交 + 推送：远端 main `163b3ad`
- [x] 打 tag `v1.3.4` → `163b3ad`
- [x] `gh release create v1.3.4` 并上传三资产（2026-11-15 17:43 UTC）；远端 `latest.yml` 的 sha512 与本地一致

## 三、包内自检（已做）

- [x] `app.asar` 内 `package.json` 的 version = 1.3.4
- [x] 安装包 `FileVersion` / `ProductVersion` = 1.3.4
- [x] `builder-debug.yml` 含 `!include "...apps\desktop\resources\installer.nsh"` 与 `!insertmacro customInit`
- [x] `app-update.yml`：`owner: huangluke89757`、`repo: SkillVault`、`updaterCacheDirName: @skillvaultdesktop-updater`
- [x] `latest.yml` 的 sha512 与本地 exe 实测一致（`0dqhc/jNh6nA17...hqIg==`）

## 四、发布后验证（需人工）

- [ ] 安装包可启动，关于页 / 包内版本为 1.3.4
- [ ] 版本更新弹窗：当前版本与最新版本双区块均可查看；已最新时最新区块显示「您当前已装载最新版本👍，无需更新」且无下载 / 复制更新入口
- [ ] 自动更新：v1.3.3 已装用户能检测到 1.3.4；安装后注册表 `InstallLocation` 为正确绝对路径
- [ ] 安装目录单份：`D:\SkillVault` 下不再出现 `SkillVault\SkillVault` 嵌套副本（受影响的机器需先按 PR #9 说明人工清理旧副本）

## 五、回滚

- 重装 v1.3.3 安装包即可回滚；本次无数据库迁移，无既有数据影响

## 六、遗留

- 已产生的嵌套目录、损坏的 HKCU 卸载键不会被本次更新自动删除，需人工清理
- 「`HKCU InstallLocation` 为何被写成 `D:SkillVault`」的写入侧来源仍未定位（推定来自更早某次带 `/D` 的静默安装链路）
- 注册表值为带引号或纯相对路径时不做归一化（现场值为无引号 `D:SkillVault`）
