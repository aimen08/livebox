import React from "react";
import { PlayIcon, InfoIcon } from "./Icons";

export default function Billboard({ item, kind, onPlay, onMoreInfo }) {
  if (!item) return null;
  const meta = [];
  if (kind === "series" && item.releaseDate) meta.push(String(item.releaseDate).slice(0, 4));
  if (item.rating) meta.push(`★ ${item.rating}`);
  if (item.genre) meta.push(item.genre);
  const desc = kind === "series" ? item.plot || "" : ""; // movies have no plot

  return (
    <section className="billboard">
      <div className="billboard-bg" aria-hidden="true">
        {item.poster ? (
          <img
            src={item.poster}
            alt=""
            className="billboard-bg-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="billboard-bg-fallback" />
        )}
      </div>
      <div className="billboard-scrim" aria-hidden="true" />
      <div className="billboard-content">
        <h1 className="billboard-title">{item.name}</h1>
        {meta.length > 0 && (
          <div className="billboard-meta">
            {meta.map((m, i) => (
              <span key={i} className="billboard-meta-item">
                {m}
              </span>
            ))}
          </div>
        )}
        {desc && <p className="billboard-desc">{desc}</p>}
        <div className="billboard-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => onPlay(item)}>
            <PlayIcon /> Play
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => onMoreInfo(item)}>
            <InfoIcon /> More Info
          </button>
        </div>
      </div>
    </section>
  );
}
