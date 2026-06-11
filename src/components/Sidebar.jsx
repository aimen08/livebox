import React from "react";
import { HomeIcon, StarIcon, SettingsIcon, FolderIcon, LinkIcon, TvIcon, FilmIcon, MonitorIcon } from "./Icons";

export default function Sidebar({ page, onNavigate, onOpenFile, onOpenURL, hasContent }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo" onClick={() => onNavigate("home")}>
        <span>LB</span>
      </div>
      <div className="sidebar-sep" />
      <div className="sidebar-nav">
        <button
          className={`sidebar-btn${page === "home" ? " active" : ""}`}
          aria-label="Home"
          onClick={() => onNavigate("home")}
        >
          <HomeIcon />
          <span className="sidebar-tooltip">Home</span>
        </button>
        {hasContent && (
          <>
            <button
              className={`sidebar-btn${page === "live" ? " active" : ""}`}
              aria-label="Live TV"
              onClick={() => onNavigate("live")}
            >
              <MonitorIcon />
              <span className="sidebar-tooltip">Live TV</span>
            </button>
            <button
              className={`sidebar-btn${page === "movies" ? " active" : ""}`}
              aria-label="Movies"
              onClick={() => onNavigate("movies")}
            >
              <FilmIcon />
              <span className="sidebar-tooltip">Movies</span>
            </button>
            <button
              className={`sidebar-btn${page === "series" ? " active" : ""}`}
              aria-label="Series"
              onClick={() => onNavigate("series")}
            >
              <TvIcon size={22} />
              <span className="sidebar-tooltip">Series</span>
            </button>
          </>
        )}
        <button
          className={`sidebar-btn${page === "favorites" ? " active" : ""}`}
          aria-label="Favorites"
          onClick={() => onNavigate("favorites")}
        >
          <StarIcon />
          <span className="sidebar-tooltip">Favorites</span>
        </button>
        <div className="sidebar-sep" />
        <button className="sidebar-btn" aria-label="Open File" onClick={onOpenFile}>
          <FolderIcon />
          <span className="sidebar-tooltip">Open File</span>
        </button>
        <button className="sidebar-btn" aria-label="Open URL" onClick={onOpenURL}>
          <LinkIcon />
          <span className="sidebar-tooltip">Open URL</span>
        </button>
        <div className="sidebar-spacer" style={{ marginTop: "auto" }} aria-hidden="true" />
        <button
          className={`sidebar-btn${page === "settings" ? " active" : ""}`}
          aria-label="Settings"
          onClick={() => onNavigate("settings")}
        >
          <SettingsIcon />
          <span className="sidebar-tooltip">Settings</span>
        </button>
      </div>
    </div>
  );
}
