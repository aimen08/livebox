import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { XIcon } from "./Icons";

// Lazy-load hls.js the first time the player needs it. The chunk is ~200KB
// and the welcome/browse screens never touch it, so paying that cost up front
// is wasted bandwidth. Cached promise = single fetch even with rapid switches.
let hlsModulePromise = null;
function loadHls() {
  if (!hlsModulePromise) hlsModulePromise = import("hls.js").then((m) => m.default);
  return hlsModulePromise;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>;
}
function PauseIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><rect x="5" y="4" width="4" height="16" /><rect x="15" y="4" width="4" height="16" /></svg>;
}
function VolumeIcon({ muted, level }) {
  if (muted || level === 0) return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/></svg>;
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3z"/>{level > 0.3 && <path d="M14 7.97c1.21.92 2 2.39 2 4.03s-.79 3.11-2 4.03" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}{level > 0.6 && <path d="M17 4.95c2.03 1.53 3.35 3.97 3.35 6.72S19.03 17.19 17 18.72" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}</svg>;
}
function FullscreenIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 3h6v2H5v4H3V3zM15 3h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zM19 19h-4v2h6v-6h-2v4z"/></svg>;
}
function ExitFullscreenIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3v6H3v-2h4V3h2zM15 3h2v4h4v2h-6V3zM3 15h6v6H7v-4H3v-2zM15 21v-6h6v2h-4v4h-2z"/></svg>;
}
function ChevronRightIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>;
}
function ChevronLeftIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function ListIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}

function SubtitleIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="5" y1="12" x2="11" y2="12"/><line x1="13" y1="12" x2="19" y2="12"/><line x1="5" y1="16" x2="8" y2="16"/><line x1="10" y1="16" x2="19" y2="16"/></svg>;
}
function AudioIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>;
}

