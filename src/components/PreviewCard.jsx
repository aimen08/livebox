import React from "react";
import { StarIcon, PlayIcon, InfoIcon, PlusIcon } from "./Icons";

function PreviewCard({ item, kind, isFav, progress, onPlay, onToggleFav, onDetail }) {
  const hasProgress = progress && progress.position > 30 && progress.position < progress.duration * 0.95;
  const meta = [];
  if (kind === "series" && item.releaseDate) meta.push(String(item.releaseDate).slice(0, 4));
  if (item.rating) meta.push(`★ ${item.rating}`);

  const activate = () => (kind === "series" ? onDetail(item) : onPlay(item));

  return (
    <div
      className="preview-card poster-card"
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        // Only activate when the card div itself is focused — not when a nested
        // fav/play/info button has focus (Enter/Space there bubbles up here).
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="poster-img-wrap">
        {item.poster ? (
          <img
            src={item.poster}
            alt=""
            loading="lazy"
            className="poster-img"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div className="poster-fallback" style={item.poster ? { display: "none" } : {}}>
          {item.name.charAt(0)}
        </div>
        {item.rating && <span className="poster-rating">{item.rating}</span>}
        <button
          className={`poster-fav${isFav ? " is-fav" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(item);
          }}
          title={isFav ? "Remove from My List" : "Add to My List"}
          aria-label={isFav ? "Remove from My List" : "Add to My List"}
        >
          <StarIcon />
        </button>
        {hasProgress && (
          <div className="poster-continue">
            <div className="poster-continue-text">{Math.floor(progress.position / 60)}m watched</div>
            <div className="poster-continue-bar">
              <div
                className="poster-continue-fill"
                style={{ width: `${Math.min((progress.position / progress.duration) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover/focus preview — overlays the bottom of the artwork (kept INSIDE
            the image wrap so the whole effect stays within the card's footprint
            and never overflows the horizontal shelf into a scrollbar). */}
        <div className="preview-panel">
        <div className="preview-panel-actions">
          <button
            type="button"
            className="preview-btn preview-btn-play"
            onClick={(e) => {
              e.stopPropagation();
              kind === "series" ? onDetail(item) : onPlay(item);
            }}
            aria-label="Play"
          >
            <PlayIcon />
          </button>
          <button
            type="button"
            className={`preview-btn${isFav ? " is-fav" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav(item);
            }}
            aria-label={isFav ? "Remove from My List" : "Add to My List"}
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            className="preview-btn preview-btn-more"
            onClick={(e) => {
              e.stopPropagation();
              onDetail(item);
            }}
            aria-label="More info"
          >
            <InfoIcon />
          </button>
        </div>
        <div className="preview-panel-title">{item.name}</div>
        {meta.length > 0 && <div className="preview-panel-meta">{meta.join("  •  ")}</div>}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PreviewCard);
