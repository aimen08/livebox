# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-06-11

### Added
- "Cinematic Streaming" design system: layered blue-black surfaces, glass chrome with backdrop blur, elevation/motion scales, and a full design-token rebuild in `global.css`; accent colors still switch at runtime via the existing three tokens.
- Navigation upgrades: grouped sidebar rail with settings pinned to the bottom, home header with clickable ⌘K search hint, group-filter inputs on Live/Movies/Series, scoped search placeholders, and an equalizer indicator on the playing live channel row.
- Series detail billboard hero with blurred backdrop; poster cards with scrims, spring hover, and in-artwork rating/favorite controls.
- Skeleton shimmer loaders, redesigned empty states, Spotlight footer with result count and keyboard hints, Now Playing / keyboard-hint cards in the live side panel.
- Player: hover-hold controls, painted seek bar, keyboard shortcuts (space, arrows, f, m), error card with content name and Retry button.
- Accessibility pass: visible focus rings, keyboard activation on all cards/rows, aria-labels on window and sidebar controls, `prefers-reduced-motion` support.

### Changed
- Player error screen now reports the actual failure reason instead of a generic message: HTTP status codes from the provider (including a dedicated hint when the network is blocked with HTTP 456, typically a VPN), decode/codec errors, and network errors for both HLS and direct streams.
