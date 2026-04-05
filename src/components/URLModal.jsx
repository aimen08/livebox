import React, { useState } from "react";
import { XIcon } from "./Icons";

export default function URLModal({ onClose, onSubmit }) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Open M3U URL</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="modal-input"
            type="url"
            placeholder="https://example.com/playlist.m3u"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!url.trim()}>Load</button>
          </div>
        </form>
      </div>
    </div>
  );
}
