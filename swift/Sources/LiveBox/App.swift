import SwiftUI
import AppKit

@main
struct LiveBoxApp: App {
    @StateObject private var app = AppState()
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup("LiveBox") {
            ContentView()
                .environmentObject(app)
                .frame(minWidth: 960, minHeight: 640)
                .preferredColorScheme(.dark)
                .background(Theme.bg)
        }
        .windowStyle(.hiddenTitleBar)
    }
}

// SwiftPM executables launch as background processes by default. Force the
// process to behave like a regular app so the window shows up and the dock
// icon appears.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        if let window = NSApp.windows.first {
            window.makeKeyAndOrderFront(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
