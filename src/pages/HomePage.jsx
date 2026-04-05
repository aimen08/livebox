import React, { useState, useMemo } from "react";
import ChannelCard from "../components/ChannelCard";
import { SearchIcon, TvIcon, FolderIcon, LinkIcon } from "../components/Icons";

export default function HomePage({ channels, groups, onPlay, favorites, onToggleFav, onOpenFile, onOpenURL }) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");

  const filtered = useMemo(() => {
    let list = channels;
    if (activeGroup !== "All") list = list.filter(c => c.group === activeGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
    }
    return list;
  }, [channels, activeGroup, search]);

  if (!channels.length) {
    return (
      <div className="empty-state">
        <TvIcon />
        <h2>Welcome to LiveBox</h2>
        <p>Open an M3U playlist file or URL to start watching</p>
        <div className="empty-actions">
          <button className="btn btn-primary" onClick={onOpenFile}>
            <FolderIcon /> Open File
          </button>
          <button className="btn btn-secondary" onClick={onOpenURL}>
            <LinkIcon /> Open URL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">Channels</h1>
        <span className="channel-count">{filtered.length} of {channels.length}</span>
      </div>

      <div className="search-bar">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")}>&times;</button>
        )}
      </div>

      <div className="groups-bar">
        <button
          className={`group-chip${activeGroup === "All" ? " active" : ""}`}
          onClick={() => setActiveGroup("All")}
        >
          All
        </button>
        {groups.map(g => (
          <button
            key={g}
            className={`group-chip${activeGroup === g ? " active" : ""}`}
            onClick={() => setActiveGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="no-results">No channels found</div>
      ) : (
        <div className="cards-grid">
          {filtered.map(ch => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onPlay={onPlay}
              onToggleFav={onToggleFav}
              isFav={!!favorites[ch.url]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
