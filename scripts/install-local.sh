#!/usr/bin/env bash
# 发版后把本机 SkillVault 同步升级到最新版（原地覆盖 D:\SkillVault）
# 用法：bash scripts/install-local.sh 1.2.0
set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "用法: bash scripts/install-local.sh <版本号，如 1.2.0>"
  exit 1
fi

VERSION_NUM="$(echo "$VERSION" | tr -d '.vV')"
INSTALLER="apps/desktop/release-${VERSION_NUM}/SkillVault-Setup-${VERSION}.exe"
TARGET="D:\\SkillVault"

if [ ! -f "$INSTALLER" ]; then
  echo "找不到安装包: $INSTALLER（先跑 npm run package:win）"
  exit 1
fi

# 应用正在运行会占用文件，先退出
if tasklist 2>/dev/null | grep -qi "skillvault.exe"; then
  echo "检测到 SkillVault 正在运行，先退出…"
  taskkill //F //IM SkillVault.exe >/dev/null 2>&1 || true
  sleep 2
fi

echo "安装 $INSTALLER → $TARGET"
"$INSTALLER" /S "/D=${TARGET}"

echo "校验："
grep -c "$VERSION" "${TARGET}/resources/app.asar" || true
