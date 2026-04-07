import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import WindowTitlebar from "./components/WindowTitlebar";
import Player from "./components/Player";
import URLModal from "./components/URLModal";
import HomePage from "./pages/HomePage";
import LivePage from "./pages/LivePage";
import MoviesPage from "./pages/MoviesPage";
import SeriesPage from "./pages/SeriesPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage, { ACCENT_COLORS } from "./pages/SettingsPage";
import { parseM3U } from "./utils/m3uParser";
import { storageGet, storageSet } from "./utils/storage";

function applyAccent(index) {
  const c = ACCENT_COLORS[index] || ACCENT_COLORS[0];
  document.documentElement.style.setProperty("--accent", c.primary);
  document.documentElement.style.setProperty("--accent-bright", c.bright);
  document.documentElement.style.setProperty("--accent-dim", c.dim);
}

// Hydrate from cache synchronously so first render already has data
const _savedCreds = storageGet("xtreamCreds", null);
const _cached = storageGet("xtreamCache", null);
const _hasCache = _savedCreds && _cached && _cached.baseUrl === _savedCreds.baseUrl && _cached.username === _savedCreds.username;
const _initAccent = storageGet("accentIndex", 0);
applyAccent(_initAccent);

export default function App() {
  const [platform, setPlatform] = useState(null);
  const [page, setPage] = useState("home");
  const [pendingSeries, setPendingSeries] = useState(null);
  const [channels, setChannels] = useState(_hasCache ? _cached.channels : []);
  const [groups, setGroups] = useState(_hasCache ? _cached.groups : []);
  const [movies, setMovies] = useState(_hasCache ? _cached.movies : []);
  const [movieGroups, setMovieGroups] = useState(_hasCache ? _cached.movieGroups : []);
  const [series, setSeries] = useState(_hasCache ? _cached.series : []);
  const [seriesGroups, setSeriesGroups] = useState(_hasCache ? _cached.seriesGroups : []);
  const [favorites, setFavorites] = useState(() => storageGet("favorites", {}));
  const [playing, setPlaying] = useState(null);
  const [playingType, setPlayingType] = useState("live"); // "live", "movie", "series"
  const [showURLModal, setShowURLModal] = useState(false);
  const [recentURLs, setRecentURLs] = useState(() => storageGet("recentURLs", []));
  const [accentIndex, setAccentIndex] = useState(_initAccent);
  const [xtreamCreds, setXtreamCreds] = useState(_hasCache ? _savedCreds : null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [watchProgress, setWatchProgress] = useState(() => storageGet("watchProgress", {}));

  const loadXtreamRef = useRef(null);

  useEffect(() => {
    window.electron?.getPlatform?.().then(setPlatform);

    // Background refresh or full load if no cache
    if (_savedCreds && window.electron?.fetchURL) {
      if (_hasCache) {
        loadXtreamRef.current(_savedCreds.baseUrl, _savedCreds.username, _savedCreds.password, true).catch(() => {});
      } else {
        loadXtreamRef.current(_savedCreds.baseUrl, _savedCreds.username, _savedCreds.password).catch(() => {});
      }
    }
  }, []);

  const loadPlaylist = useCallback((content, name) => {
    const { channels: ch, groups: gr } = parseM3U(content);
    setChannels(ch);
    setGroups(gr);
    setPage("live");
    setPlaying(null);
  }, []);

  const handleOpenFile = useCallback(async () => {
    const result = await window.electron.openM3UFile();
    if (result) loadPlaylist(result.content, result.name);
  }, [loadPlaylist]);

  const handleOpenURL = useCallback(() => {
    setShowURLModal(true);
  }, []);

  const loadXtreamAPI = useCallback(async (baseUrl, username, password, silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadingStep("Connecting to server...");
    }
    const api = (action) =>
      window.electron.fetchURL(`${baseUrl}/player_api.php?username=${username}&password=${password}&action=${action}`);

    try {
      if (!silent) setLoadingStep("Fetching live channels...");
      const [liveCatJson, liveJson] = await Promise.all([
        api("get_live_categories"),
        api("get_live_streams"),
      ]);

      if (!silent) setLoadingStep("Fetching movies...");
      const [vodCatJson, vodJson] = await Promise.all([
        api("get_vod_categories"),
        api("get_vod_streams"),
      ]);

      if (!silent) setLoadingStep("Fetching series...");
      const [serCatJson, serJson] = await Promise.all([
        api("get_series_categories"),
        api("get_series"),
      ]);

      if (!silent) setLoadingStep("Building library...");

      const buildCatMap = (json) => {
        const cats = JSON.parse(json);
        const map = {};
        for (const c of cats) map[c.category_id] = c.category_name;
        return map;
      };

      // Live
      const liveCatMap = buildCatMap(liveCatJson);
      const liveStreams = JSON.parse(liveJson);
      const ch = liveStreams.map((s, i) => ({
        id: i,
        name: s.name,
        url: `${baseUrl}/live/${username}/${password}/${s.stream_id}.m3u8`,
        logo: s.stream_icon || "",
        group: liveCatMap[s.category_id] || "Uncategorized",
        tvgId: s.epg_channel_id || "",
      }));
      const liveGroups = [...new Set(ch.map((c) => c.group))].sort((a, b) =>
        a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
      );

      // Movies
      const vodCatMap = buildCatMap(vodCatJson);
      const vodStreams = JSON.parse(vodJson);
      const mov = vodStreams.map((s, i) => ({
        id: i,
        name: s.name,
        streamId: s.stream_id,
        url: `${baseUrl}/movie/${username}/${password}/${s.stream_id}.${s.container_extension || "mp4"}`,
        poster: s.stream_icon || "",
        group: vodCatMap[s.category_id] || "Uncategorized",
        rating: s.rating || "",
        tmdb: s.tmdb || "",
      }));
      const mGroups = [...new Set(mov.map((m) => m.group))].sort((a, b) =>
        a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
      );

      // Series
      const serCatMap = buildCatMap(serCatJson);
      const serStreams = JSON.parse(serJson);
      const ser = serStreams.map((s, i) => ({
        id: i,
        name: s.name,
        seriesId: s.series_id,
        poster: s.cover || "",
        group: serCatMap[s.category_id] || "Uncategorized",
        rating: s.rating || "",
        plot: s.plot || "",
        cast: s.cast || "",
        genre: s.genre || "",
        releaseDate: s.releaseDate || s.release_date || "",
        tmdb: s.tmdb || "",
      }));
      const sGroups = [...new Set(ser.map((s) => s.group))].sort((a, b) =>
        a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
      );

      setChannels(ch);
      setGroups(liveGroups);
      setMovies(mov);
      setMovieGroups(mGroups);
      setSeries(ser);
      setSeriesGroups(sGroups);
      const creds = { baseUrl, username, password };
      setXtreamCreds(creds);
      storageSet("xtreamCreds", creds);

      // Cache processed data for instant startup next time
      storageSet("xtreamCache", {
        baseUrl, username,
        channels: ch, groups: liveGroups,
        movies: mov, movieGroups: mGroups,
        series: ser, seriesGroups: sGroups,
        cachedAt: Date.now(),
      });

      if (!silent) {
        setPage("home");
        setPlaying(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  loadXtreamRef.current = loadXtreamAPI;

  const handleURLSubmit = useCallback(async (url) => {
    setShowURLModal(false);
    try {
      const xtreamMatch = url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
      if (xtreamMatch) {
        const [, baseUrl, username, password] = xtreamMatch;
        await loadXtreamAPI(baseUrl, username, password);
      } else {
        const content = await window.electron.fetchURL(url);
        loadPlaylist(content, url.split("/").pop());
      }
      const updated = [url, ...recentURLs.filter((u) => u !== url)].slice(0, 10);
      setRecentURLs(updated);
      storageSet("recentURLs", updated);
    } catch (err) {
      alert("Failed to load playlist from URL: " + err.message);
    }
  }, [loadPlaylist, loadXtreamAPI, recentURLs]);

  const handleToggleFav = useCallback((item) => {
    setFavorites((prev) => {
      const key = item.url || item.seriesId || item.streamId;
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      storageSet("favorites", next);
      return next;
    });
  }, []);

  const saveProgress = useCallback((url, position, duration, meta) => {
    if (!url || !duration || duration < 30) return;
    setWatchProgress((prev) => {
      const next = { ...prev, [url]: { position, duration, updatedAt: Date.now(), ...meta } };
      storageSet("watchProgress", next);
      return next;
    });
  }, []);

  const handleAccentChange = useCallback((i) => {
    setAccentIndex(i);
    applyAccent(i);
    storageSet("accentIndex", i);
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentURLs([]);
    storageSet("recentURLs", []);
  }, []);

  const playLive = useCallback((ch) => { setPlayingType("live"); setPlaying(ch); }, []);
  const playMovie = useCallback((m) => { setPlayingType("movie"); setPlaying(m); }, []);
  const playSeries = useCallback((ep) => { setPlayingType("series"); setPlaying(ep); }, []);

  const hasContent = channels.length > 0 || movies.length > 0 || series.length > 0;
  const hasCustomTitlebar = platform === "win32" || platform === "linux";

  return (
    <>
      {hasCustomTitlebar && <WindowTitlebar />}
      <Sidebar
        page={page}
        onNavigate={(p) => { setPlaying(null); setPage(p); }}
        onOpenFile={() => { setPlaying(null); handleOpenFile(); }}
        onOpenURL={() => { setPlaying(null); handleOpenURL(); }}
        hasContent={hasContent}
      />
      <div className={`main${hasCustomTitlebar ? " has-titlebar" : ""}`}>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-card">
              <div className="loading-logo">LB</div>
              <div className="loading-bar-track">
                <div className="loading-bar-fill" />
              </div>
              <p className="loading-step">{loadingStep}</p>
            </div>
          </div>
        )}
        {playing && (
          <Player
            channel={playing}
            onClose={() => setPlaying(null)}
            channels={channels}
            groups={groups}
            favorites={favorites}
            onPlay={setPlaying}
            onToggleFav={handleToggleFav}
            contentType={playingType}
            onSaveProgress={saveProgress}
            watchProgress={watchProgress}
          />
        )}
        <div className="pages-container" style={{ display: loading ? "none" : "contents" }}>
          <div style={{ display: page === "home" ? "contents" : "none" }}>
            <HomePage
              channels={channels}
              movies={movies}
              series={series}
              onPlay={playMovie}
              onNavigate={setPage}
              onOpenFile={handleOpenFile}
              onOpenURL={handleOpenURL}
              hasContent={hasContent}
              watchProgress={watchProgress}
            />
          </div>
          <div style={{ display: page === "live" ? "contents" : "none" }}>
            <LivePage
              channels={channels}
              groups={groups}
              onPlay={playLive}
              favorites={favorites}
              onToggleFav={handleToggleFav}
            />
          </div>
          <div style={{ display: page === "movies" ? "contents" : "none" }}>
            <MoviesPage
              movies={movies}
              groups={movieGroups}
              onPlay={playMovie}
              favorites={favorites}
              onToggleFav={handleToggleFav}
              watchProgress={watchProgress}
            />
          </div>
          <div style={{ display: page === "series" ? "contents" : "none" }}>
            <SeriesPage
              series={series}
              groups={seriesGroups}
              xtreamCreds={xtreamCreds}
              onPlay={playSeries}
              favorites={favorites}
              onToggleFav={handleToggleFav}
              watchProgress={watchProgress}
              pendingSeries={pendingSeries}
              onClearPending={() => setPendingSeries(null)}
            />
          </div>
          {page === "favorites" && (
            <FavoritesPage
              favorites={favorites}
              onPlayLive={playLive}
              onPlayMovie={playMovie}
              onToggleFav={handleToggleFav}
              watchProgress={watchProgress}
              onOpenSeries={(s) => { setPendingSeries(s); setPage("series"); }}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              accentIndex={accentIndex}
              onAccentChange={handleAccentChange}
              recentURLs={recentURLs}
              onClearRecent={handleClearRecent}
              favCount={Object.keys(favorites).length}
              progressCount={Object.keys(watchProgress).length}
              onClearFavorites={() => { setFavorites({}); storageSet("favorites", {}); }}
              onClearProgress={() => { setWatchProgress({}); storageSet("watchProgress", {}); }}
              onClearPlaylist={() => {
                setChannels([]); setGroups([]); setMovies([]); setMovieGroups([]);
                setSeries([]); setSeriesGroups([]); setXtreamCreds(null);
                storageSet("xtreamCreds", null); setPage("home");
              }}
              onResetAll={() => {
                setFavorites({}); setWatchProgress({}); setRecentURLs([]);
                setChannels([]); setGroups([]); setMovies([]); setMovieGroups([]);
                setSeries([]); setSeriesGroups([]); setXtreamCreds(null);
                setAccentIndex(0); applyAccent(0);
                storageSet("favorites", {}); storageSet("watchProgress", {});
                storageSet("recentURLs", []); storageSet("xtreamCreds", null);
                storageSet("accentIndex", 0); setPage("home");
              }}
            />
          )}
        </div>
      </div>
      {showURLModal && (
        <URLModal onClose={() => setShowURLModal(false)} onSubmit={handleURLSubmit} />
      )}
    </>
  );
}
