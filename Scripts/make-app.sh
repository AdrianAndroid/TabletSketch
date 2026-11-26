#!/bin/bash
# 组装一个可双击运行的 TabletSketch.app（未签名，本地用）。
# 用法：Scripts/make-app.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/Build/TabletSketch.app"
SRC_ELECTRON="$ROOT/Web/app/node_modules/electron/dist/Electron.app"
BIN="$ROOT/.build/release/tablet-sketch-hid"

[ -d "$SRC_ELECTRON" ] || { echo "缺少 Electron 运行时，先在 Web/app 跑 npm install"; exit 1; }
[ -x "$BIN" ] || { echo "缺少 HID 二进制，先跑 swift build -c release"; exit 1; }
[ -f "$ROOT/Resources/Sketch/index.html" ] || { echo "缺少前端产物，先在 Web/sketch 跑 npm run build"; exit 1; }

rm -rf "$APP"
mkdir -p "$ROOT/Build"
cp -R "$SRC_ELECTRON" "$APP"

# 改名，避免和系统里的 Electron 冲突
mv "$APP/Contents/MacOS/Electron" "$APP/Contents/MacOS/TabletSketch"
/usr/libexec/PlistBuddy -c "Set :CFBundleName TabletSketch" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName TabletSketch" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.zhaojian.tabletsketch" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable TabletSketch" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :NSHumanReadableCopyright string Copyright © 2026" "$APP/Contents/Info.plist" 2>/dev/null || true

# 应用本体：主进程脚本 + 前端产物 + HID 二进制
RES="$APP/Contents/Resources/app"
mkdir -p "$RES/bin"
cp "$ROOT/Web/app/main.js" "$ROOT/Web/app/preload.js" "$ROOT/Web/app/hid-bridge.js" "$RES/"
cp "$ROOT/Web/app/package.json" "$RES/"
cp -R "$ROOT/Resources/Sketch" "$RES/sketch"
cp "$BIN" "$RES/bin/tablet-sketch-hid"
chmod +x "$RES/bin/tablet-sketch-hid"

# 去掉默认的 Electron 图标资源目录里多余的没用的东西不管，保持原样
echo "前端产物: $(ls -t "$ROOT/Resources/Sketch/assets"/index-*.js | head -1 | xargs basename)"
echo "已生成 $APP"
