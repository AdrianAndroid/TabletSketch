# sketch-document 变更（bootstrap-tablet-sketch）

## ADDED Requirements

### Requirement: 离线 Excalidraw 画布

TabletSketch SHALL 使用本地打包的 Excalidraw 0.18.1 资源，不依赖网络。

#### Scenario: 启动加载

- **WHEN** 应用打开画板窗口
- **THEN** MUST 从本地 `Resources/Sketch` 加载 `index.html` 与静态资源
- **AND** MUST NOT 请求 Excalidraw CDN、云服务、协作后端
- **AND** 素材库、字体、图标 MUST 离线可用

#### Scenario: 网络断开

- **WHEN** 设备完全断网
- **THEN** 画布 MUST 正常打开、绘制、保存、导出
- **AND** 不得出现空白页或资源 404

### Requirement: 多画布文档

应用 SHALL 支持多个独立画布，并以 `.excalidraw` 保存场景。

#### Scenario: 新建画布

- **WHEN** 用户新建画布
- **THEN** MUST 创建一个空白 `.excalidraw`
- **AND** MUST 在 `index.json` 增加元信息
- **AND** 新画布 MUST 成为当前画布

#### Scenario: 切换画布

- **WHEN** 用户切换画布
- **THEN** 当前画布 MUST 先落盘
- **AND** 目标画布 MUST 加载自己的场景与视口
- **AND** 切换失败 MUST 恢复原画布并提示

#### Scenario: 重命名

- **WHEN** 用户重命名画布
- **THEN** `index.json` 的标题 MUST 更新
- **AND** 空标题 MUST 被拒绝
- **AND** 文件名/ID MUST NOT 因重命名而变化

#### Scenario: 删除

- **WHEN** 用户删除画布
- **THEN** 必须二次确认
- **AND** 删除后 MUST 选中相邻画布或新建空白画布
- **AND** 不得删除最后一个画布导致应用无画布可用

### Requirement: 默认路径与原子写入

应用 SHALL 使用独立目录保存文档，并以原子方式写入。

#### Scenario: 默认目录

- **WHEN** 首次启动
- **THEN** 画布目录 MUST 为 `~/Pictures/TabletSketch/Sketches`
- **AND** 草稿目录 MUST 为 `~/Library/Application Support/TabletSketch`
- **AND** 不得写入 `~/Pictures/MacAppControlDeck`

#### Scenario: 自动保存

- **WHEN** 场景发生变化
- **THEN** 应用 MUST 在约 1 秒防抖后保存
- **AND** 关闭窗口或切换画布时 MUST 立即 flush
- **AND** 保存失败 MUST 提示，不得静默丢数据

#### Scenario: 原子替换

- **WHEN** 写入 `.excalidraw`
- **THEN** MUST 先写临时文件，再原子替换
- **AND** 写入失败 MUST 保留旧文件
- **AND** 不得覆盖用户原文件

### Requirement: 草稿恢复

应用 SHALL 在异常退出后恢复最近草稿。

#### Scenario: 崩溃恢复

- **WHEN** 应用上次异常退出且存在草稿
- **THEN** 下次启动 MUST 提示恢复
- **AND** 用户可选择恢复或丢弃
- **AND** 恢复不得覆盖已有正式画布

### Requirement: 导入与互操作

应用 SHALL 支持打开现有 `.excalidraw` 文件，并与主项目格式兼容。

#### Scenario: 打开主项目草图

- **WHEN** 用户选择一个 `MacAppControlDeck` 的 `.excalidraw`
- **THEN** 应用 MUST 先复制到 TabletSketch 目录
- **AND** 只编辑副本
- **AND** 不得直接写回主项目目录

#### Scenario: 格式兼容

- **WHEN** 导出 `.excalidraw`
- **THEN** MUST 保持 Excalidraw 0.18 场景结构
- **AND** 主项目 UI 草图 SHOULD 能重新打开
- **AND** 图片二进制未内嵌时 MUST 在 JSON 中提示

### Requirement: 导出与剪贴板

应用 SHALL 支持 PNG/JSON 导出和剪贴板复制。

#### Scenario: 复制 PNG

- **WHEN** 用户复制画板或选中内容
- **THEN** 有选中时 MUST 只复制选中
- **AND** 无选中时 MUST 复制整板
- **AND** 剪贴板 MUST 包含 PNG

#### Scenario: 复制 JSON

- **WHEN** 用户复制 JSON
- **THEN** MUST 输出带 `isDiagram` / `ai.kind=diagram` 说明的场景 JSON
- **AND** MUST 包含元素、文本摘要、边界
- **AND** 含图片时 MUST 提示不包含二进制

#### Scenario: 保存文件

- **WHEN** 用户保存
- **THEN** MUST 生成同名 PNG 与 `.excalidraw`
- **AND** 默认目录为 `~/Pictures/TabletSketch/Sketches`
- **AND** 文件名不得覆盖已有文件，除非用户确认

### Requirement: 素材库

应用 SHALL 离线提供现有 16 组 Excalidraw 素材库。

#### Scenario: 首次载入

- **WHEN** 用户首次打开「精选素材」
- **THEN** MUST 从本地资源载入 16 组素材
- **AND** 不得请求 `libraries.excalidraw.com`
- **AND** 载入后 MUST 可在 Excalidraw 素材库侧栏使用

#### Scenario: 重复载入

- **WHEN** 用户再次载入已载入的素材组
- **THEN** MUST 去重，不重复插入
- **AND** 提示「已在素材库中」
