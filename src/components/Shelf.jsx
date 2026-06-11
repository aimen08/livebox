import React, { useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

export default function Shelf({ title, items, renderItem, onSeeAll }) {
  const trackRef = useRef(null);
  if (!items || items.length === 0) return null;

  const scrollByView = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: "smooth" });
  };
  const onTrackKey = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByView(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByView(-1);
    }
  };

  return (
    <section className="shelf">
      <div className="shelf-header">
        <h2 className="shelf-title">{title}</h2>
        {onSeeAll && (
          <button type="button" className="shelf-see-all" onClick={onSeeAll}>
            See all
          </button>
        )}
      </div>
      <div className="shelf-viewport">
        <button
          type="button"
          className="shelf-chevron shelf-chevron-left"
          aria-label="Scroll left"
          tabIndex={-1}
          onClick={() => scrollByView(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <div className="shelf-track" ref={trackRef} role="list" tabIndex={0} onKeyDown={onTrackKey}>
          {items.map((it, i) => (
            <div className="shelf-item" role="listitem" key={it.id ?? it.url ?? it.seriesId ?? i}>
              {renderItem(it, i)}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="shelf-chevron shelf-chevron-right"
          aria-label="Scroll right"
          tabIndex={-1}
          onClick={() => scrollByView(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
