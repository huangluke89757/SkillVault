# Implementation Plan: SkillVault v1.2.0（融合方案 1 + 市场技能收藏）

## Overview
按「融合方案 1 · 详情集成式」升级安装能力，并新增市场技能收藏（仅详情页入口）；同步做 Web 端代码审查与体积重构，最后按新规范产出 PRD + 发布清单并发布 GitHub。

## 现状勘察结论（只读阶段）
- 安装：v1.1.0 仅「应用内直装」一条通道（`discover.tsx` DetailPanel → `electronAPI.installSkill`）。
- 收藏：底层已存在 `main/db/favorites.ts`（SQLite 表 `favorites(skill_name)`）+ IPC `favorites:list / toggle / add-many`，**当前只服务本地技能**。市场技能可复用同一张表，用 `market:<source>/<skillId>` 命名空间键，无需改 schema。
- 体积问题（实测 `out/renderer/assets`）：
  - 主 chunk `index-*.js` = **1.90 MB**（Home 是静态导入，把 CodeMirror + react-window + marked 全打进主包）
  - `transformers-*.js` = 1.39 MB（已懒加载，正常）
  - `discover-*.js` = 73 KB（已懒加载，正常）
  - CSS 70 KB
  → **最大杠杆：把 Home 与 SkillEditor 改为懒加载**，CodeMirror 只在真正编辑时加载。

## Architecture Decisions
- 口令生成抽独立模块 `lib/install-prompt.ts`，纯函数、零依赖，便于复用与单测。
- 收藏复用既有 FavoritesStore 与 IPC，不新增表、不新增 IPC（YAGNI）。
- 体积重构只做「懒加载切分」，不改动业务行为，风险可控。

## Task List

### Phase 1: Foundation
- [ ] Task 1: 新增 `lib/install-prompt.ts`（口令 / CLI / Zip 三通道文本生成）

### Phase 2: Core Features
- [ ] Task 2: SkillCard 挂「复制口令」迷你按钮
- [ ] Task 3: DetailPanel 改造为三通道安装面板
- [ ] Task 4: 技能详情收藏（心形图标 + 持久化 + 状态同步）

### Checkpoint: Core Features
- [ ] 类型检查通过、构建成功、功能自测（列表复制 / 详情三通道 / 收藏持久化）

### Phase 3: 体积与规范
- [ ] Task 5: Web 端代码审查 + 体积重构（Home 懒加载 / SkillEditor 懒加载）
- [ ] Task 6: 版本号提升到 v1.2.0 + README 更新
- [ ] Task 7: 按新规范产出 `releases/v1.2.0/` 下 PRD 与发布清单

### Phase 4: 交付
- [ ] Task 8: 构建 → 打包 → GitHub 发版

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| SkillCard 原为 `<button>`，嵌套按钮非法 | 中 | 根元素改 div（role=button + 键盘可达），复制按钮 stopPropagation |
| Home 懒加载后首屏有 fallback 闪烁 | 低 | 复用现有 RouteFallback，chunk 本地加载无网络延迟 |
| 收藏键与本地技能名冲突 | 低 | 用 `market:` 前缀命名空间 |

## Open Questions
- 自举文档 `install/*.md` 暂无托管，本期口令先指向 GitHub 仓库 raw 说明（后续可换 Pages）。
