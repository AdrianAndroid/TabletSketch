# app-icon

## Purpose

让 TabletSketch 在 Dock、Finder 与 ⌘Tab 里拥有自己的身份，不再是 Electron 默认图标。图标由项目内脚本生成，可重复、可审阅。

## Requirements

### Requirement: 应用图标

TabletSketch SHALL 使用自有图标，不得使用 Electron 默认图标。

#### Scenario: Dock 与 Finder

- **WHEN** 应用启动或出现在 Finder 中
- **THEN** MUST 显示 TabletSketch 自有图标
- **AND** MUST NOT 显示 Electron 默认图标

#### Scenario: 尺寸完整

- **WHEN** 系统请求 16 / 32 / 64 / 128 / 256 / 512 / 1024
- **THEN** `.icns` MUST 包含对应尺寸
- **AND** 小尺寸 MUST 仍能辨认出「笔迹 + 笔」的剪影

#### Scenario: 视觉一致

- **WHEN** 图标渲染
- **THEN** 主色 MUST 与应用内 `--ts-accent` 一致
- **AND** MUST 不使用文字或字母缩写

#### Scenario: 可重复生成

- **WHEN** 需要修改图标
- **THEN** MUST 通过 `Tools/make-icon.swift` 重新生成
- **AND** MUST NOT 手工编辑 `Resources/AppIcon.icns`
