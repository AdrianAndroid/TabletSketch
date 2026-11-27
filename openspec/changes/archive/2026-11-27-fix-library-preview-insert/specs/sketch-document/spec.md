# sketch-document · delta（fix-library-preview-insert）

## MODIFIED Requirements

### Requirement: 素材库

应用 SHALL 离线提供现有 16 组 Excalidraw 素材库，并在面板中显示可辨认的预览。

#### Scenario: 首次载入

- **WHEN** 用户首次打开「精选素材」
- **THEN** MUST 从本地资源载入 16 组素材
- **AND** 不得请求 `libraries.excalidraw.com`
- **AND** 载入后 MUST 可在 Excalidraw 素材库侧栏使用

#### Scenario: 重复载入

- **WHEN** 用户再次载入已载入的素材组
- **THEN** MUST 去重，不重复插入
- **AND** 提示「已在素材库中」

#### Scenario: 缩略图

- **WHEN** 用户打开某个素材库的详情
- **THEN** 每个素材项 MUST 显示基于自身 `elements` 渲染的缩略图
- **AND** 缩略图 MUST 离线生成，不得请求网络
- **AND** 渲染失败时 MUST 显示可读的失败提示，不得留空白

#### Scenario: 点击插入

- **WHEN** 用户点击素材项
- **THEN** 素材 MUST 直接贴到当前画布中心
- **AND** 插入后 MUST 处于选中态
- **AND** MUST 不依赖 Excalidraw 素材侧栏是否已合并
- **AND** 插入失败时 MUST 提示，不得静默无反应
