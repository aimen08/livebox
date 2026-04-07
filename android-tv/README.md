# Livebox TV — Android / Google TV client

A Jetpack Compose for TV client that talks to the same Xtream Codes provider
as the Electron `livebox` app. Built for Google TV / Android TV with D-pad
focus, ExoPlayer (Media3), and Hilt.

## Stack

- **UI:** Jetpack Compose + `androidx.tv:tv-material` / `tv-foundation`
- **Player:** AndroidX Media3 (ExoPlayer) tuned for live HLS
- **Networking:** Retrofit + OkHttp + kotlinx.serialization
- **DI:** Hilt
- **Persistence:** DataStore (credentials)
- **Images:** Coil

## Project layout

```
app/src/main/java/com/livebox/tv/
├── LiveboxApp.kt              Hilt application
├── MainActivity.kt            Entry point + nav graph
├── data/
│   ├── Models.kt              Xtream API DTOs
│   ├── XtreamApi.kt           Retrofit interface + URL builder
│   ├── XtreamRepository.kt    Wraps API + creds
│   ├── CredentialsStore.kt    DataStore-backed creds
│   └── NetworkModule.kt       Hilt providers
├── player/
│   └── LiveboxPlayer.kt       ExoPlayer factory tuned for live IPTV
└── ui/
    ├── AppViewModel.kt
    ├── theme/Theme.kt
    └── screens/
        ├── LoginScreen.kt
        ├── HomeScreen.kt + HomeViewModel.kt
        └── PlayerScreen.kt
```

## Build

You need Android Studio Ladybug+ (or Iguana) and JDK 17.

```bash
cd android-tv
./gradlew assembleDebug
```

The Gradle wrapper is not yet committed — run `gradle wrapper` once with a
local Gradle 8.10+ to generate it, or open the project in Android Studio and
let it sync.

## Install on a Google TV device

1. Enable **Developer options → USB debugging** on the TV.
2. `adb connect <tv-ip>:5555`
3. `./gradlew installDebug`

The app registers `LEANBACK_LAUNCHER` so it appears in the Google TV apps row.

## What's wired up

- Login → DataStore-saved Xtream credentials
- Home → live categories (sidebar) + live channel grid (focus-aware)
- Tap channel → ExoPlayer screen with HLS source

## What's not yet wired (next steps)

- Movies / Series tabs (the API layer already supports them)
- EPG / channel info bar
- Favorites + watch history (mirror Electron app's storage.js)
- OpenSubtitles integration (already in Electron app)
- Restreamer mode: point `baseUrl` at your own Threadfin/MediaMTX instead of
  the upstream provider — no app changes required.
