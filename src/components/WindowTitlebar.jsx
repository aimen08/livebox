import React, { useState, useEffect } from "react";
import { MinusIcon, SquareIcon, XIcon } from "./Icons";

export default function WindowTitlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electron.isMaximized().then(setMaximized);
    window.electron.onWindowMaximized(setMaximized);
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-text">LIVEBOX</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.electron.minimizeWindow()}>
          <MinusIcon />
        </button>
        <button className="titlebar-btn" onClick={() => window.electron.maximizeWindow()}>
          <SquareIcon />
        </button>
        <button className="titlebar-btn titlebar-close" onClick={() => window.electron.closeWindow()}>
          <XIcon />
        </button>
      </div>
    </div>
  );
}
