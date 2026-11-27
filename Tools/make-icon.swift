// make-icon.swift — 用 CoreGraphics 画 TabletSketch 的应用图标。
//
// 唯一事实来源：改图标改这里，不要手改 Resources/AppIcon.icns。
// 用法：
//   swift Tools/make-icon.swift --out /tmp/AppIcon.iconset --variant A
//   swift Tools/make-icon.swift --png /tmp/icon.png --variant A
//
// 设计：深色手写板上，一道压感笔迹正被笔尖压出来。
// 1048 设计坐标系（Big Sur 网格：内容区 824，留白 100），最终按 1024 输出。

import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

// ---------------------------------------------------------------- 调色

func cg(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let r = CGFloat((hex >> 16) & 0xff) / 255
    let g = CGFloat((hex >> 8) & 0xff) / 255
    let b = CGFloat(hex & 0xff) / 255
    return CGColor(colorSpace: space, components: [r, g, b, alpha])!
}

struct Palette {
    let bgTop: CGColor
    let bgBottom: CGColor
    let traceStart: CGColor
    let traceEnd: CGColor
    let shaftDark: CGColor
    let shaftLight: CGColor
    let tip: CGColor
    let accent: CGColor
    let glow: CGFloat
}

func palette(_ name: String) -> Palette {
    switch name.uppercased() {
    case "B":
        // 纸白底 · 墨蓝笔迹
        return Palette(
            bgTop: cg(0xFFFFFF),
            bgBottom: cg(0xE7ECF3),
            traceStart: cg(0x1B2A45),
            traceEnd: cg(0x2F6FD0),
            shaftDark: cg(0x8C98AA),
            shaftLight: cg(0xFFFFFF),
            tip: cg(0x2A2F3A),
            accent: cg(0x0A84FF),
            glow: 0.35
        )
    case "C":
        // 主色渐变底 · 白笔迹白笔
        return Palette(
            bgTop: cg(0x2C7DFF),
            bgBottom: cg(0x0A3FB0),
            traceStart: cg(0xFFFFFF),
            traceEnd: cg(0xD6ECFF),
            shaftDark: cg(0x9FB6D6),
            shaftLight: cg(0xFFFFFF),
            tip: cg(0x16233A),
            accent: cg(0xFFFFFF),
            glow: 0.22
        )
    default:
        // A：深墨蓝底 · 白笔迹 · 银笔蓝环
        return Palette(
            bgTop: cg(0x1B2A45),
            bgBottom: cg(0x0A1120),
            traceStart: cg(0xFFFFFF),
            traceEnd: cg(0x8FD0FF),
            shaftDark: cg(0x2B3240),
            shaftLight: cg(0x7C8798),
            tip: cg(0x2A2F3A),
            accent: cg(0x0A84FF),
            glow: 0.16
        )
    }
}

// ---------------------------------------------------------------- 几何

func mix(_ a: CGColor, _ b: CGColor, _ t: CGFloat) -> CGColor {
    let ca = a.components ?? [0, 0, 0, 1]
    let cb = b.components ?? [0, 0, 0, 1]
    let n = min(ca.count, cb.count)
    var out = [CGFloat](repeating: 0, count: n)
    for i in 0..<n { out[i] = ca[i] + (cb[i] - ca[i]) * t }
    return CGColor(colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, components: out)!
}

/// 通过给定点的 Catmull-Rom 采样。
func spline(_ points: [CGPoint], perSegment: Int) -> [CGPoint] {
    var out: [CGPoint] = []
    let n = points.count
    guard n >= 2 else { return points }
    for i in 0..<(n - 1) {
        let p0 = points[max(i - 1, 0)]
        let p1 = points[i]
        let p2 = points[i + 1]
        let p3 = points[min(i + 2, n - 1)]
        for s in 0..<perSegment {
            let t = CGFloat(s) / CGFloat(perSegment)
            let t2 = t * t
            let t3 = t2 * t
            let x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t
                + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
                + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
            let y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t
                + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
                + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
            out.append(CGPoint(x: x, y: y))
        }
    }
    out.append(points[n - 1])
    return out
}

