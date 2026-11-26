// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TabletSketch",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "TabletSketch", targets: ["TabletSketchApp"]),
        .library(name: "TabletSketchCore", targets: ["TabletSketchCore"])
    ],
    targets: [
        .target(
            name: "TabletSketchCore",
            path: "Sources/TabletSketchCore"
        ),
        .executableTarget(
            name: "TabletSketchApp",
            dependencies: ["TabletSketchCore"],
            path: "Sources/TabletSketchApp",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("WebKit"),
                .linkedFramework("IOKit")
            ]
        ),
        .testTarget(
            name: "TabletSketchCoreTests",
            dependencies: ["TabletSketchCore"],
            path: "Tests/TabletSketchCoreTests"
        )
    ]
)
