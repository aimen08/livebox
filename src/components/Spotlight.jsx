import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SearchIcon } from "./Icons";

const MAX_RESULTS = 30;

// Score a single item against a lowercase query.
// Higher = better. Returns 0 if no match.
function scoreMatch(name, query) {
  if (!name) return 0;
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx < 0) return 0;
  // Exact full-string match wins
  if (lower === query) return 1000;
  // Starts with query
  if (idx === 0) return 500 - name.length * 0.1;
  // Word-start match (preceded by space, dash, dot, paren)
  const prev = lower[idx - 1];
  if (prev === " " || prev === "-" || prev === "." || prev === "(" || prev === "[") {
    return 300 - name.length * 0.1;
  }
  // Anywhere
  return 100 - idx;
}

// Build a flat list of search candidates with their type tag once,
// then re-rank on every query. Cheaper than scanning three lists per keystroke.
function useCandidates(channels, movies, series) {
  return useMemo(() => {
    const list = [];
    for (const c of channels) list.push({ type: "live", item: c, name: c.name });
    for (const m of movies) list.push({ type: "movie", item: m, name: m.name });
    for (const s of series) list.push({ type: "series", item: s, name: s.name });
    return list;
  }, [channels, movies, series]);
}

export default function Spotlight({
  channels, movies, series,
  onPlayLive, onPlayMovie, onOpenSeries,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const candidates = useCandidates(channels, movies, series);

  // Focus the input as soon as the modal mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const scored = [];
    for (const c of candidates) {
      const s = scoreMatch(c.name, q);
      if (s > 0) scored.push({ ...c, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS);
  }, [query, candidates]);

  // Reset highlight whenever the result set changes
  useEffect(() => { setActiveIdx(0); }, [results]);

  // Keep the highlighted row in view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const select = useCallback((r) => {
    if (!r) return;
    if (r.type === "live") onPlayLive(r.item);
    else if (r.type === "movie") onPlayMovie(r.item);
    else if (r.type === "series") onOpenSeries(r.item);
    onClose();
  }, [onPlayLive, onPlayMovie, onOpenSeries, onClose]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[activeIdx]);
    }
  }, [results, activeIdx, select, onClose]);

  return (
    <div className="spotlight-backdrop" onClick={onClose}>
      <div className="spotlight" onClick={(e) => e.stopPropagation()}>
        <div className="spotlight-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            placeholder="Search live, movies, series…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="spotlight-kbd">esc</kbd>
        </div>
        {query.trim() && (
          <>
          <div className="spotlight-results" ref={listRef}>
            {results.length === 0 ? (
              <div className="spotlight-empty">No matches</div>
            ) : (
              results.map((r, i) => (
                <div
                  key={`${r.type}-${r.item.id ?? r.item.url ?? r.item.seriesId}-${i}`}
                  className={`spotlight-row${i === activeIdx ? " active" : ""}`}
                  onClick={() => select(r)}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <span className={`spotlight-badge spotlight-badge-${r.type}`}>
                    {r.type === "live" ? "LIVE" : r.type === "movie" ? "MOVIE" : "SERIES"}
                  </span>
                  <span className="spotlight-name">{r.name}</span>
                  {r.item.group && <span className="spotlight-group">{r.item.group}</span>}
                </div>
              ))
            )}
          </div>
          <div className="spotlight-footer">
            <span className="spotlight-footer-count">
              {results.length} result{results.length === 1 ? "" : "s"}
              {results.length === MAX_RESULTS && (
                <span className="spotlight-footer-cap"> · Top {MAX_RESULTS} shown — keep typing</span>
              )}
            </span>
            <span className="spotlight-footer-keys">
              <kbd className="kbd">↑↓</kbd> navigate
              <kbd className="kbd">↵</kbd> open
              <kbd className="kbd">esc</kbd> close
            </span>
          </div>
          </>
        )}
        {!query.trim() && (
          <div className="spotlight-hint">
            Type to search across {channels.length} channels, {movies.length} movies, {series.length} shows
          </div>
        )}
      </div>
    </div>
  );
}
