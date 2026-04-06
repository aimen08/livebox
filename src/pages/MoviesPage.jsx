import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SearchIcon, StarIcon } from "../components/Icons";

const BATCH_SIZE = 40;

function MovieCard({ movie, onPlay, isFav, onToggleFav, progress }) {
  const hasProgress = progress && progress.position > 30 && progress.position < progress.duration * 0.95;
  return (
    <div className="poster-card" onClick={() => onPlay(movie)}>
      <div className="poster-img-wrap">
        {movie.poster ? (
          <img src={movie.poster} alt="" loading="lazy" className="poster-img" />
        ) : (
          <div className="poster-fallback">{movie.name.charAt(0)}</div>
        )}
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
      {movie.rating && <span className="poster-rating">{movie.rating}</span>}
      <button
        className={`poster-fav${isFav ? " is-fav" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleFav(movie); }}
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <StarIcon />
      </button>
    </div>
  );
}

const MemoMovieCard = React.memo(MovieCard);

export default function MoviesPage({ movies, groups, onPlay, favorites, onToggleFav, watchProgress }) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
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

  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
    }
  }, [filtered.length]);

  if (!movies.length) return <div className="no-results">No movies available</div>;

  return (
    <div className="browse-layout fade-in">
      <div className="groups-panel">
        <div className="groups-panel-header">
          <span className="groups-panel-title">Movies</span>
          <span className="groups-panel-count">{groups.length}</span>
        </div>
        <div className="groups-panel-list">
          {groups.map((g) => (
            <div
              key={g}
              className={`group-item${activeGroup === g ? " active" : ""}`}
              onClick={() => setActiveGroup(g)}
            >
              <span className="group-item-name">{g}</span>
              <span className="group-item-count">{groupCounts[g] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="channels-panel">
        <div className="channels-panel-header">
          <h1 className="channels-panel-title">{activeGroup || "Movies"}</h1>
          <span className="channel-count">{filtered.length} movies</span>
        </div>

        <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder="Search movies..." value={search}
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
          {visibleCount < filtered.length && <div className="ch-list-loading">Loading more...</div>}
        </div>
      </div>
    </div>
  );
}
