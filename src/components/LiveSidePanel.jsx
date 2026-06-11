import React from "react";

// Side panel pinned to the right of the Live page. Holds the inline-player
// slot (top half of the right side). When a channel is playing, the inline
// Player overlays this area via fixed positioning. When nothing is playing,
// we show an empty player frame so the slot is visible and obviously a player.
function LiveSidePanel({ playing }) {
  return (
    <aside className="live-side-panel" aria-hidden={false}>
      <div className="live-side-top">
        {!playing && (
          <div className="live-side-empty-player">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
            <div className="live-side-empty-title">Live TV</div>
            <div className="live-side-empty-sub">Pick a channel from the list</div>
          </div>
        )}
      </div>
      {/* Display-only bottom area — pointer-events: none always (click-through preserved) */}
      <div className="live-side-bottom">
        {playing ? (
          <div className="live-side-card live-side-now">
            <div className="live-side-now-logo">
              {playing.logo ? (
                <img src={playing.logo} alt="" loading="lazy" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
              ) : null}
              <span className="ch-row-fallback" style={playing.logo ? { display: "none" } : {}}>
                {(playing.name || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="live-side-now-info">
              <span className="live-side-now-name" title={playing.name}>{playing.name}</span>
              {playing.group ? (
                <span className="live-side-now-group">{playing.group}</span>
              ) : null}
            </div>
            <span className="live-side-live-pill">Live</span>
          </div>
        ) : (
          <div className="live-side-card live-side-hints">
            <div className="live-side-hint"><kbd className="kbd">⌘K</kbd> Search</div>
            <div className="live-side-hint"><kbd className="kbd">Space</kbd> Play / Pause</div>
            <div className="live-side-hint"><kbd className="kbd">F</kbd> Fullscreen</div>
            <div className="live-side-hint"><kbd className="kbd">M</kbd> Mute</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default React.memo(LiveSidePanel);
