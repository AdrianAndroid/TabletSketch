## ADDED Requirements

### Requirement: 逐图元样式类别可勾选显隐

设置面板 SHALL 提供「图形样式」页，按 Excalidraw 图元类型列出可显示的样式类别，用户以勾选方式控制显隐；配置存于 `layout.v2` 的 `shapeStyles`，并对左岛与笔键 1 样式环同时生效。

#### Scenario: 勾选显隐
- WHEN 用户在某图元下勾选或取消一个样式类别
- THEN 配置 SHALL 即时保存并广播
- AND 左岛与笔键 1 样式环 SHALL 在下一次构建时反映该显隐

#### Scenario: 配置缺失或损坏
- WHEN `shapeStyles` 缺失、含未知图元或未知样式类别
- THEN 校验 SHALL 回落对应的内置默认映射
- AND 设置面板与样式环 SHALL 正常工作