export default function Player({ channel, onClose, channels, groups, favorites, onPlay, onToggleFav, contentType = "live", onSaveProgress, watchProgress, mode = "fullscreen", onModeChange, hasTitlebar = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimer = useRef(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(contentType === "live");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelView, setPanelView] = useState("groups"); // "groups" or "channels"
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chSearch, setChSearch] = useState("");
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [activeSubTrack, setActiveSubTrack] = useState(-1);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subOffset, setSubOffset] = useState(0);
  const [subSize, setSubSize] = useState(2.2);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const isLiveContent = contentType === "live";
  const isSeriesContent = contentType === "series";
  const episodes = channel?.episodes || [];
  const [epPanelOpen, setEpPanelOpen] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const favKey = isSeriesContent ? channel?.seriesId : (channel?.url || channel?.streamId);
  const isFav = !!(favKey && favorites?.[favKey]);

  const handleFav = useCallback(() => {
    if (!channel || !onToggleFav) return;
    if (isSeriesContent && channel.seriesId) {
      // Favorite the series, not the episode
      onToggleFav({ seriesId: channel.seriesId, name: channel.seriesName || channel.name, poster: channel.seriesPoster || channel.logo });
    } else {
      onToggleFav(channel);
    }
  }, [channel, onToggleFav, isSeriesContent]);

  // Set initial group from current channel
  useEffect(() => {
    if (channel?.group) setSelectedGroup(channel.group);
  }, [channel?.group]);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const ch of channels) {
      counts[ch.group] = (counts[ch.group] || 0) + 1;
    }
    return counts;
  }, [channels]);

  const groupChannels = useMemo(() => {
    if (!selectedGroup) return [];
    let list = channels.filter((c) => c.group === selectedGroup);
    if (chSearch.trim()) {
      const q = chSearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [channels, selectedGroup, chSearch]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!channel?.url || !videoRef.current) return;
    const video = videoRef.current;
    setError(null);
    setBuffering(true);
    setPaused(true);
    setIsLive(contentType === "live");
    setAudioTracks([]);
    setSubtitleTracks([]);
    setActiveSubTrack(-1);
    setSubOffset(0);
    setSubsLoading(false);
    setShowAudioMenu(false);
    setShowSubMenu(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = channel.url;
    const isHlsUrl = url.includes(".m3u8");
    const isTsUrl = url.endsWith(".ts");
    const resumePos = contentType !== "live" && watchProgress?.[url];
    const startAt = resumePos?.position > 10 ? resumePos.position : -1;

    // Live HLS is routed through the local proxy: the provider 302-redirects to a
    // rotating CDN edge and uses relative segment paths that the origin host 403s,
    // so the proxy follows the redirect and rewrites them to absolute edge URLs.
    const hlsSource = (isLiveContent && window.electron?.hlsProxyUrl)
      ? window.electron.hlsProxyUrl(url) : url;
    // VOD (mkv/mp4) plays directly — the video element handles the container and
    // the edge supports range requests, so seeking/resume work.
    const directSource = url;

    let cancelled = false;
    const setupHls = (Hls) => {
      if (cancelled) return;
      const isLiveStream = contentType === "live";
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLiveStream,
        // Buffer settings — live needs small buffers, VOD can buffer ahead more
        maxBufferLength: isLiveStream ? 10 : 30,
        maxMaxBufferLength: isLiveStream ? 20 : 60,
        maxBufferSize: isLiveStream ? 30 * 1000 * 1000 : 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        // Back-buffer: flush old segments to prevent memory buildup & lag
        backBufferLength: isLiveStream ? 15 : 90,
        // Live sync — stay close to live edge to minimize latency
        liveSyncDurationCount: isLiveStream ? 2 : 3,
        liveMaxLatencyDurationCount: isLiveStream ? 4 : 6,
        liveBackBufferLength: 15,
        // ABR — switch quality quickly to avoid stalls
        abrEwmaDefaultEstimate: 1000000,
        abrBandWidthUpFactor: 0.7,
        abrBandWidthFactor: 0.95,
        // Fragment loading — faster timeouts for live
        fragLoadingTimeOut: isLiveStream ? 8000 : 20000,
        fragLoadingMaxRetry: isLiveStream ? 6 : 3,
        fragLoadingRetryDelay: 500,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 500,
        startPosition: startAt > 0 ? startAt : -1,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      const updateAudioTracks = () => {
        if (hls.audioTracks?.length > 0) {
          setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, name: t.name || t.lang || `Track ${i + 1}`, lang: t.lang })));
          setActiveAudioTrack(hls.audioTrack);
        }
      };
      const updateSubTracks = () => {
        if (hls.subtitleTracks?.length > 0) {
          setSubtitleTracks(hls.subtitleTracks.map((t, i) => ({ id: i, name: t.name || t.lang || `Sub ${i + 1}`, lang: t.lang })));
          hls.subtitleDisplay = true;
        }
      };
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLive(!hls.levels?.[0]?.details?.live === false);
        video.play().catch(() => {});
        updateAudioTracks();
        updateSubTracks();
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, updateAudioTracks);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, updateSubTracks);
      let recoverAttempts = 0;
      let lastHttpCode = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.response?.code) lastHttpCode = data.response.code;
        if (data.fatal) {
          if (recoverAttempts >= 5) {
            if (lastHttpCode === 456) {
              setError("Provider blocked this network (HTTP 456) — disable VPN and try again");
            } else if (lastHttpCode >= 400) {
              setError(`Stream failed to load (HTTP ${lastHttpCode})`);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              setError(`Stream failed to play (decode error: ${data.details || "unknown"})`);
            } else {
              setError(`Stream unavailable or failed to load (${data.details || data.type || "unknown error"})`);
            }
            hls.destroy();
            return;
          }
          recoverAttempts++;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            // Last resort: full reload
            hls.destroy();
            const newHls = new Hls(hls.config);
            hlsRef.current = newHls;
            newHls.loadSource(hlsSource);
            newHls.attachMedia(video);
          }
        }
      });
    };

    if (isHlsUrl || isTsUrl) {
      loadHls().then((Hls) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          setupHls(Hls);
        } else if (video.canPlayType("application/vnd.apple.mpegurl") && isHlsUrl) {
          video.src = hlsSource;
          video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
        }
      });
    } else {
      video.src = directSource;
      video.addEventListener("loadedmetadata", () => {
        setIsLive(false);
        if (startAt > 0) video.currentTime = startAt;
        video.play().catch(() => {});
        // Detect native audio tracks
        if (video.audioTracks?.length > 1) {
          const tracks = [];
          let enabledIdx = 0;
          for (let i = 0; i < video.audioTracks.length; i++) {
            const t = video.audioTracks[i];
            tracks.push({ id: i, name: t.label || t.language || `Track ${i + 1}`, lang: t.language, native: true });
            if (t.enabled) enabledIdx = i;
          }
          setAudioTracks(tracks);
          setActiveAudioTrack(enabledIdx);
        }
      });
      let retried = false;
      video.addEventListener("error", () => {
        setTimeout(() => {
          if (video.error && video.readyState < 3 && !retried) {
            // Retry once — reload from current position
            retried = true;
            const pos = video.currentTime;
            video.src = directSource;
            video.currentTime = pos;
            video.play().catch(() => {});
          } else if (video.error && video.readyState < 3 && retried) {
            const kinds = {
              1: "aborted",
              2: "network error — check connection/VPN",
              3: "decode error — unsupported codec",
              4: "format not supported",
            };
            const detail = video.error.message ? `: ${video.error.message}` : "";
            setError(`Failed to load stream (${kinds[video.error.code] || "unknown"}${detail})`);
          }
        }, 1500);
      });

    }

    // Search subtitles from OpenSubtitles API (for all non-live content)
    if (contentType !== "live" && window.electron?.searchSubs) {
      // Clean up query — strip provider prefixes, years, episode titles
      let subQuery = (channel?.seriesName || channel?.name || "")
        .replace(/^(CR|NF|AMZN|AMZ|DSNP|HBO|HMAX)\s*-\s*/i, "") // strip provider prefix
        .replace(/\s*\(\d{4}\)\s*/g, " ") // strip year in parens
        .replace(/\s*-\s*S\d+E\d+.*$/i, "") // strip S01E01 and episode title
        .replace(/\s*S\d+E\d+.*$/i, "") // strip S01E01 without dash
        .trim();
      if (subQuery) {
        setSubsLoading(true);
        window.electron.searchSubs(subQuery, channel?.season, channel?.episodeNum).then((tracks) => {
          if (tracks?.length > 0) {
            setSubtitleTracks(tracks.map((t) => ({
              id: t.id, name: t.name, lang: t.lang, fileId: t.fileId,
            })));
          }
        }).catch(() => {}).finally(() => setSubsLoading(false));
      }
    }

    let lastSaveTime = 0;
    const saveUrl = url;
    const saveType = contentType;
    const saveFn = onSaveProgress;

    const saveMeta = channel?.seriesId ? {
      seriesId: channel.seriesId,
      season: channel.season,
      ep: channel.episodeNum,
      epName: channel.name,
    } : undefined;

    const doSave = () => {
      if (saveType !== "live" && video.currentTime > 10 && video.duration > 30) {
        saveFn?.(saveUrl, video.currentTime, video.duration, saveMeta);
      }
    };

    const onPlayEvt = () => setPaused(false);
    const onPause = () => {
      setPaused(true);
      doSave();
    };
    const onTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      // Auto-save every 15 seconds of playback
      const now = Math.floor(video.currentTime);
      if (now > 0 && now % 15 === 0 && now !== lastSaveTime) {
        lastSaveTime = now;
        doSave();
      }
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);

    // Stall recovery: detect when video is stuck and auto-recover
    let lastPlayPos = 0;
    let stallCount = 0;
    const stallCheck = setInterval(() => {
      if (!video.paused && !video.ended && video.readyState >= 2) {
        if (video.currentTime === lastPlayPos && video.currentTime > 0) {
          stallCount++;
          if (stallCount >= 3) {
            // Video stuck for ~3 seconds — try to recover
            stallCount = 0;
            if (hlsRef.current) {
              hlsRef.current.recoverMediaError();
            } else {
              // For non-HLS: nudge playback forward
              video.currentTime += 0.1;
              video.play().catch(() => {});
            }
          }
        } else {
          stallCount = 0;
        }
        lastPlayPos = video.currentTime;
      }
    }, 1000);

    video.addEventListener("play", onPlayEvt);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);

    // Auto-play next episode
    const onEnded = () => {
      doSave();
      if (saveType === "series" && channel?.episodes?.length) {
        const eps = channel.episodes;
        const idx = eps.findIndex((e) => e.url === saveUrl);
        if (idx >= 0 && idx < eps.length - 1) {
          const next = eps[idx + 1];
          onPlay?.({ ...next, episodes: eps, seriesName: channel.seriesName, seriesPoster: channel.seriesPoster });
        }
      }
    };
    video.addEventListener("ended", onEnded);

    return () => {
      cancelled = true;
      clearInterval(stallCheck);
      doSave();
      video.removeEventListener("play", onPlayEvt);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel, retryNonce]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts — guarded so Cmd/Ctrl combos (e.g. Cmd/Ctrl+K spotlight)
  // and typing in panel search inputs are never intercepted.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (v) v.paused ? v.play().catch(() => {}) : v.pause();
          break;
        case "ArrowLeft":
          if (!isLive && v) { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); }
          break;
        case "ArrowRight":
          if (!isLive && v) { e.preventDefault(); v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10); }
          break;
        case "m":
        case "M":
          e.preventDefault();
          if (v) { v.muted = !v.muted; setMuted(v.muted); }
          break;
        case "f":
        case "F":
          e.preventDefault();
          if (mode === "inline") {
            onModeChange?.("fullscreen");
          } else if (containerRef.current) {
            document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen();
          }
          break;
        case "Escape":
          if (document.fullscreenElement) return; // let native fullscreen exit handle it
          e.preventDefault();
          if (panelOpen) setPanelOpen(false);
          else if (epPanelOpen) setEpPanelOpen(false);
          else if (showSubMenu || showAudioMenu) { setShowSubMenu(false); setShowAudioMenu(false); }
          else onClose();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, mode, onModeChange, panelOpen, epPanelOpen, showSubMenu, showAudioMenu, onClose]);

  // Scroll active channel into view
  useEffect(() => {
    if (panelOpen && panelView === "channels") {
      setTimeout(() => {
        const el = document.querySelector(".drawer-item.active");
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 150);
    }
  }, [panelOpen, panelView, selectedGroup]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleVolume = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    if (val === 0) { v.muted = true; setMuted(true); }
    else if (v.muted) { v.muted = false; setMuted(false); }
  };

  const toggleFullscreen = () => {
    // In inline (side-panel) mode the bottom fullscreen control expands the
    // player back into the in-app fullscreen view first. From the in-app
    // fullscreen view it requests/exits real browser fullscreen.
    if (mode === "inline") {
      onModeChange?.("fullscreen");
      return;
    }
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleGroupClick = (g) => {
    setSelectedGroup(g);
    setPanelView("channels");
    setChSearch("");
  };

  const handleBackToGroups = () => {
    setPanelView("groups");
    setChSearch("");
  };

  const isInline = mode === "inline";
  const toggleMode = useCallback(() => {
    onModeChange?.(isInline ? "fullscreen" : "inline");
  }, [isInline, onModeChange]);

  return (
    <div className={`player-fullscreen player-${mode}${hasTitlebar ? " has-titlebar" : ""}`} ref={containerRef}>
      {/* Left side panel - live TV only, hidden in inline mode (LivePage shows the same list) */}
      {isLiveContent && !isInline && <div
        className={`player-panel${panelOpen ? " open" : ""}`}
        onMouseLeave={() => setPanelOpen(false)}
      >
        {panelView === "groups" ? (
          <>
            <div className="panel-header">
              <span className="panel-title">Groups</span>
              <span className="panel-count">{groups.length}</span>
            </div>
            <div className="panel-list">
              {groups.map((g) => (
                <div
                  key={g}
                  className={`panel-group-item${selectedGroup === g ? " active" : ""}`}
                  onClick={() => handleGroupClick(g)}
                >
                  <span className="panel-group-name">{g}</span>
                  <span className="panel-group-count">{groupCounts[g] || 0}</span>
                  <ChevronRightIcon />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="panel-header">
              <button className="panel-back" onClick={handleBackToGroups}>
                <ChevronLeftIcon />
              </button>
              <span className="panel-title">{selectedGroup}</span>
              <span className="panel-count">{groupChannels.length}</span>
            </div>
            <div className="panel-search">
              <input
                type="text"
                placeholder={selectedGroup ? `Search in ${selectedGroup}…` : "Search…"}
                value={chSearch}
                onChange={(e) => setChSearch(e.target.value)}
              />
            </div>
            <div className="panel-list">
              {groupChannels.map((ch) => (
                <div
                  key={ch.id}
                  className={`drawer-item${ch.url === channel?.url ? " active" : ""}`}
                  onClick={() => onPlay(ch)}
                >
                  <div className="drawer-item-logo">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" loading="lazy" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                    ) : null}
                    <span className="drawer-item-fallback" style={ch.logo ? { display: "none" } : {}}>
                      {ch.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="drawer-item-name">{ch.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>}

      {/* Hover trigger on left edge - live TV only, hidden in inline mode */}
      {isLiveContent && !isInline && (
        <div
          className={`panel-trigger${showControls ? " visible" : ""}`}
          onMouseEnter={() => setPanelOpen(true)}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <ChevronRightIcon />
        </div>
      )}

      {/* Episode sidebar for series */}
      {isSeriesContent && episodes.length > 0 && <div
        className={`player-panel${epPanelOpen ? " open" : ""}`}
        onMouseLeave={() => setEpPanelOpen(false)}
      >
        <div className="panel-header">
          <span className="panel-title">{channel?.seriesName || "Episodes"}</span>
          <span className="panel-count">{episodes.length}</span>
        </div>
        <div className="panel-list">
          {episodes.map((ep) => {
            const isCurrent = ep.url === channel?.url;
            const prog = watchProgress?.[ep.url];
            const isWatched = prog && prog.position > prog.duration * 0.9;
            return (
              <div
                key={ep.id}
                className={`ep-sidebar-item${isCurrent ? " active" : ""}${isWatched ? " watched" : ""}`}
                onClick={() => onPlay?.({ ...ep, episodes, seriesName: channel?.seriesName, seriesPoster: channel?.seriesPoster })}
              >
                {ep.thumb && <img src={ep.thumb} alt="" className="ep-sidebar-thumb" loading="lazy" />}
                {!ep.thumb && <span className="ep-sidebar-num">S{ep.season}E{ep.episodeNum}</span>}
                <div className="ep-sidebar-info">
                  <span className="ep-sidebar-label">S{ep.season}E{ep.episodeNum}</span>
                  <span className="ep-sidebar-name">{ep.name}</span>
                  {ep.duration && <span className="ep-sidebar-dur">{ep.duration}</span>}
                  {prog && !isWatched && prog.position > 10 && (
                    <div className="episode-progress-bar">
                      <div className="episode-progress-fill" style={{ width: `${Math.min((prog.position / prog.duration) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
                {isWatched && <span className="ep-sidebar-check">&#10003;</span>}
              </div>
            );
          })}
        </div>
      </div>}
      {isSeriesContent && episodes.length > 0 && (
        <div
          className={`panel-trigger${showControls ? " visible" : ""}`}
          onMouseEnter={() => setEpPanelOpen(true)}
          onClick={() => setEpPanelOpen((v) => !v)}
        >
          <ChevronRightIcon />
        </div>
      )}

      {/* Video area */}
      <div
        className="player-wrap"
        onMouseMove={resetControlsTimer}
        onClick={() => {
          if (panelOpen) { setPanelOpen(false); return; }
          if (epPanelOpen) { setEpPanelOpen(false); return; }
          togglePlay();
        }}
      >
        {error ? (
          <div className="player-error">
            <div className="player-error-icon" aria-hidden="true">⚠</div>
            <div className="player-error-name">{channel?.name || "Unknown"}</div>
            <p>{error}</p>
            <div className="player-error-actions">
              <button className="btn btn-primary" onClick={() => { setError(null); setBuffering(true); setRetryNonce((n) => n + 1); }}>Retry</button>
              <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="player-video" />
            {buffering && (
              <div className="player-buffering">
                <div className="player-spinner" />
              </div>
            )}
          </>
        )}

        {/* Top bar */}
        <div className={`player-top-bar${showControls ? " visible" : ""}`}>
          <div className="player-channel-name">{channel?.name || "Unknown"}</div>
          <div className="player-top-actions">
            <button
              className={`player-ctrl-btn player-fav-btn${isFav ? " is-fav" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleFav(); }}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={isFav ? "#f1c40f" : "none"} stroke={isFav ? "#f1c40f" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <button className="player-ctrl-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              <XIcon />
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className={`player-controls${showControls ? " visible" : ""}`}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => clearTimeout(controlsTimer.current)}
          onMouseLeave={resetControlsTimer}
        >
          {!isLive && duration > 0 && (
            <div className="player-progress">
              <input
                type="range" min={0} max={duration || 0} value={currentTime}
                onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = parseFloat(e.target.value); }}
                className="player-seek"
                style={{ "--seek-pct": `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          )}
          <div className="player-controls-row">
            <div className="player-controls-left">
              {isLiveContent && !isInline && (
                <button className="player-ctrl-btn" onClick={() => setPanelOpen((v) => !v)}>
                  <ListIcon />
                </button>
              )}
              {isSeriesContent && episodes.length > 0 && (
                <button className="player-ctrl-btn" onClick={() => setEpPanelOpen((v) => !v)}>
                  <ListIcon />
                </button>
              )}
              <button className="player-ctrl-btn" onClick={togglePlay}>
                {paused ? <PlayIcon /> : <PauseIcon />}
              </button>
              <button className="player-ctrl-btn" onClick={toggleMute}>
                <VolumeIcon muted={muted} level={volume} />
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume} onChange={handleVolume}
                className="player-volume"
              />
              {isLive ? (
                <span className="player-live-badge">LIVE</span>
              ) : (
                <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
              )}
            </div>
            <div className="player-controls-right">
              {!isLiveContent && (
                <>
                  <div className="track-menu-wrap">
                    <button className="player-ctrl-btn" onClick={() => { setShowSubMenu((v) => !v); setShowAudioMenu(false); }} title="Subtitles">
                      {subsLoading ? <div className="ctrl-spinner" /> : <SubtitleIcon />}
                    </button>
                    {showSubMenu && (
                      <div className="track-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="track-menu-title">Subtitles</div>
                        <div
                          className={`track-menu-item${activeSubTrack === -1 ? " active" : ""}`}
                          onClick={() => {
                            if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                            const v = videoRef.current;
                            if (v) for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = "disabled";
                            setActiveSubTrack(-1);
                            setShowSubMenu(false);
                          }}
                        >Off</div>
                        {subtitleTracks.map((t) => (
                          <div
                            key={t.id}
                            className={`track-menu-item${activeSubTrack === t.id ? " active" : ""}`}
                            onClick={async () => {
                              const v = videoRef.current;
                              if (!v) return;
                              for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = "disabled";
                              // Reuse already-downloaded track
                              let el = v.querySelector(`track[data-subid="${t.id}"]`);
                              if (el) {
                                el.track.mode = "showing";
                              } else if (t.fileId && window.electron?.downloadSub) {
                                setActiveSubTrack(t.id);
                                setShowSubMenu(false);
                                const srt = await window.electron.downloadSub(t.fileId);
                                if (!srt) return;
                                const vtt = "WEBVTT\n\n" + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
                                const blob = new Blob([vtt], { type: "text/vtt" });
                                el = document.createElement("track");
                                el.kind = "subtitles";
                                el.label = t.name;
                                el.srclang = t.lang || "und";
                                el.src = URL.createObjectURL(blob);
                                el.setAttribute("data-subid", t.id);
                                el.default = true;
                                v.appendChild(el);
                                el.addEventListener("load", () => { el.track.mode = "showing"; });
                                setTimeout(() => { try { el.track.mode = "showing"; } catch {} }, 200);
                                return;
                              } else if (hlsRef.current) {
                                hlsRef.current.subtitleTrack = t.id;
                              }
                              setActiveSubTrack(t.id);
                              setShowSubMenu(false);
                            }}
                          >{t.name}</div>
                        ))}
                        {subsLoading && <div className="track-menu-item disabled">Loading subtitles...</div>}
                        {!subsLoading && subtitleTracks.length === 0 && <div className="track-menu-item disabled">No subtitles</div>}
                        {activeSubTrack !== -1 && (
                          <div className="sub-offset">
                            <div className="sub-offset-label">
                              <span>Timing</span>
                              <span className="sub-offset-val">{subOffset > 0 ? "+" : ""}{subOffset.toFixed(1)}s</span>
                            </div>
                            <input type="range" min={-10} max={10} step={0.5} value={subOffset}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSubOffset(val);
                                const v = videoRef.current;
                                if (!v) return;
                                for (let i = 0; i < v.textTracks.length; i++) {
                                  const tt = v.textTracks[i];
                                  if (tt.mode === "showing" && tt.cues) {
                                    // Store originals on first use
                                    if (!tt._origTimes) {
                                      tt._origTimes = [];
                                      for (let j = 0; j < tt.cues.length; j++) {
                                        tt._origTimes.push({ s: tt.cues[j].startTime, e: tt.cues[j].endTime });
                                      }
                                    }
                                    // Apply offset from original times
                                    for (let j = 0; j < tt.cues.length; j++) {
                                      tt.cues[j].startTime = tt._origTimes[j].s + val;
                                      tt.cues[j].endTime = tt._origTimes[j].e + val;
                                    }
                                  }
                                }
                              }}
                            />
                            {subOffset !== 0 && (
                              <button className="sub-offset-reset" onClick={() => {
                                const v = videoRef.current;
                                if (v) {
                                  for (let i = 0; i < v.textTracks.length; i++) {
                                    const tt = v.textTracks[i];
                                    if (tt.mode === "showing" && tt.cues && tt._origTimes) {
                                      for (let j = 0; j < tt.cues.length; j++) {
                                        tt.cues[j].startTime = tt._origTimes[j].s;
                                        tt.cues[j].endTime = tt._origTimes[j].e;
                                      }
                                    }
                                  }
                                }
                                setSubOffset(0);
                              }}>Reset</button>
                            )}
                            <div className="sub-offset-label sub-offset-gap">
                              <span>Size</span>
                              <span className="sub-offset-val">{subSize.toFixed(1)}</span>
                            </div>
                            <input type="range" min={1} max={4} step={0.2} value={subSize}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSubSize(val);
                                const v = videoRef.current;
                                if (v) v.style.setProperty("--sub-size", val + "rem");
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="track-menu-wrap">
                    <button className="player-ctrl-btn" onClick={() => { setShowAudioMenu((v) => !v); setShowSubMenu(false); }} title="Audio">
                      <AudioIcon />
                    </button>
                    {showAudioMenu && (
                      <div className="track-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="track-menu-title">Audio</div>
                        {audioTracks.map((t) => (
                          <div
                            key={t.id}
                            className={`track-menu-item${activeAudioTrack === t.id ? " active" : ""}`}
                            onClick={() => {
                              if (t.native) {
                                const v = videoRef.current;
                                if (v?.audioTracks) {
                                  for (let i = 0; i < v.audioTracks.length; i++) v.audioTracks[i].enabled = (i === t.id);
                                }
                              } else if (hlsRef.current) {
                                hlsRef.current.audioTrack = t.id;
                              }
                              setActiveAudioTrack(t.id);
                              setShowAudioMenu(false);
                            }}
                          >{t.name}</div>
                        ))}
                        {audioTracks.length === 0 && <div className="track-menu-item disabled">Default audio</div>}
                      </div>
                    )}
                  </div>
                </>
              )}
              <button className="player-ctrl-btn" onClick={toggleFullscreen}>
                {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
