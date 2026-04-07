import React, { useState } from "react";

const ACCENT_COLORS = [
  { name: "Red", primary: "#e50914", bright: "#ff1a24", dim: "rgba(229,9,20,0.15)" },
  { name: "Blue", primary: "#0984e3", bright: "#28a0f5", dim: "rgba(9,132,227,0.15)" },
  { name: "Purple", primary: "#6c5ce7", bright: "#8577ed", dim: "rgba(108,92,231,0.15)" },
  { name: "Green", primary: "#00b894", bright: "#1dd1a1", dim: "rgba(0,184,148,0.15)" },
  { name: "Orange", primary: "#e17055", bright: "#f0826d", dim: "rgba(225,112,85,0.15)" },
  { name: "Pink", primary: "#fd79a8", bright: "#ff9ec0", dim: "rgba(253,121,168,0.15)" },
  { name: "Teal", primary: "#00cec9", bright: "#55efc4", dim: "rgba(0,206,201,0.15)" },
  { name: "Gold", primary: "#fdcb6e", bright: "#ffeaa7", dim: "rgba(253,203,110,0.15)" },
];

function SettingRow({ label, desc, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row-info">
        <span className="setting-row-label">{label}</span>
        {desc && <span className="setting-row-desc">{desc}</span>}
      </div>
      <div className="setting-row-action">{children}</div>
    </div>
  );
}

function SettingSection({ title, children }) {
  return (
    <div className="setting-section">
      <h3 className="setting-section-title">{title}</h3>
      <div className="setting-section-body">{children}</div>
    </div>
  );
}

function SettingsPage({
  accentIndex, onAccentChange, recentURLs, onClearRecent,
  onResetAll, onClearProgress, onClearFavorites, onClearPlaylist,
  favCount, progressCount,
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="settings-page fade-in">
      <h1 className="page-title">Settings</h1>

      <SettingSection title="Appearance">
        <SettingRow label="Accent Color" desc="Choose your theme color">
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
        </SettingRow>
      </SettingSection>

      <SettingSection title="Playlist">
        <SettingRow label="Recent Playlists" desc={`${recentURLs.length} saved`}>
          <button className="btn btn-sm btn-secondary" onClick={onClearRecent} disabled={!recentURLs.length}>
            Clear
          </button>
        </SettingRow>
        <SettingRow label="Disconnect Playlist" desc="Remove saved login and channel data">
          <button className="btn btn-sm btn-secondary" onClick={onClearPlaylist}>
            Disconnect
          </button>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Data">
        <SettingRow label="Favorites" desc={`${favCount} items saved`}>
          <button className="btn btn-sm btn-secondary" onClick={onClearFavorites} disabled={!favCount}>
            Clear All
          </button>
        </SettingRow>
        <SettingRow label="Watch History" desc={`${progressCount} items tracked`}>
          <button className="btn btn-sm btn-secondary" onClick={onClearProgress} disabled={!progressCount}>
            Clear All
          </button>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Danger Zone">
        {!confirmReset ? (
          <SettingRow label="Reset Everything" desc="Delete all data and start fresh">
            <button className="btn btn-sm btn-danger" onClick={() => setConfirmReset(true)}>
              Reset
            </button>
          </SettingRow>
        ) : (
          <div className="setting-confirm">
            <p>This will delete all favorites, watch history, playlists, and settings. This cannot be undone.</p>
            <div className="setting-confirm-actions">
              <button className="btn btn-sm btn-secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn btn-sm btn-danger" onClick={() => { onResetAll(); setConfirmReset(false); }}>
                Yes, Reset Everything
              </button>
            </div>
          </div>
        )}
      </SettingSection>

      <div className="settings-about">
        <span className="settings-about-name">LiveBox</span>
        <span className="settings-about-ver">v1.0.0</span>
      </div>
    </div>
  );
}

export { ACCENT_COLORS };
export default React.memo(SettingsPage);
