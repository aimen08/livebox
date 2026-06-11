import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SearchIcon, StarIcon, FilmIcon } from "../components/Icons";
import Billboard from "../components/Billboard";
import Shelf from "../components/Shelf";
import PreviewCard from "../components/PreviewCard";

const BATCH_SIZE = 40;
const BROWSE_SHELF_CAP = 12;
const SHELF_ITEM_CAP = 20;

const onActivate = (fn) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

function MovieCard({ movie, onPlay, isFav, onToggleFav, progress }) {
  const hasProgress = progress && progress.position > 30 && progress.position < progress.duration * 0.95;
  return (
    <div
      className="poster-card"
      role="button"
      tabIndex={0}
      onClick={() => onPlay(movie)}
      onKeyDown={onActivate(() => onPlay(movie))}
    >
      <div className="poster-img-wrap">
        {movie.poster ? (
          <img src={movie.poster} alt="" loading="lazy" className="poster-img" />
        ) : (
          <div className="poster-fallback">{movie.name.charAt(0)}</div>
        )}
        {movie.rating && <span className="poster-rating">{movie.rating}</span>}
        <button
          className={`poster-fav${isFav ? " is-fav" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(movie); }}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <StarIcon />
        </button>
        {hasProgress && (
          <div className="poster-continue">
            <div className="poster-continue-text">{Math.floor(progress.position / 60)}m watched</div>
            <div className="poster-continue-bar">
              <div className="poster-continue-fill" style={{ width: `${Math.min((progress.position / progress.duration) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <span className="poster-name">{movie.name}</span>
    </div>
  );
}

const MemoMovieCard = React.memo(MovieCard);

function MoviesPage({ movies, groups, onPlay, favorites, onToggleFav, watchProgress }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [browseMode, setBrowseMode] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    if (groups.length && !activeGroup) setActiveGroup(groups[0]);
  }, [groups, activeGroup]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeGroup, search]);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const m of movies) counts[m.group] = (counts[m.group] || 0) + 1;
    return counts;
  }, [movies]);

  const visibleGroups = useMemo(() => {
    if (!groupFilter.trim()) return groups;
    const q = groupFilter.toLowerCase();
    return groups.filter((g) => g.toLowerCase().includes(q));
  }, [groups, groupFilter]);

  const filtered = useMemo(() => {
    if (!activeGroup) return [];
    let list = movies.filter((m) => m.group === activeGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [movies, activeGroup, search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const browseShelves = useMemo(() => {
    return groups.slice(0, BROWSE_SHELF_CAP).map((g) => ({
      group: g,
      items: movies.filter((m) => m.group === g).slice(0, SHELF_ITEM_CAP),
    }));
  }, [groups, movies]);

  const openGroupGrid = useCallback((g) => {
    setActiveGroup(g);
    setSearch("");
    setBrowseMode(false);
  }, []);

  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
    }
  }, [filtered.length]);

  if (!movies.length) {
    return (
      <div className="empty-state">
        <FilmIcon />
        <h2>No movies available</h2>
        <p>Add a playlist with VOD content to browse movies</p>
      </div>
    );
  }

  if (browseMode) {
    return (
      <div className="movies-browse fade-in">
        <Billboard item={movies[0]} kind="movie" onPlay={onPlay} onMoreInfo={onPlay} />
        {browseShelves.map(({ group, items }) => (
          <Shelf
            key={group}
            title={group}
            items={items}
            onSeeAll={() => openGroupGrid(group)}
            renderItem={(m) => (
              <PreviewCard
                item={m}
                kind="movie"
                isFav={!!favorites[m.url || m.streamId]}
                progress={watchProgress?.[m.url]}
                onPlay={onPlay}
                onDetail={onPlay}
                onToggleFav={onToggleFav}
              />
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="browse-layout fade-in">
      <div className="groups-panel">
        <div className="groups-panel-header">
          <span className="groups-panel-title">Movies</span>
          <span className="groups-panel-count">{groups.length}</span>
        </div>
        {groups.length > 12 && (
          <input
            type="text"
            className="group-filter"
            placeholder="Filter groups…"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          />
        )}
        <div className="groups-panel-list">
          {visibleGroups.map((g) => (
            <div
              key={g}
              className={`group-item${activeGroup === g ? " active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveGroup(g)}
              onKeyDown={onActivate(() => setActiveGroup(g))}
            >
              <span className="group-item-name">{g}</span>
              <span className="group-item-count">{groupCounts[g] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="channels-panel">
        <div className="channels-panel-header">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBrowseMode(true)}>
            ← All movies
          </button>
          <h1 className="channels-panel-title">{activeGroup || "Movies"}</h1>
          <span className="channel-count">{filtered.length} movies</span>
        </div>

        <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder={activeGroup ? `Search in ${activeGroup}…` : "Search…"} value={search}
            onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch("")}>&times;</button>}
        </div>

        <div className="poster-grid" ref={listRef} onScroll={handleScroll}>
          {visible.length === 0 ? (
            <div className="no-results">No movies found</div>
          ) : (
            visible.map((m) => (
              <MemoMovieCard
                key={m.id} movie={m} onPlay={onPlay}
                isFav={!!favorites[m.url || m.streamId]}
                onToggleFav={onToggleFav}
                progress={watchProgress?.[m.url]}
              />
            ))
          )}
          {visibleCount < filtered.length && (
            <div className="ch-list-loading">
              <div className="skeleton skeleton-poster" />
              <div className="skeleton skeleton-poster" />
              <div className="skeleton skeleton-poster" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(MoviesPage);
