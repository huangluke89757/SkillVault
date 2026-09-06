# skillvault-app

SkillVault 桌面端的轻量 npm 安装入口。它会识别当前操作系统和 CPU 架构，从官方 GitHub Release 下载并校验对应安装包。

```bash
npx skillvault-app
```

仅下载安装包，不自动打开：

```bash
npx skillvault-app download
```

指定下载目录：

```bash
npx skillvault-app download --output ./downloads
```

支持 Windows x64、macOS Apple 芯片、macOS Intel 和 Linux x64。完整项目与源码见 [huangluke89757/SkillVault](https://github.com/huangluke89757/SkillVault)。
