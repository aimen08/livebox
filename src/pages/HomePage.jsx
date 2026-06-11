import React from "react";
import { TvIcon, FolderIcon, LinkIcon, FilmIcon, MonitorIcon } from "../components/Icons";

// Keyboard-activation helper for clickable divs (a11y, spec §2.9)
const onActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

function WelcomeLogo() {
  return (
    <svg width="88" height="88" viewBox="0 0 512 512" fill="none">
      <defs>
        <linearGradient id="logo-grad" x1="100" y1="100" x2="420" y2="420">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="50%" stopColor="var(--accent-bright)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#141218" />
      <ellipse cx="256" cy="240" rx="120" ry="90" fill="var(--accent)" opacity="0.12" />
      <rect x="106" y="120" width="300" height="200" rx="24" fill="#1e1c24" />
      <rect x="106" y="120" width="300" height="200" rx="24" stroke="url(#logo-grad)" strokeWidth="6" fill="none" />
      <path d="M350,100 Q370,80 390,100" stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M362,86 Q375,72 388,86" stroke="url(#logo-grad)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
      <circle cx="375" cy="78" r="3" fill="var(--accent)" />
      <polygon points="224,178 224,262 304,220" fill="white" />
      <rect x="220" y="328" width="72" height="8" rx="4" fill="url(#logo-grad)" />
      <rect x="246" y="320" width="20" height="16" rx="4" fill="url(#logo-grad)" />
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

function HomePage({
  channels,
  movies,
  series,
  onPlay,
  onNavigate,
  onOpenFile,
  onOpenURL,
  onOpenSeries,
  onOpenSearch,
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
          Supports M3U playlists — Xtream <span className="kbd">get.php</span> URLs supported
        </p>
      </div>
    );
  }

  return (
    <div className="home-dashboard fade-in">
      <div className="home-header">
        <div className="home-header-left">
          <h1 className="home-greeting">LiveBox</h1>
          <p className="home-sub">What would you like to watch?</p>
        </div>
        <button type="button" className="home-search-hint" onClick={onOpenSearch}>
          <span>Search</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      <div className="home-cards">
        {channels.length > 0 && (
          <div
            className="home-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("live")}
            onKeyDown={onActivate(() => onNavigate("live"))}
          >
            <div className="home-card-icon"><MonitorIcon /></div>
            <div className="home-card-info">
              <span className="home-card-title">Live TV</span>
              <span className="home-card-count">{channels.length} channels</span>
            </div>
          </div>
        )}
        {movies.length > 0 && (
          <div
            className="home-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("movies")}
            onKeyDown={onActivate(() => onNavigate("movies"))}
          >
            <div className="home-card-icon"><FilmIcon /></div>
            <div className="home-card-info">
              <span className="home-card-title">Movies</span>
              <span className="home-card-count">{movies.length} titles</span>
            </div>
          </div>
        )}
        {series.length > 0 && (
          <div
            className="home-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("series")}
            onKeyDown={onActivate(() => onNavigate("series"))}
          >
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
                <div
                  key={item.url}
                  className="poster-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlay(item)}
                  onKeyDown={onActivate(() => onPlay(item))}
                >
                  <div className="poster-img-wrap">
                    {item.poster ? (
                      <img src={item.poster} alt="" loading="lazy" className="poster-img" />
                    ) : (
                      <div className="poster-fallback">{item.name.charAt(0)}</div>
                    )}
                    <div className="poster-continue">
                      <div className="poster-continue-text">{Math.floor(item.progress.position / 60)}m watched</div>
                      <div className="poster-continue-bar">
                        <div className="poster-continue-fill" style={{ width: `${Math.min((item.progress.position / item.progress.duration) * 100, 100)}%` }} />
                      </div>
                    </div>
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
              <div
                key={m.id}
                className="poster-card"
                role="button"
                tabIndex={0}
                onClick={() => onPlay(m)}
                onKeyDown={onActivate(() => onPlay(m))}
              >
                <div className="poster-img-wrap">
                  {m.poster ? (
                    <img src={m.poster} alt="" loading="lazy" className="poster-img" />
                  ) : (
                    <div className="poster-fallback">{m.name.charAt(0)}</div>
                  )}
                </div>
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
              <div
                key={s.id}
                className="poster-card"
                role="button"
                tabIndex={0}
                onClick={() => onOpenSeries(s)}
                onKeyDown={onActivate(() => onOpenSeries(s))}
              >
                <div className="poster-img-wrap">
                  {s.poster ? (
                    <img src={s.poster} alt="" loading="lazy" className="poster-img" />
                  ) : (
                    <div className="poster-fallback">{s.name.charAt(0)}</div>
                  )}
                </div>
                <span className="poster-name">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(HomePage);
