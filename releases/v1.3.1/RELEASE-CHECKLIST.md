# SkillVault v1.3.1 发布清单

- 版本：v1.3.1
- 日期：2026-09-30
- 类型：体验优化（翻译链路）
- 关联 PRD：`releases/v1.3.1/PRD.md`

## 一、代码改动

- [x] `translate-service.ts`：分块并发（限并发 3）、移除不可达的 Google gtx 兜底、超时 10s → 8s
- [x] `skill-intro.ts`：简介按句截断到 ~300 字符（`INTRO_MAX_CHARS`）
- [x] `discover.tsx`：译文未就绪先铺英文原文 + 「翻译中」标注；失败态显示原文并标注
- [x] 版本 → 1.3.1
- [x] README 更新日志新增 v1.3.1
- [x] `tsc --noEmit` 无错、构建通过（主包 655.10 kB，discover 91.02 kB）
- [x] 实测：300 字符单次请求 ≈1.2s，译文可用

## 二、性能对比（实测）

| 指标 | v1.3.0 | v1.3.1 |
|---|---|---|
| 请求次数（典型简介） | 最多 3 次（串行） | **1 次** |
| 出译文耗时 | 3.4 ~ 10s | **1.2s（热）/ 3.3s（冷启动）** |
| 失败时等待 | **10s 空等** | 立即降级 |
| 等待期 UI | 空白 + 转圈 | 英文原文 + 翻译中 |

## 三、打包与发版

- [x] 打包 `release-131`（应用开着时 `npm run package:win` 常在清空 out/ 失败；改为先单独 `npx electron-vite build` 重试，再直接 `npx electron-builder --win -c.directories.output=release-131` 跳过重建）
- [x] 提交 + 推送（git https 通道不通，走 `github-push-fallback` 的 Git Data API；远端 commit `a44face`，tree 一致）
- [x] `gh release create v1.3.1 --target a44face87d78f1c2aa13e57568f7ab1482fff3b8`
- [x] 上传资产：exe（86.07 MB）/ blockmap / latest.yml
- [x] `gh release view v1.3.1` 核对三资产
- [x] **本机同步升级**：已执行（先 `taskkill /F /IM SkillVault.exe`，再 `cd release-131 && ./SkillVault-Setup-1.3.1.exe /S /D=D:\SkillVault`）
- [x] 校验：`D:\SkillVault\resources\app.asar` 内 1.3.1 命中、1.3.0 归零，「翻译中」字符串存在

## 四、发布后验证（需人工）

- [ ] 打开技能详情 → 立刻看到英文原文，1–3s 内替换为中文译文
- [ ] 断网打开一个未译过的技能 → 显示英文原文 +「翻译暂不可用」
- [ ] 二次打开同一技能 → 命中缓存，译文秒出
- [ ] 回归：创作者头像 / Stars / 三通道安装 / 收藏 / 中英切换

## 五、回滚

- 重装 v1.3.0 安装包；翻译缓存键不变（`intro-zh:*`），旧版本忽略不报错

## 六、遗留项

- 单端点（MyMemory）无兜底：v1.4 用本地模型翻译彻底解决
- 简介截断 300 字符，长描述只取前 1–2 句
- 深链协议 `skillvault://` 与收藏列表页仍在 v1.4 候选
