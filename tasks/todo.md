# SkillVault v1.2.0 — 任务清单

## Task 1: 新增安装口令生成模块（XS）

**Description:** 抽出 `renderer/lib/install-prompt.ts`，纯函数生成三通道安装文本：自然语言安装口令、CLI 命令、Zip 下载地址。

**Acceptance criteria:**
- [ ] `genInstallPrompt(skill, agentDisplayNames)` 输出「请安装 X 技能：根据 <url>，安装到 A、B。」
- [ ] 未选目标 Agent 时口令提示「请在对话中指定目标 Agent」
- [ ] `genCliCommand(skill, agents)` 输出 `npx skillvault add <source>`
- [ ] `genZipUrl(skill)` 输出可下载 zip 地址

**Verification:**
- [ ] `npm run build` 通过
- [ ] 手工：详情页选中 Agent 后口令包含对应 Agent 名

**Dependencies:** None

**Files:** `apps/desktop/src/renderer/lib/install-prompt.ts`（新建）

---

## Task 2: SkillCard 挂「复制口令」迷你按钮（S）

**Description:** 列表卡片右侧新增轻量「复制口令」按钮，点击复制安装口令并给成功反馈，不触发进入详情。

**Acceptance criteria:**
- [ ] 卡片根元素由 `<button>` 改为 `div`（role=button + 键盘可达），避免嵌套按钮
- [ ] 复制按钮 `stopPropagation`，点击不进详情
- [ ] 复制成功 1.5s 内显示「已复制」

**Verification:**
- [ ] 构建通过；点击按钮列表不跳转

**Dependencies:** Task 1

**Files:** `apps/desktop/src/renderer/routes/discover.tsx`

---

## Task 3: DetailPanel 三通道安装面板（M）

**Description:** 详情弹窗安装区改为三通道：主按钮本机 symlink 直装，下方「复制安装口令（推荐）/ CLI 命令 / 下载 Zip」。

**Acceptance criteria:**
- [ ] 主按钮保留现有 `onInstall` 与进度、已装态
- [ ] 口令随所选 Agent 动态生成并可见预览 + 一键复制
- [ ] CLI 行一键复制；Zip 行可触发下载

**Verification:**
- [ ] 类型检查 + 构建通过；切换 Agent 后口令同步变化

**Dependencies:** Task 1

**Files:** `apps/desktop/src/renderer/routes/discover.tsx`

---

## Task 4: 市场技能收藏（仅详情页）（M）

**Description:** 详情页头部新增心形收藏按钮，复用既有 FavoritesStore/IPC，以 `market:<source>/<skillId>` 为键持久化。

**Acceptance criteria:**
- [ ] 仅在详情弹窗出现收藏图标（列表卡片不出现）
- [ ] 点击切换收藏态，写入 SQLite 并即时回显
- [ ] 重新打开详情/重启应用后状态保持

**Verification:**
- [ ] 构建通过；手工切换 + 重开验证持久化

**Dependencies:** None

**Files:** `apps/desktop/src/renderer/routes/discover.tsx`

---

### Checkpoint: Core Features
- [x] 类型检查通过
- [x] 构建成功
- [x] 列表复制 / 详情三通道 / 收藏持久化 自测通过

---

## Task 5: Web 端代码审查与体积重构（M）

**Description:** 系统审查 renderer 依赖与 chunk 划分，把 Home 与 SkillEditor 改为懒加载，降低主包与安装包体积。

**Acceptance criteria:**
- [ ] App.tsx 中 Home 改为 `lazy` + Suspense
- [ ] home.tsx 中 SkillEditor 改为 `lazy`，CodeMirror 独立 chunk
- [ ] 构建后主 chunk 显著下降（目标 < 1.0 MB）

**Verification:**
- [ ] 构建通过并对比 `out/renderer/assets` 体积前后

**Dependencies:** Task 1-4

**Files:** `apps/desktop/src/renderer/App.tsx`, `apps/desktop/src/renderer/routes/home.tsx`

---

## Task 6: 版本号 + README（S）

**Description:** 版本提升到 v1.2.0，README 更新功能说明与更新日志。

**Acceptance criteria:**
- [ ] `apps/desktop/package.json` version = 1.2.0
- [ ] README 版本徽章、功能列表、v1.2.0 更新日志已更新

**Dependencies:** Task 5

**Files:** `apps/desktop/package.json`, `README.md`

---

## Task 7: 版本规范产物（S）

**Description:** 建立规范：`releases/<version>/` 下存放 `PRD.md` 与 `RELEASE-CHECKLIST.md`。

**Acceptance criteria:**
- [ ] `releases/v1.2.0/PRD.md` 存在（背景/目标/方案/验收/风险）
- [ ] `releases/v1.2.0/RELEASE-CHECKLIST.md` 存在（构建/打包/发版/回滚）

**Dependencies:** Task 6

**Files:** `releases/v1.2.0/*.md`（新建）

---

## Task 8: 构建 → 打包 → GitHub 发版（M）

**Description:** 构建、打包 Windows 安装包，用 gh CLI 创建 v1.2.0 Release 并上传 exe/blockmap/latest.yml。

**Acceptance criteria:**
- [ ] 构建通过
- [ ] 安装包产物生成（输出到 `release-120`，避免默认 release/ 句柄占用）
- [ ] GitHub Release v1.2.0 含三资产

**Verification:**
- [ ] `gh release view v1.2.0` 可见三资产

**Dependencies:** Task 7
