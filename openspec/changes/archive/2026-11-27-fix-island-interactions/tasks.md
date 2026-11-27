# tasks · fix-island-interactions

## 复现

- [x] 新增离屏回归 `Tools/ui-test/main.js`
- [x] 复现手柄被读数板遮挡
- [x] 复现面板被 `.ts-scrim` 盖住
- [x] 复现「选」格无法切换（`TOOL_MAP` 查表失败）

## 修复

- [x] `setTool` 改为合法工具集合校验，删除 `TOOL_MAP`
- [x] 浮岛 `z-index: 62`、面板 `64`，高于遮罩 60
- [x] 读数板与 chip 移到浮岛对侧
- [x] 面板打开时浮岛仍可点

## 验证

- [x] 回归全绿（手柄命中、拖动换边、面板可点、11 个工具生效）
- [ ] 重新打包，鼠标手动点一遍
- [x] `openspec validate --all` 通过

## 归档

- [x] 同步 `openspec/specs/pen-first-ui/spec.md`
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-fix-island-interactions/`
- [ ] 提交说明引用 `fix-island-interactions`
