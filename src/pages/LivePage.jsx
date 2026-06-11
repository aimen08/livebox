import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SearchIcon, TvIcon, FolderIcon, LinkIcon } from "../components/Icons";

const BATCH_SIZE = 80;

// Keyboard activation helper (spec §2.9)
const onActivate = (fn) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

function ChannelRow({ channel, onPlay, onToggleFav, isFav, isActive }) {
  return (
    <div
      className={`ch-row${isActive ? " active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onPlay(channel)}
      onKeyDown={onActivate(() => onPlay(channel))}
    >
      <div className="ch-row-logo">
        {channel.logo ? (
          <img src={channel.logo} alt="" loading="lazy" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
        ) : null}
        <span className="ch-row-fallback" style={channel.logo ? { display: "none" } : {}}>
          {channel.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="ch-row-name" title={channel.name}>{channel.name}</span>
      <button
        className={`ch-row-fav${isFav ? " is-fav" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleFav(channel); }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill={isFav ? "#f1c40f" : "none"} stroke={isFav ? "#f1c40f" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
    </div>
  );
}

const MemoChannelRow = React.memo(ChannelRow);

function LivePage({
  channels,
  groups,
  onPlay,
  favorites,
  onToggleFav,
  playingUrl,
}) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const listRef = useRef(null);

  // Auto-select first group
  useEffect(() => {
    if (groups.length && !activeGroup) setActiveGroup(groups[0]);
  }, [groups, activeGroup]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeGroup, search]);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const ch of channels) {
      counts[ch.group] = (counts[ch.group] || 0) + 1;
    }
    return counts;
  }, [channels]);

  const filtered = useMemo(() => {
    if (!activeGroup) return [];
    let list = channels.filter((c) => c.group === activeGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [channels, activeGroup, search]);

  const visibleChannels = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const visibleGroups = useMemo(() => {
    if (!groupFilter.trim()) return groups;
    const q = groupFilter.toLowerCase();
    return groups.filter((g) => g.toLowerCase().includes(q));
  }, [groups, groupFilter]);

  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
    }
  }, [filtered.length]);

  if (!channels.length) {
    return (
      <div className="empty-state">
        <TvIcon />
        <h2>No live channels available</h2>
        <p>Add a playlist to start watching live TV</p>
      </div>
    );
  }

  return (
    <div className="browse-layout fade-in">
      {/* Groups panel - left */}
      <div className="groups-panel">
        <div className="groups-panel-header">
          <span className="groups-panel-title">Groups</span>
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

      {/* Channels panel - right */}
      <div className="channels-panel">
        <div className="channels-panel-header">
          <h1 className="channels-panel-title">{activeGroup || "Channels"}</h1>
          <span className="channel-count">{filtered.length} channels</span>
        </div>

        <div className="search-bar">
          <SearchIcon />
          <input
            type="text"
            placeholder={activeGroup ? `Search in ${activeGroup}…` : "Search…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              &times;
            </button>
          )}
        </div>

        <div className="ch-list" ref={listRef} onScroll={handleScroll}>
          {visibleChannels.length === 0 ? (
            <div className="no-results">No channels found</div>
          ) : (
            visibleChannels.map((ch) => (
              <MemoChannelRow
                key={ch.id}
                channel={ch}
                onPlay={onPlay}
                onToggleFav={onToggleFav}
                isFav={!!favorites[ch.url]}
                isActive={playingUrl === ch.url}
              />
            ))
          )}
          {visibleCount < filtered.length && (
            <div className="ch-list-loading">
              {[0, 1, 2].map((i) => (
                <div className="skeleton-row" key={i}>
                  <div className="skeleton skeleton-circle" />
                  <div className="skeleton skeleton-bar" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(LivePage);