/// 压感宽度：14 → 50 → 42 → 26 → 14。
func traceWidth(_ t: CGFloat) -> CGFloat {
    let keys: [(CGFloat, CGFloat)] = [(0, 15), (0.22, 60), (0.55, 46), (0.8, 26), (1, 12)]
    for i in 0..<(keys.count - 1) {
        let (t0, w0) = keys[i]
        let (t1, w1) = keys[i + 1]
        if t >= t0 && t <= t1 {
            let k = (t - t0) / max(t1 - t0, 0.0001)
            return w0 + (w1 - w0) * k
        }
    }
    return keys.last!.1
}

// ---------------------------------------------------------------- 绘制

func drawTrace(_ ctx: CGContext, _ p: Palette) {
    let points = [
        CGPoint(x: 232, y: 598),
        CGPoint(x: 352, y: 520),
        CGPoint(x: 492, y: 556),
        CGPoint(x: 598, y: 474),
        CGPoint(x: 680, y: 445)
    ]
    let sampled = spline(points, perSegment: 90)
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 22,
                  color: cg(0x000000, 0.35))
    for (i, point) in sampled.enumerated() {
        let t = CGFloat(i) / CGFloat(max(sampled.count - 1, 1))
        let w = traceWidth(t)
        ctx.setFillColor(mix(p.traceStart, p.traceEnd, t))
        ctx.fillEllipse(in: CGRect(x: point.x - w / 2, y: point.y - w / 2, width: w, height: w))
    }
    ctx.restoreGState()
}

func drawPen(_ ctx: CGContext, _ p: Palette) {
    let tip = CGPoint(x: 680, y: 445)
    let angle: CGFloat = 32 * .pi / 180
    let tipLength: CGFloat = 44
    let shaftLength: CGFloat = 214
    let half: CGFloat = 24

    ctx.saveGState()
    ctx.translateBy(x: tip.x, y: tip.y)
    ctx.rotate(by: angle)

    // 笔在地板上的软阴影（跟着旋转，但深色底上几乎不可见）
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: -6, height: -10), blur: 26,
                  color: cg(0x000000, 0.45))
    let shaftRect = CGRect(x: tipLength, y: -half, width: shaftLength, height: half * 2)
    ctx.addPath(CGPath(roundedRect: shaftRect, cornerWidth: half, cornerHeight: half, transform: nil))
    ctx.setFillColor(cg(0x20242C))
    ctx.fillPath()
    ctx.restoreGState()

    // 笔尖锥
    let cone = CGMutablePath()
    cone.move(to: CGPoint(x: 0, y: 0))
    cone.addLine(to: CGPoint(x: tipLength, y: -half))
    cone.addLine(to: CGPoint(x: tipLength, y: half))
    cone.closeSubpath()
    ctx.addPath(cone)
    ctx.setFillColor(p.tip)
    ctx.fillPath()
    ctx.setFillColor(p.tip)
    ctx.fillEllipse(in: CGRect(x: -3, y: -3, width: 6, height: 6))

    // 笔杆
    ctx.saveGState()
    ctx.addPath(CGPath(roundedRect: shaftRect, cornerWidth: half, cornerHeight: half, transform: nil))
    ctx.clip()
    let shaftGrad = CGGradient(
        colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
        colors: [p.shaftDark, p.shaftLight, cg(0xF4F7FB), p.shaftLight, p.shaftDark] as CFArray,
        locations: [0, 0.22, 0.5, 0.78, 1]
    )!
    ctx.drawLinearGradient(shaftGrad,
                           start: CGPoint(x: 0, y: -half),
                           end: CGPoint(x: 0, y: half),
                           options: [])

    // 主色环：紧贴笔尖，像真笔上的识别环
    ctx.setFillColor(p.accent)
    ctx.fill(CGRect(x: tipLength + 6, y: -half, width: 14, height: half * 2))
    ctx.restoreGState()

    // 笔尖接触点：一小滴主色，强调「正在出墨」
    ctx.setFillColor(p.accent)
    ctx.fillEllipse(in: CGRect(x: -4, y: -4, width: 8, height: 8))

    ctx.restoreGState()
}

