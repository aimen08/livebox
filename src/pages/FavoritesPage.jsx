import React from "react";
import { StarIcon, XIcon } from "../components/Icons";

// Keyboard activation helper (spec §2.9)
const onActivate = (fn) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

function RemoveBtn({ onClick }) {
  return (
    <button
      className="fav-remove"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Remove from favorites"
    >
      <XIcon />
    </button>
  );
}

function getLastEpisode(seriesId, watchProgress) {
  if (!watchProgress) return null;
  let latest = null;
  for (const [, val] of Object.entries(watchProgress)) {
    if (val.seriesId === seriesId && val.position > 10 && val.position < val.duration * 0.95) {
      if (!latest || (val.updatedAt || 0) > (latest.updatedAt || 0)) latest = val;
    }
  }
  return latest;
}

function FavoritesPage({ favorites, onPlayLive, onPlayMovie, onToggleFav, watchProgress, onOpenSeries }) {
  const favList = Object.values(favorites);

  if (!favList.length) {
    return (
      <div className="empty-state">
        <StarIcon />
        <h2>No Favorites</h2>
        <p>Star channels, movies or series to save them here</p>
      </div>
    );
  }

  const liveChannels = favList.filter((f) => f.tvgId !== undefined);
  const movieItems = favList.filter((f) => f.streamId !== undefined);
  const seriesItems = favList.filter((f) => f.seriesId !== undefined);
  const otherItems = favList.filter((f) => f.tvgId === undefined && f.streamId === undefined && f.seriesId === undefined);

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <span className="channel-count">{favList.length} items</span>
      </div>

      {liveChannels.length > 0 && (
        <div className="fav-section">
          <h2 className="fav-section-title fav-dot-live">Live TV</h2>
          <div className="ch-list">
            {liveChannels.map((ch) => (
              <div
                key={ch.url}
                className="ch-row"
                role="button"
                tabIndex={0}
                onClick={() => onPlayLive(ch)}
                onKeyDown={onActivate(() => onPlayLive(ch))}
              >
                <div className="ch-row-logo">
                  {ch.logo ? <img src={ch.logo} alt="" loading="lazy" /> : null}
                  <span className="ch-row-fallback" style={ch.logo ? { display: "none" } : {}}>
                    {ch.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="ch-row-name">{ch.name}</span>
                <RemoveBtn onClick={() => onToggleFav(ch)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {movieItems.length > 0 && (
        <div className="fav-section">
          <h2 className="fav-section-title fav-dot-movie">Movies</h2>
          <div className="poster-row">
            {movieItems.map((m) => {
              const prog = watchProgress?.[m.url];
              const hasProgress = prog && prog.position > 30 && prog.position < prog.duration * 0.95;
              return (
                <div
                  key={m.url || m.streamId}
                  className="poster-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayMovie(m)}
                  onKeyDown={onActivate(() => onPlayMovie(m))}
                >
                  <div className="poster-img-wrap">
                    {m.poster ? (
                      <img src={m.poster} alt="" loading="lazy" className="poster-img" />
                    ) : (
                      <div className="poster-fallback">{m.name.charAt(0)}</div>
                    )}
                    {hasProgress && (
                      <div className="poster-continue">
                        <div className="poster-continue-text">{Math.floor(prog.position / 60)}m watched</div>
                        <div className="poster-continue-bar">
                          <div className="poster-continue-fill" style={{ width: `${Math.min((prog.position / prog.duration) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="poster-name">{m.name}</span>
                  <RemoveBtn onClick={() => onToggleFav(m)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {seriesItems.length > 0 && (
        <div className="fav-section">
          <h2 className="fav-section-title fav-dot-series">Series</h2>
          <div className="poster-row">
            {seriesItems.map((s) => {
              const lastEp = getLastEpisode(s.seriesId, watchProgress);
              return (
                <div
                  key={s.seriesId}
                  className="poster-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenSeries(s)}
                  onKeyDown={onActivate(() => onOpenSeries(s))}
                >
                  <div className="poster-img-wrap">
                    {s.poster ? (
                      <img src={s.poster} alt="" loading="lazy" className="poster-img" />
                    ) : (
                      <div className="poster-fallback">{s.name.charAt(0)}</div>
                    )}
                    {lastEp && (
                      <div className="poster-continue">
                        <div className="poster-continue-text">S{lastEp.season}E{lastEp.ep}</div>
                        <div className="poster-continue-bar">
                          <div className="poster-continue-fill" style={{ width: `${Math.min((lastEp.position / lastEp.duration) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="poster-name">{s.name}</span>
                  <RemoveBtn onClick={() => onToggleFav(s)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {otherItems.length > 0 && (
        <div className="fav-section">
          <h2 className="fav-section-title">Other</h2>
          <div className="ch-list">
            {otherItems.map((item) => (
              <div
                key={item.url || item.seriesId}
                className={`ch-row${item.url ? "" : " is-disabled"}`}
                role={item.url ? "button" : undefined}
                tabIndex={item.url ? 0 : undefined}
                onClick={() => item.url && onPlayLive(item)}
                onKeyDown={item.url ? onActivate(() => onPlayLive(item)) : undefined}
              >
                <span className="ch-row-name">{item.name}</span>
                {!item.url && <span className="no-stream-chip">no stream</span>}
                <RemoveBtn onClick={() => onToggleFav(item)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(FavoritesPage);
