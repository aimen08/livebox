import React from "react";
import { PlayIcon, StarIcon } from "./Icons";

export default function ChannelCard({ channel, onPlay, onToggleFav, isFav }) {
  return (
    <div className="channel-card" onDoubleClick={() => onPlay(channel)}>
      <div className="channel-logo-wrap">
        {channel.logo ? (
          <img
            className="channel-logo"
            src={channel.logo}
            alt=""
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div className="channel-logo-fallback" style={channel.logo ? { display: "none" } : {}}>
          {channel.name.charAt(0).toUpperCase()}
        </div>
        <div className="channel-overlay" onClick={() => onPlay(channel)}>
          <PlayIcon />
        </div>
      </div>
      <div className="channel-info">
        <span className="channel-name" title={channel.name}>{channel.name}</span>
        <span className="channel-group">{channel.group}</span>
      </div>
      <button
        className={`channel-fav${isFav ? " is-fav" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleFav(channel); }}
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <StarIcon />
      </button>
    </div>
  );
}
