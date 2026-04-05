import React, { useRef, useEffect, useState } from "react";
import Hls from "hls.js";
import { XIcon } from "./Icons";

export default function Player({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!channel?.url || !videoRef.current) return;
    const video = videoRef.current;
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = channel.url;

    if (url.includes(".m3u8") || url.includes("m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError("Stream unavailable or failed to load");
            hls.destroy();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
      } else {
        setError("HLS not supported in this browser");
      }
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
      video.addEventListener("error", () => setError("Failed to load stream"));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = "";
    };
  }, [channel]);

  return (
    <div className="player-container">
      <div className="player-header">
        <div className="player-channel-name">{channel?.name || "Unknown"}</div>
        <button className="btn-icon player-close" onClick={onClose}>
          <XIcon />
        </button>
      </div>
      <div className="player-wrap">
        {error ? (
          <div className="player-error">
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
          </div>
        ) : (
          <video ref={videoRef} className="player-video" controls autoPlay />
        )}
      </div>
    </div>
  );
}
