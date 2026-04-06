# LiveBox

A modern, feature-rich IPTV player for Live TV, Movies, and Series. Built with Electron, React, and hls.js. Supports M3U playlists and Xtream Codes API.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-GPL--3.0-green)

## Features

### Content
- **Live TV** — Browse and watch thousands of live channels organized by groups
- **Movies** — Full VOD library with poster grid, search, and category filtering
- **Series** — Browse shows with season/episode picker, cast info, and plot summaries
- **Xtream Codes API** — Auto-detects Xtream URLs and fetches live, VOD, and series data
- **M3U Playlist Support** — Open local `.m3u`/`.m3u8` files or load from a URL

### Player
- **Custom Video Player** — Play/pause, volume, fullscreen, seek bar, live badge
- **Subtitle & Audio Tracks** — Switch between available subtitle and audio tracks
- **Resume Playback** — Movies and series remember where you stopped and resume automatically
- **Auto-Play Next** — Series episodes auto-advance to the next episode
- **Channel Sidebar** — Hover the left edge during live TV to browse and switch channels without leaving the player
- **Episode Sidebar** — Browse episodes from within the player during series playback

### Library
- **Favorites** — Star channels, movies, and series for quick access
- **Continue Watching** — Homepage shows partially watched movies with progress bars
- **Watch Progress** — Series cards show which episode you're on (e.g. "S2E4") with a progress bar
- **Persistent Sessions** — Xtream credentials, favorites, and watch history survive app restarts

### UI/UX
- **Modern Dashboard** — Homepage with content category cards and preview rows
- **Groups + Channels Layout** — Groups panel on the left, channels/content on the right
- **Lazy Loading** — Channels and posters load in batches for smooth scrolling with large playlists
- **8 Accent Colors** — Red, Blue, Purple, Green, Orange, Pink, Teal, Gold
- **Cross-Platform** — macOS (DMG), Windows (NSIS), Linux (AppImage/deb)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm or bun

### Install & Run

```bash
git clone https://github.com/aimen08/livebox.git
cd livebox
npm install
npm run dev    # Vite dev server + Electron with hot reload
npm run start  # Production build + Electron
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
2. Click **Add Playlist URL** and paste your M3U/Xtream URL, or **Open M3U File** for a local playlist
3. Browse Live TV, Movies, or Series from the sidebar
4. Click any channel/movie to start watching
5. Star items to add them to Favorites
6. Movies and series remember your progress automatically

### Xtream Codes URL Format

```
http://server.com/get.php?username=USER&password=PASS&type=m3u_plus&output=ts
```

LiveBox automatically detects this format and uses the Xtream API to fetch live channels, movies, and series with full metadata.

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
├── preload.js            # IPC bridge (fetch, store, file dialogs)
├── src/
│   ├── App.jsx           # Root component, state management, routing
│   ├── components/
│   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   ├── Player.jsx        # Video player with controls, panels, track menus
│   │   ├── URLModal.jsx      # URL input dialog
│   │   ├── WindowTitlebar.jsx
│   │   └── Icons.jsx
│   ├── pages/
│   │   ├── HomePage.jsx      # Dashboard / welcome screen
│   │   ├── LivePage.jsx      # Live TV browser (groups + channels)
│   │   ├── MoviesPage.jsx    # VOD browser (groups + poster grid)
│   │   ├── SeriesPage.jsx    # Series browser + detail view
│   │   ├── FavoritesPage.jsx # Favorited items by type
│   │   └── SettingsPage.jsx  # App settings, data management
│   ├── utils/
│   │   ├── m3uParser.js  # M3U file parser
│   │   └── storage.js    # LocalStorage wrapper
│   └── styles/
│       └── global.css
├── icon.png              # App icon (512x512)
├── package.json
└── vite.config.js
```

## License

[GPL-3.0](LICENSE)
