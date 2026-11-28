#!/bin/bash
# 用固定身份给 Build/TabletSketch.app 签名，并校验 designated requirement。
# 用法：Scripts/sign-app.sh [app 路径]
#
# 规则：
# - 默认身份 MacAppControlDeck Self-Signed（与主项目同一张本机自签证书）。
# - 找不到证书直接失败，禁止静默降级为 ad-hoc，否则每次重建 TCC 授权都会失效。
# - 只有显式 TS_ALLOW_ADHOC=1 才允许 ad-hoc，且会打印警告。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/Build/TabletSketch.app}"
IDENTITY="${TS_SIGN_IDENTITY:-MacAppControlDeck Self-Signed}"

[ -d "$APP" ] || { echo "错误：App 不存在：$APP"; exit 1; }

if [[ "${TS_ALLOW_ADHOC:-0}" == "1" ]]; then
  echo "警告：TS_ALLOW_ADHOC=1，本次使用 ad-hoc 签名，会重置 TCC 授权。"
  SIGN_ID="-"
else
  security find-identity -v -p codesigning 2>/dev/null | grep -Fq "\"$IDENTITY\"" || {
    echo "错误：找不到签名身份：$IDENTITY"
    echo "本机安装禁止降级为 ad-hoc。请确认钥匙串里存在该证书，"
    echo "或临时指定 TS_SIGN_IDENTITY=\"其他身份\"。"
    exit 1
  }
  SIGN_ID="$IDENTITY"
fi

echo "签名身份：${SIGN_ID}"

# Electron 里 Framework 内部还有 Helpers/app_shim_loader、Libraries 等嵌套 Mach-O，
# 逐个手写顺序容易漏，这里用 --deep 让 codesign 自己从内到外处理。
#
# 但 --deep 只覆盖标准代码位置（Contents/MacOS、Frameworks、Helpers…），
# Contents/Resources/app/bin/ 不在其列，会被静默跳过。里面的 tablet-sketch-hid
# 是真正去 seize 设备的进程，未签名时系统拒绝授予「输入监控」，
# 表现为：笔只读可用，板载键全部失效（kIOReturnNotPermitted）。先显式签它。
while IFS= read -r -d '' nested; do
  case "$(file -b "$nested" 2>/dev/null)" in
    Mach-O*) ;;
    *) continue ;;
  esac
  echo "签名包内二进制：${nested#"$APP"/}"
  codesign --force --timestamp=none --sign "$SIGN_ID" "$nested"
done < <(find "$APP/Contents/Resources" -type f -perm -111 -print0 2>/dev/null)

codesign --force --deep --timestamp=none --sign "$SIGN_ID" "$APP"

echo "校验签名完整性…"
codesign --verify --deep --strict --verbose=1 "$APP"

echo "校验 designated requirement…"
DR="$(codesign -d --requirements - "$APP" 2>&1 || true)"
if printf '%s' "$DR" | grep -q 'cdhash' && ! printf '%s' "$DR" | grep -Eq 'certificate root|certificate leaf|anchor apple'; then
  echo "错误：designated requirement 是纯 cdhash（ad-hoc），重建会重置 TCC 授权。"
  printf '%s\n' "$DR"
  exit 1
fi
if ! printf '%s' "$DR" | grep -Eq 'certificate root|certificate leaf|anchor apple'; then
  echo "错误：designated requirement 不是稳定证书身份。"
  printf '%s\n' "$DR"
  exit 1
fi
printf '%s\n' "$DR" | sed -n 's/^designated => /  designated => /p'

# 采集器必须真的签上：它是 seize 设备的进程，未签名时输入监控授权不生效
HID="$APP/Contents/Resources/app/bin/tablet-sketch-hid"
if [ -f "$HID" ]; then
  if ! codesign --verify --strict "$HID" 2>/dev/null; then
    echo "错误：$HID 未签名，输入监控授权会失效（板载键将不可用）。"
    exit 1
  fi
  echo "采集器签名校验通过"
fi

echo "签名完成：$APP"
