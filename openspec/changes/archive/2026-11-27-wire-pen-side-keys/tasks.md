# tasks · wire-pen-side-keys

- [x] 定位根因：`barrel1/barrel2` 取自从不更新的 `lastKeys`
- [x] `handleDigitizer` 解析 flags bit1/bit2/bit3
- [x] `dflags` 日志补二进制
- [ ] 真机逐键验证：侧键 1 应弹径向菜单，侧键 2 应弹样式气泡
- [ ] 若实测位序不符（例如第二键落在 bit3），回改位掩码并在 `openspec/specs/pen-input` 修正
