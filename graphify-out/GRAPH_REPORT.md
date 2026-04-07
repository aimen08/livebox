# Graph Report - .  (2026-04-07)

## Corpus Check
- Corpus is ~23,954 words - fits in a single context window. You may not need a graph.

## Summary
- 247 nodes · 215 edges · 36 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `Livebox TV Android/Google TV Client` - 12 edges
2. `XtreamRepository` - 10 edges
3. `XtreamApi` - 10 edges
4. `FavoritesRepository` - 8 edges
5. `WatchHistoryRepository` - 8 edges
6. `FavoritesDao` - 7 edges
7. `WatchHistoryDao` - 7 edges
8. `LiveBox Electron App` - 7 edges
9. `LiveBox App Icon (TV + LIVEBOX label)` - 6 edges
10. `SettingsViewModel` - 5 edges

## Surprising Connections (you probably didn't know these)
- `icon.png Raster Export` --semantically_similar_to--> `LiveBox App Icon (TV + LIVEBOX label)`  [INFERRED] [semantically similar]
  icon.png → icon.svg
- `icon-1024.png Raster Export` --semantically_similar_to--> `LiveBox App Icon (TV + LIVEBOX label)`  [INFERRED] [semantically similar]
  icon-1024.png → icon.svg
- `Livebox TV Android/Google TV Client` --semantically_similar_to--> `LiveBox Electron App`  [INFERRED] [semantically similar]
  android-tv/README.md → README.md
- `LiveBox App Icon (TV + LIVEBOX label)` --conceptually_related_to--> `LiveBox Electron App`  [INFERRED]
  icon.svg → README.md
- `Media3 ExoPlayer (live HLS)` --semantically_similar_to--> `Custom Video Player (hls.js)`  [INFERRED] [semantically similar]
  android-tv/README.md → README.md

## Hyperedges (group relationships)
- **Shared Xtream Backend Across Clients** — readme_livebox, androidtv_readme_client, readme_xtream_api [EXTRACTED 0.95]
- **Android TV Technology Stack** — androidtv_compose_tv, androidtv_media3_exoplayer, androidtv_hilt_di, androidtv_retrofit_okhttp [EXTRACTED 1.00]
- **LiveBox Visual Brand (icon + TV + red)** — icon_svg_logo, icon_tv_screen_element, icon_red_dark_palette, icon_signal_waves [EXTRACTED 1.00]

## Communities

### Community 0 - "Android TV App Shell"
Cohesion: 0.1
Nodes (22): Coil Image Loading, Jetpack Compose for TV, D-pad Focus Navigation, Hilt Dependency Injection, LEANBACK_LAUNCHER Registration, Media3 ExoPlayer (live HLS), OpenSubtitles Integration (TODO), Livebox TV Android/Google TV Client (+14 more)

### Community 1 - "Xtream Data Models"
Cohesion: 0.11
Nodes (16): EpgListing, EpgResponse, Episode, EpisodeInfo, LiveCategory, LiveChannel, Season, SeriesInfo (+8 more)

### Community 2 - "Xtream API Surface"
Cohesion: 0.12
Nodes (2): XtreamApi, XtreamUrls

### Community 3 - "Room DAO Layer"
Cohesion: 0.13
Nodes (2): FavoritesDao, WatchHistoryDao

### Community 4 - "Series Detail Screen"
Cohesion: 0.17
Nodes (2): SeriesDetailState, SeriesDetailViewModel

### Community 5 - "Live TV Browser"
Cohesion: 0.17
Nodes (2): LiveState, LiveViewModel

### Community 6 - "Settings Screen"
Cohesion: 0.18
Nodes (2): ConfirmKind, SettingsViewModel

### Community 7 - "Xtream Repository"
Cohesion: 0.18
Nodes (1): XtreamRepository

### Community 8 - "Movie Detail Screen"
Cohesion: 0.2
Nodes (2): MovieDetailState, MovieDetailViewModel

### Community 9 - "App ViewModel / Auth"
Cohesion: 0.22
Nodes (5): AppViewModel, Error, Idle, Loading, SignInState

### Community 10 - "Favorites Repository"
Cohesion: 0.22
Nodes (1): FavoritesRepository

### Community 11 - "Watch History Repository"
Cohesion: 0.22
Nodes (1): WatchHistoryRepository

### Community 12 - "Player Screen"
Cohesion: 0.25
Nodes (1): PlayerViewModel

### Community 13 - "Movies Browser"
Cohesion: 0.29
Nodes (2): MoviesState, MoviesViewModel

### Community 14 - "Login Screen"
Cohesion: 0.33
Nodes (0): 

### Community 15 - "Series Browser"
Cohesion: 0.33
Nodes (2): SeriesState, SeriesViewModel

### Community 16 - "Network DI Module"
Cohesion: 0.33
Nodes (1): NetworkModule

### Community 17 - "Electron Main Process"
Cohesion: 0.4
Nodes (0): 

### Community 18 - "Database DI Module"
Cohesion: 0.4
Nodes (1): DatabaseModule

### Community 19 - "Persistence Concepts"
Cohesion: 0.4
Nodes (5): DataStore Credentials Persistence, Favorites Library, Persistent Sessions, Resume Playback Feature, storage.js LocalStorage Wrapper

### Community 20 - "Application Bootstrap"
Cohesion: 0.5
Nodes (1): LiveboxApp

### Community 21 - "Favorites Browser"
Cohesion: 0.5
Nodes (2): FavoritesActions, FavoritesViewModel

### Community 22 - "Xtream Catalog Cache"
Cohesion: 0.5
Nodes (1): XtreamContentCache

### Community 23 - "Room Entities"
Cohesion: 0.5
Nodes (3): FavoriteEntity, StreamType, WatchHistoryEntity

### Community 24 - "Room Database"
Cohesion: 0.5
Nodes (1): LiveboxDatabase

### Community 25 - "ExoPlayer Wrapper"
Cohesion: 0.5
Nodes (1): LiveboxPlayer

### Community 26 - "Main Activity"
Cohesion: 0.67
Nodes (1): MainActivity

### Community 27 - "Home Screen / Nav"
Cohesion: 0.67
Nodes (1): NavTab

### Community 28 - "Theme & Colors"
Cohesion: 0.67
Nodes (1): LbColors

### Community 29 - "Browser Storage Helpers"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Window Size Class"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "M3U Parser"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Electron Preload"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Gradle Build"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Gradle Settings"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **50 isolated node(s):** `SignInState`, `Idle`, `Loading`, `Error`, `MovieDetailState` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Window Size Class`** (2 nodes): `WindowSize.kt`, `isCompactWidth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `M3U Parser`** (2 nodes): `m3uParser.js`, `parseM3U()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electron Preload`** (1 nodes): `preload.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gradle Build`** (1 nodes): `build.gradle.kts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gradle Settings`** (1 nodes): `settings.gradle.kts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Livebox TV Android/Google TV Client` connect `Android TV App Shell` to `Persistence Concepts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `SignInState`, `Idle`, `Loading` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Android TV App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Xtream Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Xtream API Surface` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Room DAO Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._