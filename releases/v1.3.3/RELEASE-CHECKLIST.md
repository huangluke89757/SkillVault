# SkillVault v1.3.3 发布清单

- 版本：v1.3.3
- 日期：2026-11-15
- 类型：功能新增（发现页热门排行新增「累计高下载」与「本周飙升」，Issue #4）
- 关联 PRD：`releases/v1.3.3/PRD.md`、Issue #4、PR #5

## 一、代码改动

- [x] PR #5 合并入 main（合并提交 `7b30c31`）：热门排行三 Tab、主进程榜单解析与 6 小时 SQLite 缓存（迁移 v6）、渲染层排序纯函数、周榜卡片「上周」指标、`M` 单位格式化
- [x] 文案对齐 Issue 口径（提交 `7e4adac`）：Tab「累计高星」→「累计高下载」，副标题改为「按累计下载量 / 按上周下载量倒序」，英文保留 `All-time installs`
- [x] 版本 → 1.3.3；README 更新日志新增 v1.3.3
- [x] 单测：91 passed / 0 failed / 1 skipped
- [x] `electron-vite build` 通过

## 二、打包与发版

- [x] 先清理 `apps/desktop/out` 再重新构建，避免旧 chunk 混入安装包（确认包内 discover chunk 唯一）
- [x] 打包到 `release-133`：`SkillVault-Setup-1.3.3.exe`（90,249,994 字节 ≈ 86.07 MiB）/ blockmap（94,887 字节）/ `latest.yml`（version: 1.3.3）
- [x] 提交 + 推送：远端 main `276c3a5`，远端 tree 与本地一致（`f684c87`）
- [x] 打 tag `v1.3.3` → `276c3a5`
- [x] `gh release create v1.3.3` 并上传三资产（2026-11-15 15:34 UTC）；远端 `latest.yml` 的 sha512 与本地一致

## 三、包内自检（已做）

- [x] `app.asar` 内 `out/main/index.js` 含 `skills:fetch-leaderboard` IPC
- [x] 当前生效的 `discover-*.js` 含「累计高下载 / 本周飙升 / 按累计下载量倒序 / 按上周下载量倒序」，不含旧文案「累计高星」
- [x] 英文文案 `All-time installs` / `Sorted by all-time installs` 存在

## 四、发布后验证（需人工）

- [ ] 安装包可启动，关于页 / 包内版本为 1.3.3
- [ ] 发现页三个 Tab：热门 / 累计高下载 / 本周飙升均可渲染，默认「热门」
- [ ] 累计榜首项与周榜首项数值正常；翻页、切回「热门」正常
- [ ] 自动更新：v1.3.2 已装用户能检测到 1.3.3

## 五、回滚

- 重装 v1.3.2 安装包；榜单仅新增 SQLite 表（迁移 v6），无既有数据迁移

## 六、遗留项

- 「本周飙升」仍受上游按周聚合限制，无法拆到周一至周五（需按日数据源）
- 发布后验证项需人工勾选
