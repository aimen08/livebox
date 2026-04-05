import React from "react";
import { HomeIcon, StarIcon, SettingsIcon, FolderIcon, LinkIcon } from "./Icons";

export default function Sidebar({ page, onNavigate, onOpenFile, onOpenURL }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo" onClick={() => onNavigate("home")}>
        <span>LB</span>
      </div>
      <div className="sidebar-sep" />
      <div className="sidebar-nav">
        <button
          className={`sidebar-btn${page === "home" ? " active" : ""}`}
          onClick={() => onNavigate("home")}
        >
          <HomeIcon />
          <span className="sidebar-tooltip">Channels</span>
        </button>
        <button
          className={`sidebar-btn${page === "favorites" ? " active" : ""}`}
          onClick={() => onNavigate("favorites")}
        >
          <StarIcon />
          <span className="sidebar-tooltip">Favorites</span>
        </button>
        <div className="sidebar-sep" />
        <button className="sidebar-btn" onClick={onOpenFile}>
          <FolderIcon />
          <span className="sidebar-tooltip">Open File</span>
        </button>
        <button className="sidebar-btn" onClick={onOpenURL}>
          <LinkIcon />
          <span className="sidebar-tooltip">Open URL</span>
        </button>
        <div className="sidebar-sep" />
        <button
          className={`sidebar-btn${page === "settings" ? " active" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          <SettingsIcon />
          <span className="sidebar-tooltip">Settings</span>
        </button>
      </div>
    </div>
  );
}
