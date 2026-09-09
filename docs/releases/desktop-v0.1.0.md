# SkillVault v0.1.0

**本地优先的 Agent Skill 管理工具 · Local-first skill manager for AI coding agents**

首个公开版本。采用莫兰迪色系主题，保留 Skillbox 的母本目录 + 符号链接适配机制，完全离线可用。

> 本版本由 [Skillbox](https://github.com/Renly1994/Skillbox) 复刻而来，已剥离在线 Skill 市场，仅保留本地 skill 的扫描、适配、编辑与迁移能力。

---

## 新增

- **SkillVault 品牌与莫兰迪主题**：全新图标与配色（默认暗色墨蓝，亮色浅灰绿回退）
- **本地优先**：一套母本 `~/.agents/skills`，通过符号链接/目录联接适配到各 Agent
- **42 个 Agent 检测**：自动识别本机已安装的 Agent，仅显示可用项
- **Skill 编辑**：内置 CodeMirror 的 SKILL.md 编辑器
- **迁移包**：`.skillvault` 导入导出，保留 Agent 启用关系
- **锁文件更新**：按来源锁文件从上游更新技能

## 移除

- **在线 Skill 市场**：skills.sh 搜索、热门、远程安装、登录/发布链路已全部移除

## 变化

- 数据目录由 `~/.skillsgate` 调整为 `~/.skillvault`
- 迁移包扩展名由 `.skillbox` 调整为 `.skillvault`

---

下载见仓库首页 [Releases](/releases/latest)。支持 Windows / macOS / Linux。
