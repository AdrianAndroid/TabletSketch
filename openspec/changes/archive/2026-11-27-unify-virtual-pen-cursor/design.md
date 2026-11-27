# design · unify-virtual-pen-cursor

## 1. 一套指示器

```
手写板 hover/pen  ──▶ cursor {x, y, down, source:"pen"}
鼠标 pointermove ──▶ cursor {x, y, down, source:"mouse"}
                          │
                          ▼
                    .ts-pen-cursor（唯一）
                          │
              工具决定形态：+ / 圆环 / 圆圈
```

- 两个来源都只更新同一个 `cursor` state；最后事件决定位置。
- 鼠标移出窗口时，只有 `source === "mouse"` 才隐藏；手写笔仍可保留。
- 笔离开感应区时，只有 `source === "pen"` 才隐藏。

## 2. 形态

| 工具 | 指示器 |
|---|---|
| 自由笔 / 矩形 / 菱形 / 椭圆 / 箭头 / 直线 / 文字 / 图片 | 16pt 十字，落笔 2px |
| 选择 / 平移 | 14pt 空心环，落笔 8pt 实心 |
| 橡皮 | 14pt 空心环（沿用） |

鼠标与笔完全同一套，没有鼠标专属小点。

## 3. 系统箭头

保留系统箭头，只在同一热点叠加指示器。不设置 `cursor: none`，不替换光标。右键继续模拟侧键 1。

## 4. 回归

- 鼠标移动 → `.ts-pen-cursor` 的 transform 跟随 `clientX/Y`
- 矩形工具 → 指示器带 `is-cross`；选择工具 → 恢复圆环
- 页面 `cursor` 计算值不得为 `none`
- 鼠标移出后再移入，指示器恢复
