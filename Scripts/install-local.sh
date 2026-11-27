#!/bin/bash
# 签名并覆盖安装到 /Applications/TabletSketch.app，然后重新启动。
# 用法：Scripts/install-local.sh
# 前置：swift build -c release、Web/sketch npm run build、Scripts/make-app.sh 已跑过。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/Build/TabletSketch.app"
DEST="/Applications/TabletSketch.app"

[ -d "$APP" ] || { echo "错误：没有构建产物，先跑 Scripts/make-app.sh"; exit 1; }

"$ROOT/Scripts/sign-app.sh" "$APP"

echo "退出正在运行的实例…"
osascript -e 'tell application "TabletSketch" to quit' >/dev/null 2>&1 || true
sleep 1
pkill -f "$DEST/Contents/MacOS/TabletSketch" 2>/dev/null || true
pkill -f "$APP/Contents/MacOS/TabletSketch" 2>/dev/null || true
pkill -f "tablet-sketch-hid" 2>/dev/null || true
sleep 1

echo "覆盖安装到 $DEST"
rm -rf "$DEST"
ditto "$APP" "$DEST"

echo "校验安装后的签名…"
codesign --verify --deep --strict --verbose=1 "$DEST"
DR="$(codesign -d --requirements - "$DEST" 2>&1 || true)"
printf '%s\n' "$DR" | sed -n 's/^designated => /  designated => /p'
if printf '%s' "$DR" | grep -q 'cdhash' && ! printf '%s' "$DR" | grep -Eq 'certificate root|certificate leaf|anchor apple'; then
  echo "错误：安装后的 App 是 ad-hoc 签名，TCC 会失效。"
  exit 1
fi

echo "启动…"
open "$DEST"
echo "完成：$DEST"
