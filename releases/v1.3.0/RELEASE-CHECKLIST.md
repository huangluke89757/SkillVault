# SkillVault v1.3.0 发布清单

- 版本：v1.3.0
- 日期：2026-09-28
- 仓库：https://github.com/huangluke89757/SkillVault
- 关联 PRD：`releases/v1.3.0/PRD.md`

## 一、版本与代码

- [x] `apps/desktop/package.json` 版本 → 1.3.0
- [x] 详情页「中文简介」（提取 → 缓存 → 主进程机翻 → 降级提示）
- [x] 详情页创作者标记（头像 + @作者，点击直达原仓库）
- [x] 详情页 GitHub Stars（7 天缓存，点击直达原仓库）
- [x] 主进程翻译服务 `translate-service.ts`（MyMemory → Google gtx 降级链 + LRU）
- [x] IPC `skills:translate-text` + preload `translateText` 暴露
- [x] 原有模块保留核验：意图介绍模板 / 三通道安装 / 收藏 / 中英切换 / SKILL.md 原文渲染
- [x] 类型检查 `tsc --noEmit` 无错
- [x] 构建 `npm run build` 通过（主包 655.10 kB 持平，discover 81→90 kB）
- [x] README 版本徽章、功能列表、更新日志更新

## 二、产物与体积（构建实测）

| 资产 | v1.2.0 | v1.3.0 | 变化 |
|---|---|---|---|
| 主 chunk `index-*.js` | 655.10 kB | 655.10 kB | 持平（翻译在主进程） |
| `discover-*.js` | 81.03 kB | 89.90 kB | +8.9 kB（创作者/Stars/中文简介 UI） |
| `transformers-*.js` | 1,391.24 kB | 1,391.24 kB | 持平（按需加载） |

## 三、打包与发版

- [ ] `npm run package:win`（输出 `release-130`）
- [ ] `git commit` + `git push https://huangluke89757:$(gh auth token)@github.com/huangluke89757/SkillVault.git HEAD:main`
- [ ] `gh release create v1.3.0 --target <完整 40 位 SHA>`
- [ ] 上传资产：exe / blockmap / latest.yml
- [ ] `gh release view v1.3.0` 核对三资产
- [ ] **本机同步升级**：`bash scripts/install-local.sh 1.3.0`（原地覆盖 `D:\SkillVault`）
- [ ] 校验：`D:\SkillVault\resources\app.asar` 内 1.3.0 命中、1.2.0 归零，新功能字符串（中文简介 / 机翻）存在

## 四、发布后验证（需人工）

- [ ] 打开技能详情 → 「中文简介」卡片出现译文（首次打开需联网翻译，稍等片刻）
- [ ] 切 EN → 卡片消失；切回中文 → 命中缓存立即显示
- [ ] 断网重开一个未译技能 → 显示降级提示，其余功能正常
- [ ] 创作者头像 + @作者可见，点击打开原仓库
- [ ] Stars 显示数字，点击打开原仓库
- [ ] 三通道安装 / 收藏 / 中英切换均正常（回归）

## 五、回滚

- 回滚方式：重装 v1.2.0 安装包即可；翻译缓存存于 localStorage（`intro-zh:*`），旧版本忽略不报错
- 影响面：仅详情页新增展示，无数据库 schema 变更

## 六、遗留项

- 免费翻译端点可用性依赖网络环境，长期方案建议接本地 LLM（见 PRD 第七节）
- README 截图未含新 UI，待刷新
- 深链协议 `skillvault://` 持续后置中
