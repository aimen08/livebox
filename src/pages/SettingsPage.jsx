import React from "react";

const ACCENT_COLORS = [
  { name: "Red", primary: "#e50914", bright: "#ff1a24", dim: "rgba(229,9,20,0.15)" },
  { name: "Blue", primary: "#0984e3", bright: "#28a0f5", dim: "rgba(9,132,227,0.15)" },
  { name: "Purple", primary: "#6c5ce7", bright: "#8577ed", dim: "rgba(108,92,231,0.15)" },
  { name: "Green", primary: "#00b894", bright: "#1dd1a1", dim: "rgba(0,184,148,0.15)" },
  { name: "Orange", primary: "#e17055", bright: "#f0826d", dim: "rgba(225,112,85,0.15)" },
  { name: "Pink", primary: "#fd79a8", bright: "#ff9ec0", dim: "rgba(253,121,168,0.15)" },
];

export default function SettingsPage({ accentIndex, onAccentChange, recentURLs, onClearRecent }) {
  return (
    <div className="page-content fade-in">
      <h1 className="page-title">Settings</h1>

      <div className="settings-section">
        <h3 className="settings-label">Accent Color</h3>
        <div className="accent-row">
          {ACCENT_COLORS.map((c, i) => (
            <button
              key={c.name}
              className={`accent-swatch${accentIndex === i ? " active" : ""}`}
              style={{ background: c.primary }}
              onClick={() => onAccentChange(i)}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-label">Recent Playlists</h3>
        {recentURLs.length === 0 ? (
          <p className="settings-muted">No recent playlists</p>
        ) : (
          <>
            <ul className="recent-list">
              {recentURLs.map((u, i) => (
                <li key={i} className="recent-item">{u}</li>
              ))}
            </ul>
            <button className="btn btn-secondary" onClick={onClearRecent}>Clear Recent</button>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-label">About</h3>
        <p className="settings-muted">LiveBox v1.0.0 - M3U IPTV Player</p>
      </div>
    </div>
  );
}

export { ACCENT_COLORS };
