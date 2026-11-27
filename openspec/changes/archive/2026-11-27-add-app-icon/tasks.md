# tasks · add-app-icon

## 设计与确认

- [x] 确定意象：深色手写板 + 压感笔迹 + 触控笔
- [x] 确定尺寸链：16–1024 全尺寸，输出 `.icns`
- [x] 确认自绘，不引入第三方素材

## 绘制

- [x] 新增 `Tools/make-icon.swift`
- [x] 1024 主图：圆角底板、径向高光、压感笔迹、触控笔与笔环
- [x] 支持 `--variant` 生成 A/B/C 三套备选
- [x] 生成 `Resources/AppIcon.icns` 与 `Docs/images/app-icon.png`

## 打包

- [x] `Scripts/make-app.sh` 拷贝 `.icns` 到 `Contents/Resources`
- [x] 设置 `CFBundleIconFile=AppIcon`
- [x] 重新打包后 Dock / Finder / ⌘Tab 显示新图标

## 文档与归档

- [x] README 能力表与预览图
- [x] HANDOFF 记录图标来源与重生成命令
- [x] 新增稳定规格 `openspec/specs/app-icon/spec.md`
- [x] `openspec validate --all` 通过
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-add-app-icon/`
- [ ] 提交说明引用 `add-app-icon`
