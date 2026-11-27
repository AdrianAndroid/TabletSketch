# tasks · unify-virtual-pen-cursor

## 分析

- [x] 确认应用只服务手写板，鼠标是带动虚拟笔的上层输入
- [x] 确认删除鼠标专属小圆点

## 实现

- [x] Shell 用单一 `cursor` state 接收笔与鼠标位置
- [x] 删除 `.ts-mouse-dot` 渲染与样式
- [x] 指示器按工具切换 `+` / 圆环，落笔变化
- [x] 系统箭头保留，右键仍模拟侧键 1

## 验证

- [x] 鼠标移动时指示器跟随
- [x] 绘图工具 `+`、选择工具圆环
- [x] 鼠标移出隐藏、移入恢复
- [x] `cursor` 不为 `none`
- [x] 回归全绿

## 归档

- [x] 同步 `openspec/specs/pen-input`、`pen-first-ui`
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-unify-virtual-pen-cursor/`
- [ ] 提交说明引用 `unify-virtual-pen-cursor`
