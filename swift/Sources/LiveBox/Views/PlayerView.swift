import SwiftUI
import AppKit
import VLCKitSPM

// VLC-backed player with a SwiftUI controls HUD. VLCVideoView renders
// the picture; PlayerController drives state bindings for the overlay.

@MainActor
final class PlayerController: NSObject, ObservableObject, VLCMediaPlayerDelegate {
    let player = VLCMediaPlayer()

    @Published var isPlaying = false
    @Published var position: Float = 0                 // 0..1
    @Published var elapsed: String = "0:00"
    @Published var remaining: String = "-0:00"
    @Published var durationSeconds: Int = 0            // <=0 means live
    @Published var volume: Int32 = 100
    @Published var isMuted = false
    @Published var audioTracks: [Track] = []
    @Published var selectedAudioTrack: Int32 = -1
    @Published var subtitleTracks: [Track] = []
    @Published var selectedSubtitleTrack: Int32 = -1
    @Published var errorMessage: String?

    struct Track: Identifiable, Hashable {
        let id: Int32
        let name: String
    }

    override init() {
        super.init()
        player.delegate = self
    }

    func load(url: URL, in view: VLCVideoView) {
        errorMessage = nil
        player.stop()
        player.drawable = view
        player.media = VLCMedia(url: url)
        player.play()
    }

    func stop() {
        player.stop()
    }

    func togglePlayPause() {
        if player.isPlaying { player.pause() } else { player.play() }
        isPlaying = player.isPlaying
    }

    func seek(to pos: Float) {
        player.position = max(0, min(1, pos))
    }

    func nudge(by seconds: Int) {
        let t = player.time.intValue                   // ms
        player.time = VLCTime(int: t + Int32(seconds * 1000))
    }

    func setVolume(_ v: Int32) {
        let clamped = max(0, min(200, v))
        player.audio?.volume = clamped
        volume = clamped
        if clamped > 0 && isMuted {
            player.audio?.isMuted = false
            isMuted = false
        }
    }

    func toggleMute() {
        let newMuted = !isMuted
        player.audio?.isMuted = newMuted
        isMuted = newMuted
    }

    func selectAudio(_ id: Int32) {
        player.currentAudioTrackIndex = id
        selectedAudioTrack = id
    }

    func selectSubtitle(_ id: Int32) {
        player.currentVideoSubTitleIndex = id
        selectedSubtitleTrack = id
    }

    // MARK: - VLCMediaPlayerDelegate

    nonisolated func mediaPlayerStateChanged(_ aNotification: Notification) {
        Task { @MainActor in self.refreshState() }
    }

    nonisolated func mediaPlayerTimeChanged(_ aNotification: Notification) {
        Task { @MainActor in self.refreshTime() }
    }

    private func refreshState() {
        isPlaying = player.isPlaying
        if player.state == .error {
            errorMessage = "VLC couldn’t open this stream."
        }
        durationSeconds = Int(player.media?.length.intValue ?? 0) / 1000
        reloadTracks()
    }

    private func refreshTime() {
        position = player.position
        elapsed = player.time.stringValue
        if let rem = player.remainingTime?.stringValue {
            remaining = rem
        }
    }

    private func reloadTracks() {
        audioTracks = zip(
            (player.audioTrackIndexes as? [NSNumber]) ?? [],
            (player.audioTrackNames as? [String]) ?? []
        ).map { Track(id: $0.int32Value, name: $1) }
        selectedAudioTrack = player.currentAudioTrackIndex

        subtitleTracks = zip(
            (player.videoSubTitlesIndexes as? [NSNumber]) ?? [],
            (player.videoSubTitlesNames as? [String]) ?? []
        ).map { Track(id: $0.int32Value, name: $1) }
        selectedSubtitleTrack = player.currentVideoSubTitleIndex
    }
}

struct PlayerView: NSViewRepresentable {
    @ObservedObject var controller: PlayerController
    let url: URL

    func makeNSView(context: Context) -> VLCVideoView {
        let view = VLCVideoView()
        view.fillScreen = true
        controller.load(url: url, in: view)
        return view
    }

    func updateNSView(_ view: VLCVideoView, context: Context) {
        if controller.player.media?.url != url {
            controller.load(url: url, in: view)
        }
    }

    static func dismantleNSView(_ view: VLCVideoView, coordinator: ()) {
        // controller.stop() is called from the owning view's onDisappear
    }
}

struct PlayerSheet: View {
    let url: URL
    let title: String
    var onClose: (() -> Void)? = nil

    @StateObject private var controller = PlayerController()
    @State private var showHud = true
    @State private var hideTask: Task<Void, Never>?

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()
            PlayerView(controller: controller, url: url)
                .onTapGesture { controller.togglePlayPause(); revealHud() }

