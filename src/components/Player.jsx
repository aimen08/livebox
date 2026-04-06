import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { XIcon } from "./Icons";

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

export default function Player({ channel, onClose, channels, groups, favorites, onPlay, onToggleFav, contentType = "live", onSaveProgress, watchProgress }) {
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
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const isLiveContent = contentType === "live";
  const isSeriesContent = contentType === "series";
  const episodes = channel?.episodes || [];
  const [epPanelOpen, setEpPanelOpen] = useState(false);

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

    if ((isHlsUrl || isTsUrl) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        startPosition: startAt > 0 ? startAt : -1,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      const updateAudioTracks = () => {
        if (hls.audioTracks?.length > 0) {
          setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, name: t.name || t.lang || `Track ${i + 1}`, lang: t.lang })));
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
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            setError("Stream unavailable or failed to load");
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl") && isHlsUrl) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        setIsLive(false);
        if (startAt > 0) video.currentTime = startAt;
        video.play().catch(() => {});
        // Detect native audio tracks
        if (video.audioTracks?.length > 1) {
          const tracks = [];
          for (let i = 0; i < video.audioTracks.length; i++) {
            const t = video.audioTracks[i];
            tracks.push({ id: i, name: t.label || t.language || `Track ${i + 1}`, lang: t.language });
          }
          setAudioTracks(tracks);
        }
        // Detect native text tracks
        if (video.textTracks?.length > 0) {
          const tracks = [];
          for (let i = 0; i < video.textTracks.length; i++) {
            const t = video.textTracks[i];
            tracks.push({ id: i, name: t.label || t.language || `Sub ${i + 1}`, lang: t.language });
          }
          setSubtitleTracks(tracks);
        }
      });
      video.addEventListener("error", () => setError("Failed to load stream"));
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
          onPlay?.({ ...next, episodes: eps, seriesName: channel.seriesName });
        }
      }
    };
    video.addEventListener("ended", onEnded);

    return () => {
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
      video.src = "";
    };
  }, [channel]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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

  return (
    <div className="player-fullscreen" ref={containerRef}>
      {/* Left side panel - live TV only */}
      {isLiveContent && <div
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
                placeholder="Search..."
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

      {/* Hover trigger on left edge - live TV only */}
      {isLiveContent && (
        <div
          className="panel-trigger"
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
                onClick={() => onPlay?.({ ...ep, episodes, seriesName: channel?.seriesName })}
              >
                <span className="ep-sidebar-num">S{ep.season}E{ep.episodeNum}</span>
                <div className="ep-sidebar-info">
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
          className="panel-trigger"
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
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
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
          <button className="player-ctrl-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <XIcon />
          </button>
        </div>

        {/* Bottom controls */}
        <div
          className={`player-controls${showControls ? " visible" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!isLive && duration > 0 && (
            <div className="player-progress">
              <input
                type="range" min={0} max={duration || 0} value={currentTime}
                onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = parseFloat(e.target.value); }}
                className="player-seek"
              />
            </div>
          )}
          <div className="player-controls-row">
            <div className="player-controls-left">
              {isLiveContent && (
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
                      <SubtitleIcon />
                    </button>
                    {showSubMenu && (
                      <div className="track-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="track-menu-title">Subtitles</div>
                        <div
                          className={`track-menu-item${hlsRef.current?.subtitleTrack === -1 ? " active" : ""}`}
                          onClick={() => { if (hlsRef.current) hlsRef.current.subtitleTrack = -1; setShowSubMenu(false); }}
                        >Off</div>
                        {subtitleTracks.map((t) => (
                          <div
                            key={t.id}
                            className={`track-menu-item${hlsRef.current?.subtitleTrack === t.id ? " active" : ""}`}
                            onClick={() => { if (hlsRef.current) hlsRef.current.subtitleTrack = t.id; setShowSubMenu(false); }}
                          >{t.name}</div>
                        ))}
                        {subtitleTracks.length === 0 && <div className="track-menu-item disabled">No subtitles</div>}
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
                            className={`track-menu-item${hlsRef.current?.audioTrack === t.id ? " active" : ""}`}
                            onClick={() => { if (hlsRef.current) hlsRef.current.audioTrack = t.id; setShowAudioMenu(false); }}
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
