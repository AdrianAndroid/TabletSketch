# design · add-app-icon

## 1. 视觉概念

一句能说清的意象：**一块深色手写板上，一道压感笔迹正被笔尖压出来。**

- 深墨蓝底：在浅色与深色 Dock 壁纸下都能立住，也和画布的白纸形成反差。
- 白色笔迹：中段粗、两端细，直接表达「压力控制粗细」这个核心能力。
- 蓝色触控笔 + 主色环：沿用应用内 `--ts-accent: #0a84ff`，保持品牌一致。

不写字、不用字母缩写：小尺寸下文字必然糊。

## 2. 几何

macOS Big Sur 图标网格：1024 画布，内容区 824×824 居中（左右上下各留 100），圆角 186。

| 元素 | 几何 |
|---|---|
| 底板 | 824×824，圆角 186，垂直渐变 `#1B2A45 → #0A1120` |
| 高光 | 左上径向白 10% → 0，半径 520 |
| 笔迹 | Catmull-Rom 经过 5 点，宽度 16 → 52 → 14，白色渐变到 `#8FD0FF` |
| 触控笔 | 笔尖在笔迹右端，笔杆朝右上 40°，笔身 52 宽、330 长，锥形笔尖 70 长 |
| 笔环 | 距笔尖 70pt 的 16pt 蓝色环 |

## 3. 尺寸与产物

```
1024 → icon_512x512@2x.png
 512 → icon_512x512.png
 256 → icon_256x256.png (+@2x)
 128 → icon_128x128.png
  32 → icon_32x32.png (+@2x)
  16 → icon_16x16.png (+@2x)
        ↓ iconutil
Resources/AppIcon.icns
```

- 先以 1024 渲染 PNG，再用 `sips` 等比缩放，避免每尺寸重写绘制逻辑。
- `make-app.sh` 拷贝到 `Contents/Resources/AppIcon.icns`，`CFBundleIconFile=AppIcon`。
- 构建产物 `.icns` 提交进仓库，保证没有 Xcode 也能打包。

## 4. 可重复生成

`Tools/make-icon.swift` 是唯一事实来源：

```bash
swift Tools/make-icon.swift --out /tmp/AppIcon.iconset
iconutil -c icns /tmp/AppIcon.iconset -o Resources/AppIcon.icns
```

变体通过 `--variant A|B|C` 选择，仅用于比较，默认 A。脚本不写死路径，方便 CI 重跑。

## 5. 取舍与限制

- 用圆角矩形近似 Big Sur 的连续曲率圆角，肉眼无差别；不引入第三方 squircle 库。
- 不生成 `Assets.car`，`.icns` 足够让 Finder 与 Dock 正确显示。
- 未签名应用在部分系统上 Dock 图标可能缓存旧图，验收需 `killall Dock` 或重登。
- 小尺寸（16pt）下笔环会消失，只剩笔迹与笔的剪影，这是可接受的降级。