func render(_ size: CGFloat, _ p: Palette) -> CGImage {
    let px = Int(size)
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: nil, width: px, height: px, bitsPerComponent: 8,
                        bytesPerRow: 0, space: space,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setShouldAntialias(true)
    ctx.interpolationQuality = .high
    ctx.scaleBy(x: size / 1024, y: size / 1024)

    let card = CGPath(roundedRect: CGRect(x: 100, y: 100, width: 824, height: 824),
                      cornerWidth: 186, cornerHeight: 186, transform: nil)

    ctx.saveGState()
    ctx.addPath(card)
    ctx.clip()

    let bg = CGGradient(
        colorsSpace: space,
        colors: [p.bgTop, p.bgBottom] as CFArray,
        locations: [0, 1]
    )!
    ctx.drawLinearGradient(bg,
                           start: CGPoint(x: 512, y: 924),
                           end: CGPoint(x: 512, y: 100),
                           options: [])

    let glow = CGGradient(
        colorsSpace: space,
        colors: [cg(0xFFFFFF, p.glow), cg(0xFFFFFF, 0)] as CFArray,
        locations: [0, 1]
    )!
    ctx.drawRadialGradient(glow,
                           startCenter: CGPoint(x: 330, y: 790), startRadius: 0,
                           endCenter: CGPoint(x: 330, y: 790), endRadius: 560,
                           options: [])

    drawTrace(ctx, p)
    drawPen(ctx, p)

    // 内描边：让图标在浅色背景上仍有边界
    ctx.addPath(card)
    ctx.setStrokeColor(cg(0xFFFFFF, 0.10))
    ctx.setLineWidth(2)
    ctx.strokePath()

    ctx.restoreGState()
    return ctx.makeImage()!
}

func writePNG(_ image: CGImage, to url: URL) {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("cannot create \(url.path)")
    }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fatalError("cannot write \(url.path)") }
}

// ---------------------------------------------------------------- 参数

var outDir: URL?
var pngPath: URL?
var variant = "A"

var args = Array(CommandLine.arguments.dropFirst())
while let arg = args.first {
    args.removeFirst()
    switch arg {
    case "--out": outDir = URL(fileURLWithPath: args.removeFirst())
    case "--png": pngPath = URL(fileURLWithPath: args.removeFirst())
    case "--variant": variant = args.removeFirst()
    default:
        FileHandle.standardError.write("unknown argument: \(arg)\n".data(using: .utf8)!)
        exit(2)
    }
}

let paletteSelected = palette(variant)
let master = render(1024, paletteSelected)

if let pngPath {
    writePNG(master, to: pngPath)
    print("wrote \(pngPath.path)")
}

if let outDir {
    try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
    let sizes: [(String, CGFloat)] = [
        ("icon_16x16", 16),
        ("icon_16x16@2x", 32),
        ("icon_32x32", 32),
        ("icon_32x32@2x", 64),
        ("icon_128x128", 128),
        ("icon_128x128@2x", 256),
        ("icon_256x256", 256),
        ("icon_256x256@2x", 512),
        ("icon_512x512", 512),
        ("icon_512x512@2x", 1024)
    ]
    for (name, size) in sizes {
        let image = size >= 1024 ? master : render(size, paletteSelected)
        writePNG(image, to: outDir.appendingPathComponent("\(name).png"))
    }
    print("wrote \(sizes.count) images to \(outDir.path)")
}
