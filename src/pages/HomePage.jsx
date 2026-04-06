import React from "react";
import { TvIcon, FolderIcon, LinkIcon, FilmIcon, MonitorIcon } from "../components/Icons";

function WelcomeLogo() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="80" y2="80">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-bright)" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#logo-grad)" opacity="0.12" />
      <rect x="16" y="22" width="48" height="32" rx="6" stroke="url(#logo-grad)" strokeWidth="3" fill="none" />
      <polygon points="34,32 34,48 48,40" fill="url(#logo-grad)" />
      <line x1="30" y1="58" x2="50" y2="58" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="54" x2="40" y2="58" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
      <polyline points="50,18 40,22 30,18" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function FeatureItem({ icon, title, desc }) {
  return (
    <div className="welcome-feature">
      <div className="welcome-feature-icon">{icon}</div>
      <div>
        <div className="welcome-feature-title">{title}</div>
        <div className="welcome-feature-desc">{desc}</div>
      </div>
    </div>
  );
}

export default function HomePage({
  channels,
  movies,
  series,
  onPlay,
  onNavigate,
  onOpenFile,
  onOpenURL,
  hasContent,
  watchProgress,
}) {
  if (!hasContent) {
    return (
      <div className="welcome-page fade-in">
        <div className="welcome-hero">
          <WelcomeLogo />
          <h1 className="welcome-title">LiveBox</h1>
          <p className="welcome-sub">Your all-in-one streaming player for Live TV, Movies & Series</p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={onOpenURL}>
              <LinkIcon /> Add Playlist URL
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onOpenFile}>
              <FolderIcon /> Open M3U File
            </button>
          </div>
        </div>

        <div className="welcome-features">
          <FeatureItem
            icon={<MonitorIcon />}
            title="Live TV"
            desc="Watch thousands of live channels from around the world"
          />
          <FeatureItem
            icon={<FilmIcon />}
            title="Movies"
            desc="Browse and stream movies on demand with subtitles"
          />
          <FeatureItem
            icon={<TvIcon size={22} />}
            title="Series"
            desc="Binge your favorite shows with full season support"
          />
        </div>

        <p className="welcome-hint">
          Supports M3U playlists and Xtream Codes API
        </p>
      </div>
    );
  }

  return (
    <div className="home-dashboard fade-in">
      <h1 className="home-greeting">LiveBox</h1>
      <p className="home-sub">What would you like to watch?</p>

      <div className="home-cards">
        {channels.length > 0 && (
          <div className="home-card" onClick={() => onNavigate("live")}>
            <div className="home-card-icon"><MonitorIcon /></div>
            <div className="home-card-info">
              <span className="home-card-title">Live TV</span>
              <span className="home-card-count">{channels.length} channels</span>
            </div>
          </div>
        )}
        {movies.length > 0 && (
          <div className="home-card" onClick={() => onNavigate("movies")}>
            <div className="home-card-icon"><FilmIcon /></div>
            <div className="home-card-info">
              <span className="home-card-title">Movies</span>
              <span className="home-card-count">{movies.length} titles</span>
            </div>
          </div>
        )}
        {series.length > 0 && (
          <div className="home-card" onClick={() => onNavigate("series")}>
            <div className="home-card-icon"><TvIcon size={22} /></div>
            <div className="home-card-info">
              <span className="home-card-title">Series</span>
              <span className="home-card-count">{series.length} shows</span>
            </div>
          </div>
        )}
      </div>

      {watchProgress && (() => {
        const items = [];
        // Match progress URLs to movies
        for (const m of movies) {
          const p = watchProgress[m.url];
          if (p && p.position > 30 && p.position < p.duration * 0.95) {
            items.push({ ...m, progress: p, type: "movie" });
          }
        }
        items.sort((a, b) => (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0));
        if (!items.length) return null;
        return (
          <div className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">Continue Watching</h2>
            </div>
            <div className="poster-row">
              {items.slice(0, 10).map((item) => (
                <div key={item.url} className="poster-card" onClick={() => onPlay(item)}>
                  {item.poster ? (
                    <img src={item.poster} alt="" loading="lazy" className="poster-img" />
                  ) : (
                    <div className="poster-fallback">{item.name.charAt(0)}</div>
                  )}
                  <div className="continue-progress">
                    <div className="continue-progress-fill" style={{ width: `${Math.min((item.progress.position / item.progress.duration) * 100, 100)}%` }} />
                  </div>
                  <span className="poster-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {movies.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">Recently Added Movies</h2>
            <button className="home-see-all" onClick={() => onNavigate("movies")}>See all</button>
          </div>
          <div className="poster-row">
            {movies.slice(0, 10).map((m) => (
              <div key={m.id} className="poster-card" onClick={() => onPlay(m)}>
                {m.poster ? (
                  <img src={m.poster} alt="" loading="lazy" className="poster-img" />
                ) : (
                  <div className="poster-fallback">{m.name.charAt(0)}</div>
                )}
                <span className="poster-name">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {series.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">Recently Added Series</h2>
            <button className="home-see-all" onClick={() => onNavigate("series")}>See all</button>
          </div>
          <div className="poster-row">
            {series.slice(0, 10).map((s) => (
              <div key={s.id} className="poster-card" onClick={() => onNavigate("series")}>
                {s.poster ? (
                  <img src={s.poster} alt="" loading="lazy" className="poster-img" />
                ) : (
                  <div className="poster-fallback">{s.name.charAt(0)}</div>
                )}
                <span className="poster-name">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
