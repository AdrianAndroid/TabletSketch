# tasks · add-stable-code-signing

- [x] 新增 `Scripts/sign-app.sh`：固定身份、由内到外重签 Framework/Helper/App、校验完整性、断言 DR 非 cdhash
- [x] 新增 `Scripts/install-local.sh`：签名 → 退旧实例 → 覆盖安装 → 校验安装后 DR → 启动
- [x] `Scripts/make-app.sh` 结尾提示改用 `install-local.sh`
- [x] `README.md` 构建段落补签名与安装步骤
- [x] `AGENTS.md` 新增 R10 固定签名规则
- [x] 构建并签名 `Build/TabletSketch.app`
- [x] 覆盖安装到 `/Applications/TabletSketch.app` 并校验 DR
- [x] 启动验证：窗口、HID 子进程、板子连接状态正常
- [x] 提交并推送
