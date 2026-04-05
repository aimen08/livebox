import React from "react";
import ChannelCard from "../components/ChannelCard";
import { StarIcon } from "../components/Icons";

export default function FavoritesPage({ favorites, onPlay, onToggleFav }) {
  const favList = Object.values(favorites);

  if (!favList.length) {
    return (
      <div className="empty-state">
        <StarIcon />
        <h2>No Favorites</h2>
        <p>Star channels to save them here for quick access</p>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <span className="channel-count">{favList.length} channels</span>
      </div>
      <div className="cards-grid">
        {favList.map(ch => (
          <ChannelCard
            key={ch.url}
            channel={ch}
            onPlay={onPlay}
            onToggleFav={onToggleFav}
            isFav={true}
          />
        ))}
      </div>
    </div>
  );
}
