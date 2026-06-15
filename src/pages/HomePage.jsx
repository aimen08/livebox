import React, { useMemo } from "react";
import { TvIcon, FolderIcon, LinkIcon, FilmIcon, MonitorIcon } from "../components/Icons";
import Billboard from "../components/Billboard";
import Shelf from "../components/Shelf";
import PreviewCard from "../components/PreviewCard";

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
  favorites,
  onToggleFav,
}) {
  // Continue Watching — match watchProgress to movies (verbatim from prior logic)
  const continueItems = useMemo(() => {
    if (!watchProgress) return [];
    const items = [];
    for (const m of movies) {
      const p = watchProgress[m.url];
      if (p && p.position > 30 && p.position < p.duration * 0.95) {
        items.push({ ...m, progress: p, type: "movie" });
      }
    }
    items.sort((a, b) => (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0));
    return items.slice(0, 10);
  }, [watchProgress, movies]);

  // Top movie genre rows — first 6 distinct groups, with their (capped) items.
  // Built in a SINGLE pass over `movies` and memoized: the old code re-ran a
  // full `movies.filter()` per genre on every render (6× full-array scans of a
  // multi-thousand-item list), a real source of render/navigation jank.
  const movieGenreShelves = useMemo(() => {
    const order = [];
    const byGroup = new Map();
    for (const m of movies) {
      if (!m.group) continue;
      let bucket = byGroup.get(m.group);
      if (!bucket) {
        if (order.length >= 6) continue;
        bucket = [];
        byGroup.set(m.group, bucket);
        order.push(m.group);
      }
      if (bucket.length < 20) bucket.push(m);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g) }));
  }, [movies]);

  // Top series genre rows — first 4 distinct groups, same single-pass build.
  const seriesGenreShelves = useMemo(() => {
    const order = [];
    const byGroup = new Map();
    for (const s of series) {
      if (!s.group) continue;
      let bucket = byGroup.get(s.group);
      if (!bucket) {
        if (order.length >= 4) continue;
        bucket = [];
        byGroup.set(s.group, bucket);
        order.push(s.group);
      }
      if (bucket.length < 20) bucket.push(s);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g) }));
  }, [series]);

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

  const featured = series[0] || movies[0] || null;
  const featuredKind = series[0] ? "series" : "movie";
  const featuredAction = featuredKind === "series" ? onOpenSeries : onPlay;

  const favs = favorites || {};
  const movieIsFav = (m) => !!favs[m.url || m.streamId];
  const seriesIsFav = (s) => !!favs[s.seriesId];

  const renderMovieCard = (m) => (
    <PreviewCard
      item={m}
      kind="movie"
      isFav={movieIsFav(m)}
      progress={m.progress}
      onPlay={onPlay}
      onDetail={onPlay}
      onToggleFav={onToggleFav}
    />
  );

  const renderSeriesCard = (s) => (
    <PreviewCard
      item={s}
      kind="series"
      isFav={seriesIsFav(s)}
      onPlay={onOpenSeries}
      onDetail={onOpenSeries}
      onToggleFav={onToggleFav}
    />
  );

  return (
    <div className="home-dashboard fade-in">
      <Billboard
        item={featured}
        kind={featuredKind}
        onPlay={featuredAction}
        onMoreInfo={featuredAction}
      />

      <Shelf
        title="Continue Watching"
        items={continueItems}
        renderItem={renderMovieCard}
      />

      <Shelf
        title="Recently Added Movies"
        items={movies.slice(0, 20)}
        renderItem={renderMovieCard}
        onSeeAll={() => onNavigate("movies")}
      />

      <Shelf
        title="Recently Added Series"
        items={series.slice(0, 20)}
        renderItem={renderSeriesCard}
        onSeeAll={() => onNavigate("series")}
      />

      {movieGenreShelves.map(({ group, items }) => (
        <Shelf
          key={`mg-${group}`}
          title={group}
          items={items}
          renderItem={renderMovieCard}
          onSeeAll={() => onNavigate("movies")}
        />
      ))}

      {seriesGenreShelves.map(({ group, items }) => (
        <Shelf
          key={`sg-${group}`}
          title={group}
          items={items}
          renderItem={renderSeriesCard}
          onSeeAll={() => onNavigate("series")}
        />
      ))}
    </div>
  );
}

export default React.memo(HomePage);
