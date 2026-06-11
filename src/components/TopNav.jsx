import React, { useState, useEffect } from "react";
import { SearchIcon, SettingsIcon } from "./Icons";

const NAV = [
  { id: "home", label: "Home", always: true },
  { id: "live", label: "Live", always: false },
  { id: "movies", label: "Movies", always: false },
  { id: "series", label: "Series", always: false },
  { id: "favorites", label: "My List", always: true },
];

export default function TopNav({ page, platform, hasTitlebar, hasContent, hasBillboard, scrollContainerRef, onNavigate, onOpenSearch }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef, page]);

  const cls = [
    "topnav",
    platform === "darwin" ? "is-mac" : "",
    hasTitlebar ? "has-titlebar" : "",
    hasBillboard ? (scrolled ? "is-scrolled" : "") : "is-solid",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={cls}>
      <button type="button" className="topnav-brand" onClick={() => onNavigate("home")} aria-label="LiveBox home">
        <span className="topnav-logo">LB</span>
        <span className="topnav-wordmark">LIVEBOX</span>
      </button>
      <div className="topnav-links">
        {NAV.filter((n) => n.always || hasContent).map((n) => (
          <button
            key={n.id}
            type="button"
            className={`topnav-link${page === n.id ? " active" : ""}`}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => onNavigate(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>
      <div className="topnav-actions">
        <button type="button" className="topnav-icon-btn" aria-label="Search" title="Search (⌘K)" onClick={onOpenSearch}>
          <SearchIcon />
        </button>
        <button
          type="button"
          className={`topnav-icon-btn${page === "settings" ? " active" : ""}`}
          aria-label="Settings"
          title="Settings"
          onClick={() => onNavigate("settings")}
        >
          <SettingsIcon />
        </button>
      </div>
    </nav>
  );
}
