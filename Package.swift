// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TabletSketch",
    platforms: [.macOS(.v14)],
    products: [
        // 只读 HID 采集器：输出逐行 JSON，供 Electron 主进程 spawn。
        .executable(name: "tablet-sketch-hid", targets: ["TabletSketchHID"]),
        .library(name: "TabletSketchCore", targets: ["TabletSketchCore"])
    ],
    targets: [
        .target(
            name: "TabletSketchCore",
            path: "Sources/TabletSketchCore"
        ),
        .executableTarget(
            name: "TabletSketchHID",
            dependencies: ["TabletSketchCore"],
            path: "Sources/TabletSketchHID",
            linkerSettings: [
                .linkedFramework("IOKit"),
                .linkedFramework("CoreGraphics")
            ]
        ),
        .testTarget(
            name: "TabletSketchCoreTests",
            dependencies: ["TabletSketchCore"],
            path: "Tests/TabletSketchCoreTests"
        )
    ]
)
