# LiveBox

A modern, lightweight IPTV player for M3U/M3U8 playlists. Built with Electron, React, and hls.js.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-GPL--3.0-green)

## Features

- **M3U Playlist Support** — Open local `.m3u`/`.m3u8` files or load from a URL
- **Live Stream Playback** — HLS and direct stream playback powered by hls.js
- **Channel Browser** — Grid view with logos, search, and group/category filtering
- **Favorites** — Star channels for quick access
- **Theming** — 6 accent color presets with a dark UI
- **Cross-Platform** — Builds for macOS (DMG), Windows (NSIS), and Linux (AppImage/deb)
- **Remembers State** — Last playlist and favorites persist between sessions

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Install & Run

```bash
git clone https://github.com/aimen08/livebox.git
cd livebox
npm install
npm run start
```

### Build

```bash
# macOS (Intel + Apple Silicon DMGs)
npm run dist:mac

# Windows (NSIS installer)
npm run dist:win

# Linux (AppImage + .deb)
npm run dist:linux

# All platforms
npm run dist
```

## Usage

1. Launch the app
2. Click **Open File** to load a local M3U playlist, or **Open URL** to load one from the web
3. Browse channels by group, search by name
4. Double-click or hit the play button to start watching
5. Star channels to save them to Favorites

## Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop Framework | Electron |
| UI | React 18 |
| Bundler | Vite |
| Video Playback | hls.js |
| Styling | CSS (custom properties) |

## Project Structure

```
livebox/
├── index.js              # Electron main process
├── preload.js            # IPC bridge
├── src/
│   ├── App.jsx           # Root component & routing
│   ├── components/
│   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   ├── Player.jsx        # HLS video player
│   │   ├── ChannelCard.jsx   # Channel grid card
│   │   ├── URLModal.jsx      # URL input dialog
│   │   ├── WindowTitlebar.jsx
│   │   └── Icons.jsx
│   ├── pages/
│   │   ├── HomePage.jsx      # Channel browser
│   │   ├── FavoritesPage.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/
│   │   ├── m3uParser.js  # M3U file parser
│   │   └── storage.js    # LocalStorage wrapper
│   └── styles/
│       └── global.css
├── package.json
└── vite.config.js
```

## License

[GPL-3.0](LICENSE)
