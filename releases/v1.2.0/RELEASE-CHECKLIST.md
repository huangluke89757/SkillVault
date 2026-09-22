# SkillVault v1.2.0 发布清单

- 版本：v1.2.0
- 日期：2026-09-22
- 仓库：https://github.com/huangluke89757/SkillVault
- 关联 PRD：`releases/v1.2.0/PRD.md`

## 一、版本与代码

- [x] `apps/desktop/package.json` 版本 → 1.2.0
- [x] 功能实现：列表卡片复制口令 / 详情三通道安装面板 / 详情收藏
- [x] 体积重构：Home 懒加载 + CodeMirror 按需加载
- [x] 类型检查 `tsc --noEmit` 无错
- [x] 构建 `npm run build` 通过
- [x] README 版本徽章、功能列表、更新日志更新
- [x] 版本产物：`releases/v1.2.0/PRD.md` + 本清单

## 二、产物与体积（构建实测）

| 资产 | v1.1.0 | v1.2.0 | 变化 |
|---|---|---|---|
| 主 chunk `index-*.js` | 1,904.62 kB | 655.10 kB | **-66%** |
| `home-*.js` | 未拆分 | 154.41 kB | 新增（路由懒加载） |
| `skill-editor-*.js` | 未拆分（在主包内） | 983.94 kB | 新增（仅编辑时加载） |
| `transformers-*.js` | 1,391.24 kB | 1,391.24 kB | 持平（语义模型，仍按需） |
| `discover-*.js` | 73.75 kB | 81.03 kB | +7 kB（新增口令与收藏 UI） |
| 启动加载合计 | 1,978 kB | 约 890 kB | **-55%** |

## 三、打包与发版

- [ ] `npm run package:win`（输出到 `release-120`，避免默认 `release/` 句柄占用）
- [ ] `git commit` + `git push`（git/curl 常被网关拦截，改用 `gh` CLI 通道）
- [ ] `gh release create v1.2.0 --target <完整 40 位 SHA>`（短 SHA 会 422）
- [ ] 上传资产：`SkillVault-Setup-1.2.0.exe`、`.blockmap`、`latest.yml`（缺 latest.yml 则自动更新失效）
- [ ] `gh release view v1.2.0` 核对三资产

## 四、发布后验证

- [ ] 本机安装并启动，确认版本号 1.2.0
- [ ] 列表卡片「复制口令」→ 粘到对话可读取，且不触发进详情
- [ ] 详情页切换 Agent → 口令同步变化；四个安装入口均可用
- [ ] 详情页收藏 → 重启后仍在
- [ ] 进入编辑 → CodeMirror 正常加载
- [ ] 应用内自动更新能检测到 v1.2.0（依赖 latest.yml）

## 五、回滚

- 回滚方式：重新发布上一版本 tag（v1.1.0）安装包；数据库无需迁移（收藏沿用既有表，键带 `market:` 前缀，旧版本读取时会被忽略，不会报错）
- 影响面：收藏数据仅在新版本可见，回滚后旧版本不受影响

## 六、遗留项

- README 截图仍为 v1.1.0 实拍（收藏按钮、三通道面板未入镜），下一版刷新
- Zip 链接按 `main` 默认分支推断，非 main 仓库会 404
- 深链协议 `skillvault://` 待 v1.3
