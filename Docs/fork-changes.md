# fork 改动清单

本文件记录对 `Web/vendor/excalidraw`（Excalidraw 0.18.1，submodule）做的每一处源码改动。
机器可查的标记是代码里的 `// TS-FORK:` 注释，这里是给人看的版本。

规矩：

1. **能不改就不改。** 官方 props（`UIOptions` / `children` / `renderTopRightUI`）能解决的，绝不碰源码。
2. **每处改动必须带 `// TS-FORK:` 注释**，写清为什么改。`grep -rn "TS-FORK" Web/vendor/excalidraw` 就是完整清单。
3. **每处改动在这里登记一行**：文件、改了什么、为什么、对应哪个需求。
4. 改动只提交在 submodule 里，主仓库记录指针；同时 `git format-patch` 导出到 `Docs/patches/` 做兜底。

## 当前状态

基线：`v0.18.1`（commit `a2ec288`）。
**已切到自己的 fork**：`AdrianAndroid/excalidraw`，submodule url 指向 fork，基线 commit 上建专用分支 `tablet-sketch/0.18.1`，tag `v0.18.1` 已补推到 fork；submodule 内另挂 `upstream` remote 指回官方仓库用于同步。
构建暂仍走 npm 包 `@excalidraw/excalidraw@0.18.1`，等首个改源码的需求再切依赖到 submodule。
改动：**暂无**。首个可运行版本不碰源码，用合成 PointerEvent 验证压感链路；
链路通了再按下面的计划改（在 `tablet-sketch/0.18.1` 分支上）。

## 计划中的改动

排序按"对体验影响 / 改动量"的比值，从高到低。

| 编号 | 文件 | 改什么 | 为什么 | 需求 |
|---|---|---|---|---|
| 1 | `packages/excalidraw/components/LayerUI.tsx`、`App.tsx` | 拆掉原生 UI 层：菜单、工具栏、底部条、侧栏、帮助按钮 | 手写板模式下这些全部由浮岛和下拉替代，留着就是"套壳感"的来源 | `pen-first-ui` / 窗口即板面 |
| 2 | `packages/excalidraw/components/ContextMenu.tsx` | 换成径向菜单入口，并把选中元素上下文暴露出来 | 原生右键菜单里没有颜色和线宽，样式必须另开入口 | `pen-first-ui` / 径向菜单 |
| 3 | `packages/excalidraw/components/Actions.tsx` | 删除工具岛，工具切换只走 `setActiveTool` | 工具由浮岛承担 | `pen-first-ui` / 右侧浮岛 |
| 4 | `packages/excalidraw/components/App.tsx` | 加 `pushPenSample(sample)`，笔采样直连绘制链路 | 跳过 DOM 事件层，少一跳；压感与倾斜字段完全可控 | `pen-input` |
| 5 | `packages/excalidraw/element/textWysiwyg.tsx` | 字体、光标色、边框对齐系统输入框 | 文字编辑器是唯一无法原生化的部分，只能靠样式伪装 | `pen-first-ui` / 样式 |
| 6 | `packages/excalidraw/components/Toast.tsx`、`HintViewer.tsx` | 不渲染，改用我们自己的提示 | 网页风格的 toast 一眼露馅 | `pen-first-ui` |

## 已知的上游坑

记录在改源码前发现的行为，避免以后重复踩。

| 位置 | 行为 | 影响 |
|---|---|---|
| `components/App.tsx` `simulatePressure` | `event.pressure === 0.5` 被当作"设备无压感"，改用速度模拟，真实压力被丢弃 | 注入笔事件时压力值必须钳开 0.5 |
| `components/App.tsx` `handleCanvasPointerDown` | 依赖 `setPointerCapture`，非真实 pointerId 会抛 `InvalidPointerId` | 已用 no-op 补丁绕过；改源码时可考虑放宽 |
| `element/textWysiwyg.tsx` | 内联编辑器是独立 DOM 节点，不走画布渲染 | 只能靠 CSS 对齐，无法并入画布 |
