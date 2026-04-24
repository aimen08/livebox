// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LiveBox",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/tylerjonesio/vlckit-spm", from: "3.6.0"),
    ],
    targets: [
        .executableTarget(
            name: "LiveBox",
            dependencies: [
                .product(name: "VLCKitSPM", package: "vlckit-spm"),
            ],
            path: "Sources/LiveBox",
            linkerSettings: [
                .linkedFramework("AVKit"),
                .linkedFramework("AVFoundation"),
            ]
        )
    ]
)
