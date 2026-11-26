# UI 草图多画布

## 数据位置

```
~/Library/Application Support/MacAppControlDeck/Sketch/
├── draft.excalidraw                 # 旧版单画布草稿，仅用于首次迁移
└── Boards/
    ├── index.json                   # 画布元信息
    ├── <uuid>.excalidraw            # 每张画布的完整场景
    └── index.corrupt-<timestamp>.json  # 索引损坏时的现场备份
```

`index.json` 字段：

```json
[
  {
    "id": "uuid",
    "title": "画布 1",
    "createdAt": "2026-11-20T15:29:05Z",
    "modifiedAt": "2026-11-20T15:34:48Z",
    "elementCount": 5
  }
]
```

当前画布 ID 存放在 `UserDefaults` 的 `sketch.activeBoardID`，关闭窗口后再次打开会恢复上次画布。

## 交互

- 左上角 `☰` 下方是「画布 N」按钮，点击展开列表。
- 列表显示标题、元素数、相对修改时间；当前画布高亮并显示勾选。
- 「新建画布」创建空白画布并立即切换。
- 行内铅笔图标进入重命名，回车或 ✓ 保存，Esc 取消。
- 行内垃圾桶进入删除确认；删除当前画布后自动切到相邻画布。
- 删除最后一张画布时自动创建一张新的空白「画布 1」，不会出现零画布。

## 切换流程

1. Web 取当前 `getScene()`，连同目标画布 ID 发给原生。
2. 原生把当前场景写入 active 画布，选中目标画布。
3. 原生回传 `activeBoard`、画布列表和目标场景。
4. Web 更新列表、加载场景、清空 history；切换期间显示 180ms 柔和遮罩与 spinner。
5. 每张画布保存自己的 `scrollX` / `scrollY` / `zoom`，切回时恢复视口；新空白画布默认 100%。

## 兼容

- 首次启动且没有 `index.json` 时，旧 `draft.excalidraw` 作为「画布 1」导入，成功后清除旧草稿。
- 「最近草图」打开文件时会新建一张以文件名为标题的画布，不再覆盖当前画布。
- 保存 PNG / `.excalidraw` 仍导出当前画布，复制图片和复制 JSON 也只作用于当前画布。
