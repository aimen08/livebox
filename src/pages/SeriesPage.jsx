import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SearchIcon, StarIcon, MonitorIcon } from "../components/Icons";
import Billboard from "../components/Billboard";
import Shelf from "../components/Shelf";
import PreviewCard from "../components/PreviewCard";

const BATCH_SIZE = 40;
const BROWSE_GROUP_CAP = 12;
const SHELF_ITEM_CAP = 20;

// IPTV titles often carry a "EN - " / "AR | " language/country prefix — strip it
// for display so the billboard title and episode rows read cleanly.
const stripPrefix = (s) => (s || "").replace(/^[A-Za-z]{2,4}\s*[-|:]\s*/, "").trim();

// Keyboard activation helper (spec §2.9)
const onActivate = (fn) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

function SeriesCard({ show, onClick, isFav, onToggleFav, lastEpisode }) {
  return (
    <div
      className="poster-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onActivate(onClick)}
    >
      <div className="poster-img-wrap">
        {show.poster ? (
          <img src={show.poster} alt="" loading="lazy" className="poster-img" />
        ) : (
          <div className="poster-fallback">{show.name.charAt(0)}</div>
        )}
        {show.rating && <span className="poster-rating">{show.rating}</span>}
        <button
          className={`poster-fav${isFav ? " is-fav" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(show); }}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <StarIcon />
        </button>
        {lastEpisode && (
          <div className="poster-continue">
            <div className="poster-continue-text">S{lastEpisode.season}E{lastEpisode.ep}</div>
            <div className="poster-continue-bar">
              <div className="poster-continue-fill" style={{ width: `${Math.min((lastEpisode.position / lastEpisode.duration) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <span className="poster-name">{show.name}</span>
    </div>
  );
}

const MemoSeriesCard = React.memo(SeriesCard);

function SeriesDetail({ show, xtreamCreds, onPlay, onBack, isFav, onToggleFav, watchProgress }) {
  const [seasons, setSeasons] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    // M3U series carry their episodes inline — build seasons locally, no API call.
    if (Array.isArray(show.episodes) && show.episodes.length) {
      const eps = {};
      show.episodes.forEach((e, idx) => {
        const sk = String(e.season || 1);
        (eps[sk] = eps[sk] || []).push({
          id: idx, title: e.name, season: e.season || 1, episode_num: e.episodeNum || idx + 1,
          direct_source: e.url, info: { movie_image: e.poster || show.poster || "" },
        });
      });
      setSeasons(eps);
      const keys = Object.keys(eps).sort((a, b) => Number(a) - Number(b));
      if (keys.length) setActiveSeason(keys[0]);
      setLoading(false);
      return;
    }
    if (!xtreamCreds) { setLoading(false); return; }
    const { baseUrl, username, password } = xtreamCreds;
    const url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${show.seriesId}`;
    window.electron.fetchURL(url).then((json) => {
      const data = JSON.parse(json);
      const eps = data.episodes || {};
      setSeasons(eps);
      const seasonKeys = Object.keys(eps).sort((a, b) => Number(a) - Number(b));
      if (seasonKeys.length) setActiveSeason(seasonKeys[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [show, xtreamCreds]);

  const seasonKeys = seasons ? Object.keys(seasons).sort((a, b) => Number(a) - Number(b)) : [];
  const episodes = seasons && activeSeason ? seasons[activeSeason] || [] : [];

  // Prefer direct_source when the provider populates it — that's the URL
  // it knows works, often pointing at a different storage backend than
  // the constructed /series/USER/PASS/ID.ext path. Fall back to building
  // the standard URL when direct_source is missing or empty.
  const buildEpisodeUrl = useCallback((ep) => {
    if (ep.direct_source && typeof ep.direct_source === "string" && ep.direct_source.startsWith("http")) {
      return ep.direct_source;
    }
    if (!xtreamCreds) return "";   // M3U series always carry a direct_source
    const { baseUrl, username, password } = xtreamCreds;
    return `${baseUrl}/series/${username}/${password}/${ep.id}.${ep.container_extension || "mkv"}`;
  }, [xtreamCreds]);

  // Build flat episode list for sidebar/auto-next
  const allEpisodes = useMemo(() => {
    if (!seasons) return [];
    const list = [];
    const keys = Object.keys(seasons).sort((a, b) => Number(a) - Number(b));
    for (const sk of keys) {
      for (const ep of (seasons[sk] || [])) {
        list.push({
          id: ep.id,
          name: ep.title || `S${ep.season}E${ep.episode_num}`,
          url: buildEpisodeUrl(ep),
          logo: ep.info?.movie_image || show.poster || "",
          episodeId: ep.id,
          seriesId: show.seriesId,
          season: ep.season,
          episodeNum: ep.episode_num,
          duration: ep.info?.duration || "",
          thumb: ep.info?.movie_image || "",
        });
      }
    }
    return list;
  }, [seasons, show, buildEpisodeUrl]);

  const handlePlayEpisode = (ep) => {
    onPlay({
      name: ep.title || `S${ep.season}E${ep.episode_num}`,
      url: buildEpisodeUrl(ep),
      logo: ep.info?.movie_image || show.poster || "",
      episodeId: ep.id,
      seriesId: show.seriesId,
      season: ep.season,
      episodeNum: ep.episode_num,
      seriesName: show.name,
      seriesPoster: show.poster || "",
      episodes: allEpisodes,
    });
  };

  return (
    <div className="series-detail fade-in">
      {show.poster && (
        <div className="series-detail-backdrop">
          <img src={show.poster} alt="" aria-hidden="true" />
        </div>
      )}
      <div className="series-detail-top">
        <button className="btn btn-secondary" onClick={onBack}>&larr; Back</button>
        <button
          className={`btn ${isFav ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onToggleFav(show)}
        >
          <StarIcon /> {isFav ? "Favorited" : "Favorite"}
        </button>
      </div>
      <div className="series-detail-header">
        {show.poster && <img src={show.poster} alt="" className="series-detail-poster" />}
        <div className="series-detail-info">
          <h1 className="series-detail-title">{stripPrefix(show.name)}</h1>
          {show.genre && <span className="series-detail-meta">{show.genre}</span>}
          {show.releaseDate && <span className="series-detail-meta">{show.releaseDate}</span>}
          {show.rating && <span className="series-detail-meta">Rating: {show.rating}</span>}
          {show.plot && <p className="series-detail-plot">{show.plot}</p>}
          {show.cast && <p className="series-detail-cast">Cast: {show.cast}</p>}
        </div>
      </div>

      {loading ? (
        <>
          <div className="series-loading"><div className="player-spinner" /></div>
          <div className="episode-list">
            {[0, 1, 2].map((i) => (
              <div className="skeleton-ep-row" key={i}>
                <div className="skeleton skeleton-thumb" />
                <div className="skeleton-ep-info">
                  <div className="skeleton skeleton-bar" />
                  <div className="skeleton skeleton-bar-sm" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {seasonKeys.length > 1 && (
            <div className="season-tabs">
              {seasonKeys.map((s) => (
                <button key={s} className={`season-tab${activeSeason === s ? " active" : ""}`}
                  onClick={() => setActiveSeason(s)}>Season {s}</button>
              ))}
            </div>
          )}
          <div className="episode-list">
            {(() => {
              const { baseUrl, username, password } = xtreamCreds;
              const lastEp = getLastEpisode(show.seriesId, watchProgress);
              const seriesClean = stripPrefix(show.name).toLowerCase();
              return episodes.map((ep) => {
                const epUrl = `${baseUrl}/series/${username}/${password}/${ep.id}.${ep.container_extension || "mkv"}`;
                const prog = watchProgress?.[epUrl];
                const isLastWatched = lastEp && lastEp.ep === ep.episode_num && lastEp.season === ep.season;
                const isWatched = prog && prog.position > prog.duration * 0.9;
                // Providers usually repeat the series name as the episode "title"
                // ("EN - My Wife and Kids - S01E01"). Strip it down to a real title,
                // or fall back to a clean "Episode N".
                const epClean = stripPrefix(ep.title).replace(/\s*[-–|]\s*S\d{1,2}\s*E\d{1,3}.*$/i, "").trim();
                const epTitle = (!epClean || epClean.toLowerCase() === seriesClean) ? `Episode ${ep.episode_num}` : epClean;
                return (
                  <div
                    key={ep.id}
                    className={`episode-row${isLastWatched ? " last-watched" : ""}${isWatched ? " watched" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePlayEpisode(ep)}
                    onKeyDown={onActivate(() => handlePlayEpisode(ep))}
                  >
                    {ep.info?.movie_image && (
                      <img src={ep.info.movie_image} alt="" className="episode-thumb" loading="lazy" />
                    )}
                    {!ep.info?.movie_image && <span className="episode-num">E{ep.episode_num}</span>}
                    <div className="episode-info">
                      <span className="episode-label">E{ep.episode_num}</span>
                      <span className="episode-title">{epTitle}</span>
                      {ep.info?.duration && <span className="episode-duration">{ep.info.duration}</span>}
                      {isLastWatched && <span className="episode-last-label">Continue watching</span>}
                      {prog && prog.position > 10 && !isWatched && (
                        <div className="episode-progress-bar">
                          <div className="episode-progress-fill" style={{ width: `${Math.min((prog.position / prog.duration) * 100, 100)}%` }} />
                        </div>
                      )}
                    </div>
                    {isWatched && <span className="ep-sidebar-check">&#10003;</span>}
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}

function getLastEpisode(seriesId, watchProgress) {
  if (!watchProgress) return null;
  let latest = null;
  for (const [, val] of Object.entries(watchProgress)) {
    if (val.seriesId === seriesId && val.position > 10 && val.position < val.duration * 0.95) {
      if (!latest || (val.updatedAt || 0) > (latest.updatedAt || 0)) {
        latest = val;
      }
    }
  }
  return latest;
}

function SeriesPage({ series, groups, xtreamCreds, onPlay, favorites, onToggleFav, watchProgress, pendingSeries, onClearPending }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [browseMode, setBrowseMode] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const listRef = useRef(null);

  const openShow = useCallback((s) => setSelectedShow(s), []);

  // Handle deep-link from favorites
  useEffect(() => {
    if (pendingSeries && series.length) {
      const match = series.find((s) => s.seriesId === pendingSeries.seriesId);
      if (match) {
        setActiveGroup(match.group);
        setSelectedShow(match);
      }
      onClearPending?.();
    }
  }, [pendingSeries, series, onClearPending]);

  useEffect(() => {
    if (groups.length && !activeGroup) setActiveGroup(groups[0]);
  }, [groups, activeGroup]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeGroup, search]);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const s of series) counts[s.group] = (counts[s.group] || 0) + 1;
    return counts;
  }, [series]);

  const filtered = useMemo(() => {
    if (!activeGroup) return [];
    let list = series.filter((s) => s.group === activeGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [series, activeGroup, search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const visibleGroups = useMemo(() => {
    if (!groupFilter.trim()) return groups;
    const q = groupFilter.toLowerCase();
    return groups.filter((g) => g.toLowerCase().includes(q));
  }, [groups, groupFilter]);

  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
    }
  }, [filtered.length]);

  // Browse-mode shelves: one shelf per group (capped), each with up to N shows.
  const browseShelves = useMemo(() => {
    const shelfGroups = groups.slice(0, BROWSE_GROUP_CAP);
    return shelfGroups.map((g) => ({
      group: g,
      items: series.filter((s) => s.group === g).slice(0, SHELF_ITEM_CAP),
    }));
  }, [groups, series]);

  if (selectedShow) {
    return (
      <SeriesDetail
        show={selectedShow} xtreamCreds={xtreamCreds} onPlay={onPlay}
        onBack={() => setSelectedShow(null)}
        isFav={!!favorites[selectedShow.seriesId]}
        onToggleFav={onToggleFav}
        watchProgress={watchProgress}
      />
    );
  }

  if (!series.length) {
    return (
      <div className="empty-state">
        <MonitorIcon />
        <h2>No series available</h2>
        <p>Add a playlist with series content to browse shows</p>
      </div>
    );
  }

  if (browseMode) {
    return (
      <div className="series-browse fade-in">
        <Billboard
          item={series[0]}
          kind="series"
          onPlay={openShow}
          onMoreInfo={openShow}
        />
        {browseShelves.map(({ group, items }) => (
          <Shelf
            key={group}
            title={group}
            items={items}
            onSeeAll={() => { setActiveGroup(group); setBrowseMode(false); }}
            renderItem={(s) => (
              <PreviewCard
                item={s}
                kind="series"
                isFav={!!favorites[s.seriesId]}
                onPlay={openShow}
                onDetail={openShow}
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
          <span className="groups-panel-title">Series</span>
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
            <div key={g} className={`group-item${activeGroup === g ? " active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveGroup(g)}
              onKeyDown={onActivate(() => setActiveGroup(g))}>
              <span className="group-item-name">{g}</span>
              <span className="group-item-count">{groupCounts[g] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="channels-panel">
        <div className="channels-panel-header">
          <button className="btn btn-secondary btn-sm" onClick={() => setBrowseMode(true)}>&larr; All series</button>
          <h1 className="channels-panel-title">{activeGroup || "Series"}</h1>
          <span className="channel-count">{filtered.length} shows</span>
        </div>

        <div className="search-bar">
          <SearchIcon />
          <input type="text" placeholder={activeGroup ? `Search in ${activeGroup}…` : "Search…"} value={search}
            onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch("")}>&times;</button>}
        </div>

        <div className="poster-grid" ref={listRef} onScroll={handleScroll}>
          {visible.length === 0 ? (
            <div className="no-results">No series found</div>
          ) : (
            visible.map((s) => (
              <MemoSeriesCard key={s.id} show={s} onClick={() => setSelectedShow(s)}
                isFav={!!favorites[s.seriesId]} onToggleFav={onToggleFav}
                lastEpisode={getLastEpisode(s.seriesId, watchProgress)} />
            ))
          )}
          {visibleCount < filtered.length && (
            <div className="ch-list-loading">
              {[0, 1, 2].map((i) => (
                <div className="skeleton skeleton-poster" key={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(SeriesPage);