            if let err = controller.errorMessage {
                VStack(spacing: 8) {
                    Text("Can’t play this title")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                    Text(err)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black.opacity(0.85))
            }

            VStack {
                // Top strip: title + close
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                        Text(url.absoluteString)
                            .font(.system(size: 10))
                            .foregroundStyle(.white.opacity(0.5))
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }
                    Spacer()
                    if let onClose {
                        Button(action: onClose) {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(10)
                                .background(Color.black.opacity(0.6))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)

                Spacer()

                PlayerControls(controller: controller, onFullscreen: toggleFullscreen)
                    .padding(16)
            }
            .opacity(showHud ? 1 : 0)
            .animation(.easeInOut(duration: 0.2), value: showHud)
        }
        .onAppear { revealHud() }
        .onDisappear { controller.stop() }
        .onHover { hovering in
            if hovering { revealHud() } else { showHud = false }
        }
        .onContinuousHover { _ in revealHud() }
    }

    private func revealHud() {
        showHud = true
        hideTask?.cancel()
        hideTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if !Task.isCancelled { showHud = false }
        }
    }

    private func toggleFullscreen() {
        NSApp.keyWindow?.toggleFullScreen(nil)
    }
}

private struct PlayerControls: View {
    @ObservedObject var controller: PlayerController
    let onFullscreen: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            if controller.durationSeconds > 0 {
                HStack(spacing: 10) {
                    Text(controller.elapsed)
                        .font(.system(size: 11, weight: .medium).monospacedDigit())
                        .foregroundStyle(.white.opacity(0.85))
                        .frame(width: 56, alignment: .trailing)
                    Slider(
                        value: Binding(
                            get: { Double(controller.position) },
                            set: { controller.seek(to: Float($0)) }
                        ),
                        in: 0...1
                    )
                    .tint(Theme.accent)
                    Text(controller.remaining)
                        .font(.system(size: 11, weight: .medium).monospacedDigit())
                        .foregroundStyle(.white.opacity(0.85))
                        .frame(width: 56, alignment: .leading)
                }
            }

            HStack(spacing: 16) {
                HudButton(icon: "gobackward.10") { controller.nudge(by: -10) }
                HudButton(icon: controller.isPlaying ? "pause.fill" : "play.fill",
                          large: true) { controller.togglePlayPause() }
                HudButton(icon: "goforward.10") { controller.nudge(by: 10) }

                Spacer()

                VolumeControl(controller: controller)

                TrackMenu(
                    icon: "speaker.wave.2",
                    tracks: controller.audioTracks,
                    selected: controller.selectedAudioTrack
                ) { controller.selectAudio($0) }
                .disabled(controller.audioTracks.isEmpty)

                TrackMenu(
                    icon: "captions.bubble",
                    tracks: controller.subtitleTracks,
                    selected: controller.selectedSubtitleTrack
                ) { controller.selectSubtitle($0) }
                .disabled(controller.subtitleTracks.isEmpty)

                HudButton(icon: "arrow.up.left.and.arrow.down.right", action: onFullscreen)
            }
        }
        .padding(14)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .preferredColorScheme(.dark)
    }
}

private struct HudButton: View {
    let icon: String
    var large: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: large ? 18 : 13, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: large ? 36 : 28, height: large ? 36 : 28)
                .background(Color.white.opacity(0.08))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }
}

private struct VolumeControl: View {
    @ObservedObject var controller: PlayerController
    @State private var hover = false

    var body: some View {
        HStack(spacing: 6) {
            HudButton(icon: controller.isMuted || controller.volume == 0
                      ? "speaker.slash.fill" : "speaker.wave.2.fill") {
                controller.toggleMute()
            }
            if hover {
                Slider(
                    value: Binding(
                        get: { Double(controller.isMuted ? 0 : controller.volume) },
                        set: { controller.setVolume(Int32($0)) }
                    ),
                    in: 0...200
                )
                .tint(Theme.accent)
                .frame(width: 90)
                .transition(.opacity)
            }
        }
        .onHover { hover = $0 }
        .animation(.easeInOut(duration: 0.15), value: hover)
    }
}

private struct TrackMenu: View {
    let icon: String
    let tracks: [PlayerController.Track]
    let selected: Int32
    let onSelect: (Int32) -> Void

    var body: some View {
        Menu {
            ForEach(tracks) { t in
                Button {
                    onSelect(t.id)
                } label: {
                    HStack {
                        Text(t.name)
                        if t.id == selected {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.white.opacity(0.08))
                .clipShape(Circle())
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .fixedSize()
    }
}
