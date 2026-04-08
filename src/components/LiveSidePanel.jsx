import React from "react";

// Side panel pinned to the right of the Live page. Holds the inline-player
// slot (top half of the right side). When a channel is playing, the inline
// Player overlays this area via fixed positioning. When nothing is playing,
// we show an empty player frame so the slot is visible and obviously a player.
function LiveSidePanel({ playing }) {
  return (
    <aside className="live-side-panel" aria-hidden={false}>
      <div className="live-side-top">
        {!playing && (
          <div className="live-side-empty-player">
            <div className="live-side-empty-title">Live TV</div>
            <div className="live-side-empty-sub">Pick a channel from the list</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default React.memo(LiveSidePanel);
