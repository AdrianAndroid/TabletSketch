# Proposal · add-stable-code-signing

## Why

`Build/TabletSketch.app` 目前完全不签名（`Scripts/make-app.sh` 手工组装后直接使用）。这带来两个现实问题：

1. **TCC 授权每次重建都失效**。HID 采集依赖「输入监控」授权，授权按签名身份匹配；未签名/ad-hoc 的 App 每次重新组装都会被系统当成新程序，用户得重新授权一次。
2. **装到 `/Applications` 后无法区分版本**。没有可校验的稳定 designated requirement，出问题时分不清跑的是哪次构建。

主项目 `MacAppControlDeck` 已经用固定自签身份 `MacAppControlDeck Self-Signed` 解决了同一个问题，TabletSketch 沿用同一套做法即可，不需要新建证书。

## What Changes

- 新增 `Scripts/sign-app.sh`：用固定身份签名、校验签名完整性、断言 designated requirement 不是纯 `cdhash`。
- 新增 `Scripts/install-local.sh`：签名 → 退出旧实例 → 覆盖安装到 `/Applications/TabletSketch.app` → 校验安装后的 DR → 重新启动。
- `Scripts/make-app.sh` 末尾提示改用 `install-local.sh`，不再鼓励直接 `open Build/...`。
- `README.md` 的构建段落补签名与安装步骤。
- `AGENTS.md` 新增 R10：固定签名身份、禁止 ad-hoc、改签名必须另立变更。

## Capabilities

无能力行为变化。签名与安装路径变化，运行行为不变。

## Impact

- Bundle ID 不变（`com.zhaojian.tabletsketch`），TCC 授权在固定身份下可长期复用。
- 首次用新身份签名后需要重新授权一次「输入监控」，之后重建不用再授权。
- `/Applications/TabletSketch.app` 成为本机日常使用版本，`Build/TabletSketch.app` 只作产物。

## 非目标

- 不做公证（notarization）、不申请开发者账号、不做 App Store 分发。
- 不启用 hardened runtime（启用后 Electron 需要额外 entitlements，本机自用没必要）。
- 不改 Bundle ID、不改 `make-app.sh` 的组装逻辑。
- 不引入 Sparkle 自动更新。
