# tasks · refine-tool-cursor

## 分析

- [x] 对照 Draw 类应用：绘制用十字、选择用箭头、橡皮用圆环
- [x] 确认不隐藏系统箭头

## 实现

- [x] Shell 按当前工具给指示器加 `is-cross`
- [x] 鼠标指示器支持 `+`，保留系统箭头
- [x] 手写笔指示器支持 `+`，落笔加粗
- [x] 选择 / 平移 / 橡皮仍用圆环 / 圆点

## 验证

- [x] 回归：绘图工具出 `+`，选择工具回圆环
- [x] 断言 `cursor` 不为 `none`
- [x] `openspec validate --all` 通过

## 归档

- [x] 同步 `openspec/specs/pen-first-ui/spec.md`
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-refine-tool-cursor/`
- [ ] 提交说明引用 `refine-tool-cursor`
