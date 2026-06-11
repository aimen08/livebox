# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
