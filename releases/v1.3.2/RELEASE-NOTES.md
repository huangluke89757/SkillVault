### 新增：已安装列表「批量调整 Agent 适配」

- 批量操作栏的「适配到 Agent」下拉，升级为「调整适配」对话框
- 按 Agent 汇总所选 Skill 的当前状态：**全部已适配 / 部分 x/y / 未适配**
- 勾选 = 批量启用，取消勾选 = 批量取消；只提交实际改动过的 Agent
- 取消适配只移除该 Agent 下的适配副本，**不删除母本 Skill 文件**；通用目录与共享目录不参与

### 同时可用

- 批量收藏、批量加入集合沿用原有入口，本次核对无回归

### 验证

- 单测：82 passed / 0 failed / 1 skipped
- `electron-vite build` 通过；打包 `SkillVault-Setup-1.3.2.exe`（86.22 MB）
- 对应 Issue #6（已关闭）

完整 PRD：`releases/v1.3.2/PRD.md`