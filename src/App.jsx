import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import WindowTitlebar from "./components/WindowTitlebar";
import Player from "./components/Player";
import URLModal from "./components/URLModal";
import HomePage from "./pages/HomePage";
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

export default function App() {
  const [platform, setPlatform] = useState(null);
  const [page, setPage] = useState("home");
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [playing, setPlaying] = useState(null);
  const [showURLModal, setShowURLModal] = useState(false);
  const [recentURLs, setRecentURLs] = useState([]);
  const [accentIndex, setAccentIndex] = useState(0);
  const [playlistName, setPlaylistName] = useState("");

  // Init
  useEffect(() => {
    window.electron.getPlatform().then(setPlatform);
    const savedFavs = storageGet("favorites", {});
    setFavorites(savedFavs);
    const savedAccent = storageGet("accentIndex", 0);
    setAccentIndex(savedAccent);
    applyAccent(savedAccent);
    const savedRecent = storageGet("recentURLs", []);
    setRecentURLs(savedRecent);

    // Load last playlist if any
    const lastPlaylist = storageGet("lastPlaylist", null);
    if (lastPlaylist) {
      const { channels: ch, groups: gr } = parseM3U(lastPlaylist.content);
      setChannels(ch);
      setGroups(gr);
      setPlaylistName(lastPlaylist.name || "");
    }
  }, []);

  const loadPlaylist = useCallback((content, name) => {
    const { channels: ch, groups: gr } = parseM3U(content);
    setChannels(ch);
    setGroups(gr);
    setPlaylistName(name || "Playlist");
    setPage("home");
    setPlaying(null);
    storageSet("lastPlaylist", { content, name });
  }, []);

  const handleOpenFile = useCallback(async () => {
    const result = await window.electron.openM3UFile();
    if (result) {
      loadPlaylist(result.content, result.name);
    }
  }, [loadPlaylist]);

  const handleOpenURL = useCallback(() => {
    setShowURLModal(true);
  }, []);

  const handleURLSubmit = useCallback(async (url) => {
    setShowURLModal(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const content = await res.text();
      loadPlaylist(content, url.split("/").pop());
      // Save to recent
      const updated = [url, ...recentURLs.filter(u => u !== url)].slice(0, 10);
      setRecentURLs(updated);
      storageSet("recentURLs", updated);
    } catch (err) {
      alert("Failed to load playlist from URL: " + err.message);
    }
  }, [loadPlaylist, recentURLs]);

  const handleToggleFav = useCallback((channel) => {
    setFavorites(prev => {
      const next = { ...prev };
      if (next[channel.url]) {
        delete next[channel.url];
      } else {
        next[channel.url] = channel;
      }
      storageSet("favorites", next);
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

  const hasCustomTitlebar = platform === "win32" || platform === "linux";

  return (
    <>
      {hasCustomTitlebar && <WindowTitlebar />}
      <Sidebar
        page={page}
        onNavigate={setPage}
        onOpenFile={handleOpenFile}
        onOpenURL={handleOpenURL}
      />
      <div className={`main${hasCustomTitlebar ? " has-titlebar" : ""}`}>
        {playing ? (
          <Player channel={playing} onClose={() => setPlaying(null)} />
        ) : (
          <>
            {page === "home" && (
              <HomePage
                channels={channels}
                groups={groups}
                onPlay={setPlaying}
                favorites={favorites}
                onToggleFav={handleToggleFav}
                onOpenFile={handleOpenFile}
                onOpenURL={handleOpenURL}
              />
            )}
            {page === "favorites" && (
              <FavoritesPage
                favorites={favorites}
                onPlay={setPlaying}
                onToggleFav={handleToggleFav}
              />
            )}
            {page === "settings" && (
              <SettingsPage
                accentIndex={accentIndex}
                onAccentChange={handleAccentChange}
                recentURLs={recentURLs}
                onClearRecent={handleClearRecent}
              />
            )}
          </>
        )}
      </div>
      {showURLModal && (
        <URLModal
          onClose={() => setShowURLModal(false)}
          onSubmit={handleURLSubmit}
        />
      )}
    </>
  );
}
