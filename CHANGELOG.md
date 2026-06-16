# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-06-15 — v1.7.1

### Fixed
- Windows: the sidebar audio/subtitle pickers were empty — the spawned-mpv path emitted mpv's raw `track-list`, but the renderer expects the normalized `{audio, sub, selectedAudio, selectedSub}` shape used by the macOS engine. Windows now emits the same shape (and maps "off" to `sid=no`).

### Changed
- Removed the hardcoded OpenSubtitles API key — now read from the `LIVEBOX_OPENSUBTITLES_KEY` env var; online subtitle search is disabled (no-op) when unset.
- Removed the hardcoded provider URL + credentials from the Android TV login screen's default field (now blank). (Open-sourcing prep.)

## 2026-06-15 — v1.7.0

### Added
- macOS embedded video: playback now renders through an in-process libmpv render-API native addon (`native/embedded_mpv.mm`, adapted from IPTVnator, MIT) drawing into a view inside the app window — true in-window embedding, no separate/floating window. Handles the provider's MKV/EAC3 catalog and redirecting live HLS natively.
- Player control dock below the video: auto-hides while playing, with back, play/pause, VOD seek bar, volume/mute, audio-track and subtitle pickers (they swap in place — a popup would be hidden behind the native video), favorite, and a full-screen toggle. The dock keeps a fixed reserved height so auto-hiding never resizes/stretches the video.
- Per-content track memory: the chosen audio track and subtitle are saved per movie/episode and re-applied automatically on replay (once the track list has populated). Audio/subtitle pickers are dropdown menus, and a pick made on one episode becomes the default for the rest of that series.

### Changed
- Seeking now uses keyframe seeks plus a seekable demuxer cache, force-seekable, and network reconnect options — fixes seek lag and the MKV "no join point found" warnings over HTTP.
- macOS playback engine runs in-process, so a closed/crashed app can no longer leave an orphan mpv holding the provider's single connection slot.
- Removed the control strip above the video (controls now live in the dock).
- Home/Movies/Series poster cards no longer scale on hover.

### Fixed
- HomePage re-filtered the entire catalog per genre row on every render; now a single memoized pass.
- mpv quits cleanly on every exit path (including dev Ctrl+C), preventing orphaned processes that previously held the connection slot (HTTP 458) and left a stray window.
- Auto-hiding the controls no longer resizes/stretches the video (the dock fades in a fixed reserved strip); removed a stray scrollbar in the player; saved track picks now wait for the track list to populate before applying.
- Audio/subtitle pickers open as a side panel that shrinks the video beside it (video stays visible) instead of blacking it out; the list scrolls within the panel, not over the video.
- Release CI: artifact upload is non-fatal (won't block the release on Actions storage quota); cleaned up old workflow artifacts and releases.
- macOS DMG built on macos-14 (Sonoma) instead of macos-15 (Sequoia): the bundled libmpv built on 15 referenced macOS-15 Swift symbols and failed to load on Sonoma, so the packaged app fell back to a separate mpv window. Now the embedded engine loads on macOS 14 and newer.

### Chore
- Native addon build pipeline: `native/` + `binding.gyp`, `npm run build:native`, and self-contained libmpv bundling (`tools/stage-mpv-mac.mjs` → `dist:mac`, ~48 dylibs relinked to `@loader_path`); release CI now builds and stages the macOS addon. Declared `node-addon-api`. Version bumped to 1.7.0 (macOS arm64 DMG; Windows unchanged via bundled mpv.exe).

## 2026-06-12

### Added
- Over-the-air updates: the app now checks GitHub releases ~30s after launch, downloads updates in the background, and installs them on quit (Windows NSIS + macOS via electron-updater).

### Changed
- Windows playback engine no longer embeds mpv into an app window (three embedding strategies all hit Windows-compositor conflicts ending in audio-but-black-video). mpv now renders in its own borderless always-on-top window steered over the player area via IPC — its standard, universally working render path. The window follows app moves/resizes, minimizes with the app, drops ontop when the app loses focus, and hides behind overlays.

## 2026-06-11

### Added
- Windows now ships a bundled mpv playback engine (full ffmpeg inside) that renders all live and VOD playback: MKV, HEVC, AC3/EAC3 and the provider's redirecting live HLS all play natively with hardware decoding. The video renders in a native surface with mpv's on-screen controls plus an app control strip (back, play/pause, favorite, inline/fullscreen). macOS keeps the existing Chromium player, which already handles this catalog. An `mpv.log` is written to the app data folder for diagnostics.
- Netflix-style layout rehaul: a top navigation bar replaces the left sidebar (transparent over the hero, glass once scrolled, with macOS traffic-light and Windows/Linux titlebar handling). Home, Movies, and Series now lead with a billboard hero and horizontal scrolling shelves of hover-preview cards (Play / My List / More).
- "Cinematic Streaming" design system: layered blue-black surfaces, glass chrome with backdrop blur, elevation/motion scales, and a full design-token rebuild in `global.css`; accent colors still switch at runtime via the existing three tokens.
- Navigation upgrades: grouped sidebar rail with settings pinned to the bottom, home header with clickable ⌘K search hint, group-filter inputs on Live/Movies/Series, scoped search placeholders, and an equalizer indicator on the playing live channel row.
- Series detail billboard hero with blurred backdrop; poster cards with scrims, spring hover, and in-artwork rating/favorite controls.
- Skeleton shimmer loaders, redesigned empty states, Spotlight footer with result count and keyboard hints, Now Playing / keyboard-hint cards in the live side panel.
- Player: hover-hold controls, painted seek bar, keyboard shortcuts (space, arrows, f, m), error card with content name and Retry button.
- Accessibility pass: visible focus rings, keyboard activation on all cards/rows, aria-labels on window and sidebar controls, `prefers-reduced-motion` support.

### Changed
- Performance: the multi-megabyte catalog is no longer re-downloaded and re-parsed on every launch — the silent background refresh now runs only when the cache is older than 12 hours. Offscreen shelves skip layout/paint entirely (`content-visibility`), the `:has()` hover rules that re-evaluated on every mouse move are gone, and the glass blur radius was reduced. The app feels noticeably snappier on large catalogs.
- Movies and Series open on a billboard hero plus genre shelves; the group filter switches to the grid view for deep browsing. Live keeps its groups/channels browse layout.
- Live inline player is now a clean 16:9 panel sized to its slot — no letterbox bars and nothing peeking out underneath it.
- Series detail backdrop bleeds edge-to-edge and up under the nav, fading on all sides instead of cutting off; episodes are a responsive card grid; provider prefixes (e.g. "EN - ") are stripped from series and episode titles.
- Player error screen now reports the actual failure reason instead of a generic message: HTTP status codes from the provider (including a dedicated hint when the network is blocked with HTTP 456, typically a VPN), decode/codec errors, and network errors for both HLS and direct streams.

### Fixed
- Critical: a failed mpv launch on Windows (e.g. blocked by antivirus/SmartScreen) crashed the entire app the moment playback started — the child-process error event was unhandled. All mpv entry points are now crash-proofed; engine failures surface as an in-player error card with the reason, and the app keeps working.
- Hover-preview cards no longer overflow the shelf into a scrollbar — the preview now overlays the artwork and stays within the card.
- Smooth vertical scrolling on Movies and Series: removed the mandatory scroll-snap and shrank the oversized shelf breathing bands that were intercepting the mouse wheel.
- Removed the dark gradient block that painted over the last (often active) season tab.
- Corrected the Live browse layout height so the channel list no longer slid under the inline player.
