# SkillVault v1.3.2 发布清单

- 版本：v1.3.2
- 日期：2026-11-15
- 类型：功能补全（已安装列表批量操作）
- 关联 PRD：`releases/v1.3.2/PRD.md`、Issue #6、PR #7

## 一、代码改动

- [x] 批量操作栏「适配到 Agent」改为「调整适配」对话框（批量启用 / 取消）
- [x] 新增 `summarizeAgentAdaptation` 纯函数与单元测试
- [x] 版本 → 1.3.2；README 更新日志新增 v1.3.2
- [x] 单测：82 passed / 0 failed / 1 skipped
- [x] `electron-vite build` 通过

## 二、打包与发版

- [x] 打包到 `release-132`：`SkillVault-Setup-1.3.2.exe`（86.22 MB）/ blockmap / latest.yml
- [x] 提交 + 推送：git 直连被 reset，走 `github-push-fallback` 的 `gh_push.py`；远端 main `1c5cc55`，tree 与本地一致
- [x] 打 tag `v1.3.2` → `1c5cc55`
- [x] `gh release create v1.3.2` 并上传三资产（2026-11-15 09:40 UTC）

## 三、发布后验证（需人工）

- [ ] 安装包可启动，关于页 / 包内版本为 1.3.2
- [ ] 批量调整对话框：全部 / 部分 / 未适配三种状态展示正确
- [ ] 取消适配后母本 Skill 文件仍在
- [ ] 自动更新：v1.3.1 已装用户能检测到 1.3.2

## 四、回滚

- 重装 v1.3.1 安装包；批量适配为纯本地文件操作，无数据迁移

## 五、遗留项

- 批量收藏 / 批量集合入口本次未改动
- 发布后验证项需人工勾选