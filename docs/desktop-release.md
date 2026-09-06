# SkillVault 桌面端发布

桌面端安装包由 GitHub Actions 在对应操作系统中构建，不需要本地准备 Mac。

## 测试构建

在仓库的 `Actions` 页面打开 `Build and Publish Desktop App`，点击 `Run workflow`。完成后可在该次任务的 `Artifacts` 中下载：

- `desktop-mac-apple-silicon`：Apple 芯片 Mac，包含 DMG 和 ZIP
- `desktop-mac-intel`：Intel 芯片 Mac，包含 DMG 和 ZIP
- `desktop-windows`：Windows 安装包
- `desktop-linux`：Linux 安装包

手动运行只生成测试产物，不创建 GitHub Release。

## 正式发布

先确保 `apps/desktop/package.json` 的版本号正确，再推送同版本 Tag：

```bash
git tag desktop-v0.6.1
git push origin desktop-v0.6.1
```

工作流会校验 Tag 与应用版本是否一致，随后构建全部平台并创建 GitHub Release。macOS 安装包名称包含 `arm64` 或 `x64`，用户可以直接区分 Apple 芯片和 Intel 芯片版本。

## macOS 签名与公证

没有 Apple 凭据时，工作流会生成未签名、未公证的 DMG 和 ZIP。公开发布此类安装包时，必须在 Release 与 README 中说明首次安装方法和安全风险。配置完整凭据后，工作流会自动签名并公证。

首次配置时，需要有效的 Apple Developer Program 会员资格，并创建 `Developer ID Application` 证书。将证书和私钥导出为带密码的 P12 文件，再在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中配置：

- `CSC_LINK`：Developer ID Application 证书 P12 文件的 Base64 内容
- `CSC_KEY_PASSWORD`：P12 证书密码
- `APPLE_ID`：Apple 开发者账号
- `APPLE_APP_SPECIFIC_PASSWORD`：App 专用密码
- `APPLE_TEAM_ID`：Apple Developer Team ID

不要把证书、私钥或密码提交到仓库。凭据完整时，构建会使用 `codesign`、Gatekeeper 和 `stapler` 验证产物。

配置完成后，先通过 `workflow_dispatch` 运行一次测试构建并检查两个 macOS Job 的验证结果，再推送正式版本 Tag。
