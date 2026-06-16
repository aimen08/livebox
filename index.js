const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const { spawn } = require("child_process");

// ── mpv playback engine (all platforms) ─────────────────────────────────────
// Chromium's <video> cannot demux the provider's MKV/EAC3 catalog and chokes on
// its redirecting live HLS (302 to a rotating CDN edge + relative segment paths
// the origin 403s). So we render ALL playback with mpv (ffmpeg inside: every
// container/codec, hw decode, robust live handling, follows redirects). mpv runs
// as a child process drawing into its OWN borderless always-on-top window, which
// we steer over the player area via its JSON IPC pipe — no native modules, no
// fragile --wid embedding (see the comment on mpvGeometryString below).
//
// Windows ships a bundled mpv.exe. macOS resolves a bundled mpv first, then
// falls back to a Homebrew/MacPorts-installed `mpv` so dev builds work out of
// the box. Set LIVEBOX_MPV to point at any binary explicitly.

function resolveMpvPath() {
  // Explicit override — lets us point at any mpv binary.
  if (process.env.LIVEBOX_MPV) {
    try { if (fs.existsSync(process.env.LIVEBOX_MPV)) return process.env.LIVEBOX_MPV; } catch {}
  }
  let candidates;
  if (process.platform === "win32") {
    candidates = [
      path.join(process.resourcesPath || "", "mpv", "mpv.exe"),
      path.join(__dirname, "build-res", "win", "mpv", "mpv.exe"),
    ];
  } else if (process.platform === "darwin") {
    candidates = [
      // Bundled with the packaged .app …
      path.join(process.resourcesPath || "", "mpv", "mpv"),
      path.join(__dirname, "build-res", "mac", "mpv", "mpv"),
      // … otherwise fall back to a system-installed mpv (Homebrew / MacPorts).
      "/opt/homebrew/bin/mpv",
      "/usr/local/bin/mpv",
      "/opt/local/bin/mpv",
    ];
  } else {
    candidates = ["/usr/bin/mpv", "/usr/local/bin/mpv"];
  }
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}
const mpvPath = resolveMpvPath();
const MPV_PIPE = process.platform === "win32"
  ? "\\\\.\\pipe\\livebox-mpv-" + process.pid
  : path.join(require("os").tmpdir(), "livebox-mpv-" + process.pid + ".sock");

// Reap any mpv left behind by a previous crashed/force-quit run before we spawn
// our own. A leftover keeps the provider's (often single) connection slot busy,
// so the new run can't play. Matches only OUR mpv via the IPC-server arg. Only
// safe to call AFTER the single-instance lock (else a second, soon-to-quit
// instance would kill the running app's mpv).
function reapOrphanMpv() {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/F", "/IM", "mpv.exe"], { stdio: "ignore", windowsHide: true });
    } else {
      spawn("pkill", ["-f", "livebox-mpv-"], { stdio: "ignore" });
    }
  } catch {}
}

let mpvProc = null;
let mpvSock = null;
let mpvReady = false;
let mpvActive = false;      // something is (or should be) playing
let mpvQueue = [];          // commands queued until the IPC pipe connects
let mpvLastRect = null;     // last bounds reported by the renderer (DIP, relative to content)
let mpvPosTimer = null;
let mpvReqSeq = 0;
const mpvCmdNames = new Map(); // request_id → command label, to classify responses

// ── Native embedded mpv (macOS) ─────────────────────────────────────────────
// macOS renders playback through an in-process libmpv render-API addon that
// draws into an NSOpenGLView SUBVIEW of the Electron window — true in-window
// embedding (adapted from IPTVnator, MIT). This supersedes the old --wid path.
// Windows still spawns mpv.exe into its own steered floating window (--wid never
// produced video there). So `MPV_EMBED` (the retired --wid child-window) is off.
const MPV_EMBED = false;
let videoWin = null;        // (retired --wid host window; kept for dead branches)

let embeddedMpv = null;
if (process.platform === "darwin") {
  const addonPaths = [
    path.join(__dirname, "native", "build", "Release", "embedded_mpv.node"),
    path.join(process.resourcesPath || "", "native", "embedded_mpv.node"),
  ];
  for (const p of addonPaths) {
    try {
      if (fs.existsSync(p)) {
        const mod = require(p);
        if (mod && typeof mod.isSupported === "function" && mod.isSupported()) {
          embeddedMpv = mod;
          break;
        }
      }
    } catch (err) {
      try { fs.appendFileSync(path.join(app.getPath("userData"), "mpv-stderr.log"), `addon load failed (${p}): ${err.message}\n`); } catch {}
    }
  }
}
const USE_NATIVE_EMBED = !!embeddedMpv;
let nSid = null;                              // current native session id
let nRect = { x: 0, y: 0, width: 1, height: 1 };
let nVisible = false;
let nActive = false;                          // a stream is (or should be) playing
let nPollTimer = null;
let nPrev = {};                               // last snapshot, for event diffing

function mpvSend(command) {
  const id = ++mpvReqSeq;
  mpvCmdNames.set(id, command.slice(0, 2).join(" "));
  if (mpvCmdNames.size > 128) mpvCmdNames.delete(mpvCmdNames.keys().next().value);
  const line = JSON.stringify({ command, request_id: id }) + "\n";
  if (mpvSock && mpvReady) { try { mpvSock.write(line); } catch {} }
  else mpvQueue.push(line);
}

function mpvNotify(payload) {
  try { mainWindow?.webContents.send("mpv-event", payload); } catch {}
}

// ── Native embedded session control (macOS) ─────────────────────────────────
// Reimplements the renderer's existing `mpv.*` IPC contract on top of the libmpv
// addon, so Player.jsx's mpv branch works unchanged. Snapshot polling is
// translated into the same {type:"time"|"duration"|"playing"|...} events.
function nEnsureSession() {
  if (!USE_NATIVE_EMBED || !mainWindow) return null;
  if (nSid) return nSid;
  try {
    const handle = mainWindow.getNativeWindowHandle();
    nSid = embeddedMpv.createSession(handle, nRect, null, 100);
    nVisible = true;
    mpvNotify({ type: "engine", state: "connected" });
  } catch (err) {
    nSid = null;
    mpvNotify({ type: "spawn-error", message: err?.message || "failed to start embedded mpv" });
  }
  return nSid;
}

function nStartPoll() {
  clearInterval(nPollTimer);
  nPollTimer = setInterval(() => {
    if (!nSid) return;
    let s;
    try { s = embeddedMpv.getSessionSnapshot(nSid); } catch { return; }
    if (!s) return;
    if (typeof s.durationSeconds === "number" && s.durationSeconds > 0 && s.durationSeconds !== nPrev.dur) {
      nPrev.dur = s.durationSeconds;
      mpvNotify({ type: "duration", value: s.durationSeconds });
    }
    if (typeof s.positionSeconds === "number" && nActive) {
      mpvNotify({ type: "time", value: s.positionSeconds });
    }
    if (s.status !== nPrev.status) {
      nPrev.status = s.status;
      if (s.status === "playing") { mpvNotify({ type: "playing" }); mpvNotify({ type: "pause", value: false }); }
      else if (s.status === "paused") mpvNotify({ type: "pause", value: true });
      else if (s.status === "ended") mpvNotify({ type: "ended" });
      else if (s.status === "error") mpvNotify({ type: "error", message: s.error || "playback error" });
    }
    // Audio/subtitle track lists (+ current selection) — only re-emit on change.
    const tKey = JSON.stringify([s.audioTracks, s.subtitleTracks, s.selectedAudioTrackId, s.selectedSubtitleTrackId]);
    if (tKey !== nPrev.tKey) {
      nPrev.tKey = tKey;
      mpvNotify({
        type: "tracks",
        audio: Array.isArray(s.audioTracks) ? s.audioTracks : [],
        sub: Array.isArray(s.subtitleTracks) ? s.subtitleTracks : [],
        selectedAudio: s.selectedAudioTrackId,
        selectedSub: s.selectedSubtitleTrackId,
      });
    }
  }, 500);
}

function nLoad(url, startSec) {
  if (!nEnsureSession()) return false;
  nActive = true;
  nVisible = true;
  try { embeddedMpv.setBounds(nSid, nRect); } catch {}
  try {
    embeddedMpv.loadPlayback(nSid, {
      streamUrl: url,
      startTime: startSec > 0 ? Math.floor(startSec) : 0,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
  } catch (err) {
    mpvNotify({ type: "error", message: err?.message || "failed to load" });
    return false;
  }
  nStartPoll();
  return true;
}

function nStop() {
  nActive = false;
  clearInterval(nPollTimer); nPollTimer = null;
  nPrev = {};
  if (nSid) { try { embeddedMpv.disposeSession(nSid); } catch {} }
  nSid = null;
  nVisible = false;
}

function nSetBounds(rect) {
  nRect = rect;
  if (nSid && nVisible) { try { embeddedMpv.setBounds(nSid, rect); } catch {} }
}

function nSetVisible(visible) {
  if (!nSid) return;
  nVisible = visible;
  // No explicit hide in the addon — collapse the view offscreen to hide it so
  // HTML modals/spotlight can paint over the player area.
  try { embeddedMpv.setBounds(nSid, visible ? nRect : { x: -20000, y: -20000, width: 1, height: 1 }); } catch {}
}

function nCommand(name, value) {
  if (!nSid) return;
  try {
    if (name === "pause") embeddedMpv.setPaused(nSid, !!value);
    else if (name === "seek") embeddedMpv.seek(nSid, Number(value) || 0);
    else if (name === "volume") embeddedMpv.setVolume(nSid, Math.max(0, Math.min(130, Number(value) || 0)));
    else if (name === "mute") embeddedMpv.setVolume(nSid, value ? 0 : 100);
    else if (name === "audio-track") embeddedMpv.setAudioTrack(nSid, value);
    else if (name === "sub-track") embeddedMpv.setSubtitleTrack(nSid, value);
  } catch {}
}

// On WINDOWS, --wid embedding never produced video (compositor overdraws the
// foreign child window) so mpv keeps its OWN borderless always-on-top window and
// we steer its geometry over the player area via IPC. On macOS, --wid into a
// bare BaseWindow works, so we embed for real (see ensureVideoWin / positionVideoHost).

// ── Embedded host window (macOS --wid path) ─────────────────────────────────
// A frameless, non-focusable child BaseWindow that mpv draws into. BaseWindow
// (NOT BrowserWindow) is essential: a BrowserWindow's Chromium compositor paints
// opaque content into the same view and overdraws mpv's video (black, audio
// only). BaseWindow has a bare contentView, so mpv owns the pixels.
function ensureVideoWin() {
  if (!MPV_EMBED || !mainWindow) return null;
  if (videoWin && !videoWin.isDestroyed()) return videoWin;
  try {
    const { BaseWindow } = require("electron");
    videoWin = new BaseWindow({
      parent: mainWindow,        // glued to the app window; rides its z-order
      show: false,
      frame: false,
      transparent: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      focusable: false,          // never steal focus from the app
      roundedCorners: false,
      backgroundColor: "#000000",
    });
  } catch { videoWin = null; }
  return videoWin;
}

// macOS: the NSView* of the host window, as the signed int64 mpv's --wid wants.
function videoWinHandle() {
  const w = ensureVideoWin();
  if (!w) return null;
  try { return w.getNativeWindowHandle().readBigInt64LE(0).toString(); }
  catch { return null; }
}

function mpvGeometryString() {
  if (!mainWindow || !mpvLastRect) return null;
  try {
    const { screen } = require("electron");
    const c = mainWindow.getContentBounds();
    // mpv's geometry coordinate space differs by OS backend: on Windows it is
    // physical pixels (so we scale DIP → px by the display scale factor); on
    // macOS the Cocoa backend works in points (== Electron DIP), so we pass the
    // bounds through unscaled. getContentBounds()/getBoundingClientRect() are
    // both already in DIP with a top-left origin, matching mpv's +x+y.
    const sf = process.platform === "win32"
      ? (screen.getDisplayMatching(mainWindow.getBounds()).scaleFactor || 1)
      : 1;
    const x = Math.round((c.x + mpvLastRect.x) * sf);
    const y = Math.round((c.y + mpvLastRect.y) * sf);
    const w = Math.max(1, Math.round(mpvLastRect.width * sf));
    const h = Math.max(1, Math.round(mpvLastRect.height * sf));
    return `${w}x${h}+${x}+${y}`;
  } catch { return null; }
}

function positionVideoHost() {
  if (MPV_EMBED) {
    // Move the embedded host window over the player surface. Electron setBounds
    // is in DIP screen coords — far more reliable than steering mpv's geometry.
    if (!mainWindow || !videoWin || videoWin.isDestroyed() || !mpvLastRect) return;
    try {
      const c = mainWindow.getContentBounds();
      videoWin.setBounds({
        x: Math.round(c.x + mpvLastRect.x),
        y: Math.round(c.y + mpvLastRect.y),
        width: Math.max(1, Math.round(mpvLastRect.width)),
        height: Math.max(1, Math.round(mpvLastRect.height)),
      });
    } catch {}
    return;
  }
  const g = mpvGeometryString();
  if (g && mpvProc) mpvSend(["set_property", "geometry", g]);
}

let mpvMinimized = false;
function setMpvWindowVisible(visible) {
  if (MPV_EMBED) {
    if (!videoWin || videoWin.isDestroyed()) return;
    if (visible) { positionVideoHost(); try { videoWin.showInactive(); } catch {} }
    else { try { videoWin.hide(); } catch {} }
    return;
  }
  if (!mpvProc) return;
  // Idempotent: only toggle window-minimized when the state actually changes.
  // Spamming minimize→restore on the borderless float (e.g. on every channel
  // switch) is exactly what dropped mpv to audio-only on alternating loads.
  const wantMinimized = !visible;
  if (wantMinimized !== mpvMinimized) {
    mpvMinimized = wantMinimized;
    mpvSend(["set_property", "window-minimized", wantMinimized]);
  }
  if (visible) positionVideoHost();
}

function connectMpvIpc(attempt = 0) {
  if (!mpvProc) return;
  const sock = net.connect({ path: MPV_PIPE });
  sock.on("connect", () => {
    mpvSock = sock;
    mpvReady = true;
    mpvNotify({ type: "engine", state: "connected" });
    for (const line of mpvQueue) { try { sock.write(line); } catch {} }
    mpvQueue = [];
    // Push state changes to the renderer.
    mpvSend(["observe_property", 1, "pause"]);
    mpvSend(["observe_property", 2, "duration"]);
    mpvSend(["observe_property", 3, "track-list"]);
    // Position poll — 500ms is smooth enough for the UI clock.
    clearInterval(mpvPosTimer);
    mpvPosTimer = setInterval(() => {
      if (mpvActive) mpvSend(["get_property", "time-pos"]);
    }, 500);
  });
  let buf = "";
  sock.on("data", (d) => {
    buf += d.toString("utf-8");
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      if (msg.event === "property-change") {
        if (msg.name === "pause") mpvNotify({ type: "pause", value: !!msg.data });
        else if (msg.name === "duration" && typeof msg.data === "number") mpvNotify({ type: "duration", value: msg.data });
        else if (msg.name === "track-list") {
          // Normalize mpv's raw track-list into the SAME shape the renderer's
          // track pickers consume on the native (macOS) path, so the Windows
          // sidebar audio/subtitle pickers populate too.
          const list = Array.isArray(msg.data) ? msg.data : [];
          const map = (t) => ({ id: t.id, title: t.title, language: t.lang, selected: !!t.selected, forced: !!t.forced });
          const audio = list.filter((t) => t.type === "audio").map(map);
          const sub = list.filter((t) => t.type === "sub").map(map);
          const selA = audio.find((t) => t.selected);
          const selS = sub.find((t) => t.selected);
          mpvNotify({ type: "tracks", audio, sub, selectedAudio: selA ? selA.id : null, selectedSub: selS ? selS.id : -1 });
        }
      } else if (msg.event === "playback-restart" || msg.event === "file-loaded") {
        mpvNotify({ type: "playing" });
      } else if (msg.event === "end-file") {
        if (msg.reason === "eof") mpvNotify({ type: "ended" });
        else if (msg.reason === "error") mpvNotify({ type: "error", message: msg.file_error || "playback error" });
      } else if (typeof msg.request_id !== "undefined") {
        const cmdName = mpvCmdNames.get(msg.request_id) || "";
        mpvCmdNames.delete(msg.request_id);
        if (typeof msg.data === "number" && cmdName.startsWith("get_property")) {
          // response to the time-pos poll
          mpvNotify({ type: "time", value: msg.data });
        } else if (msg.error && msg.error !== "success" && !cmdName.startsWith("get_property")) {
          // Rejected COMMANDS must never be silent (this silence hid the
          // loadfile "invalid parameter" black screen). Property reads are
          // exempt: the time-pos poll legitimately returns "property
          // unavailable" while a stream is still loading.
          mpvNotify({ type: "cmd-error", message: `${msg.error} (${cmdName})` });
        }
      }
    }
  });
  sock.on("error", () => {
    mpvReady = false; mpvSock = null;
    if (attempt < 40 && mpvProc) setTimeout(() => connectMpvIpc(attempt + 1), 250);
    else if (mpvProc) mpvNotify({ type: "engine", state: "ipc-failed" });
  });
  sock.on("close", () => { mpvReady = false; mpvSock = null; });
}

function startMpv() {
  if (mpvProc || !mpvPath) return mpvProc ? true : false;
  // Any failure here must surface as a player error — NEVER crash the app.
  try {
    const logFile = path.join(app.getPath("userData"), "mpv.log");
    const errFile = path.join(app.getPath("userData"), "mpv-stderr.log");
    let errFd = "ignore";
    try { errFd = fs.openSync(errFile, "a"); } catch {}
    // Host flags differ by platform. macOS: embed into the BaseWindow via --wid
    // (mpv fills that window; Electron controls its bounds). Windows: mpv's own
    // borderless always-on-top window steered by geometry.
    let hostArgs;
    if (MPV_EMBED) {
      const wid = videoWinHandle();
      if (!wid) { mpvNotify({ type: "spawn-error", message: "could not create video surface" }); return false; }
      hostArgs = ["--wid=" + wid, "--force-window=yes"];
    } else {
      const geo = mpvGeometryString();
      hostArgs = [
        "--force-window=yes",
        "--border=no",
        "--ontop=yes",               // floats over the app window (we steer geometry)
        "--focus-on=never",          // don't steal focus from the app
        "--window-dragging=no",      // dragging the video must not move the float
        "--snap-window=no",
        ...(geo ? ["--geometry=" + geo] : []),
      ];
    }
    mpvProc = spawn(mpvPath, [
      "--input-ipc-server=" + MPV_PIPE,
      "--no-config",
      "--idle=yes",
      "--keep-open=no",
      ...hostArgs,
      "--osc=yes",                 // mpv's on-screen controls (seek/pause/tracks)
      "--ytdl=no",                 // never fall back to youtube-dl (slow, pointless for direct URLs)
      "--hwdec=auto-safe",
      // Buffering: a generous demuxer cache + readahead smooths IPTV jitter,
      // and the lavf reconnect options auto-recover dropped HTTP live streams
      // instead of stalling on a black frame.
      "--cache=yes",
      "--cache-secs=30",
      "--demuxer-max-bytes=128MiB",
      "--demuxer-max-back-bytes=32MiB",
      "--demuxer-readahead-secs=20",
      "--network-timeout=15",
      "--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5",
      "--alang=ara,ar,eng,en,fra,fr",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--log-file=" + logFile,
    ], { stdio: ["ignore", "ignore", errFd], windowsHide: true });
    mpvNotify({ type: "engine", state: "spawned" });
    // CRITICAL: without this listener a failed spawn (missing exe, antivirus
    // block, bad arch) emits an unhandled 'error' event and kills the whole
    // main process — the app "just closes".
    mpvProc.on("error", (err) => {
      mpvProc = null; mpvReady = false; mpvSock = null; mpvActive = false;
      clearInterval(mpvPosTimer);
      mpvNotify({ type: "spawn-error", message: err?.message || "failed to start mpv" });
    });
    mpvProc.on("exit", () => {
      mpvProc = null; mpvReady = false; mpvSock = null;
      clearInterval(mpvPosTimer);
      if (mpvActive) mpvNotify({ type: "exit" });
      mpvActive = false;
    });
    setTimeout(() => connectMpvIpc(), 300);
    return true;
  } catch (err) {
    mpvProc = null;
    mpvNotify({ type: "spawn-error", message: err?.message || "failed to start mpv" });
    return false;
  }
}

function stopMpvPlayback() {
  mpvActive = false;
  mpvPendingLoad = null;
  mpvSend(["stop"]);
  setMpvWindowVisible(false);
}

// mpv MUST never outlive the app. An orphaned mpv keeps holding the provider's
// connection slot (accounts are often max_connections=1) so the NEXT launch
// can't play — it gets a connection-limit error (HTTP 458) and a stray floating
// mpv window appears. We kill it on every exit path, including dev Ctrl+C.
function killMpv() {
  try { mpvProc?.kill("SIGKILL"); } catch {}
  mpvProc = null;
  // In-process libmpv: disposing the session closes its connection cleanly.
  // (No orphan process is possible here — it dies with the app automatically.)
  try { if (USE_NATIVE_EMBED && nSid) embeddedMpv.disposeSession(nSid); } catch {}
  nSid = null;
}
// Close the stream connection CLEANLY before exiting. A SIGKILL'd mpv drops the
// socket without an HTTP close, so the provider keeps counting the connection as
// active (against max_connections) until its own timeout — which blocks the next
// launch from playing. `quit` lets mpv shut the connection down properly.
function gracefulQuitMpv() {
  try { mpvSend(["quit"]); } catch {}
}
process.on("exit", killMpv);
process.once("SIGINT", () => { gracefulQuitMpv(); setTimeout(() => { killMpv(); process.exit(0); }, 300); });
process.once("SIGTERM", () => { gracefulQuitMpv(); setTimeout(() => { killMpv(); process.exit(0); }, 300); });
app.on("will-quit", killMpv);

let appQuitting = false;
app.on("before-quit", () => {
  appQuitting = true;
  try { if (USE_NATIVE_EMBED) nStop(); } catch {}
  try { mpvSend(["quit"]); } catch {}
  setTimeout(() => { try { mpvProc?.kill(); } catch {} }, 200);
  try { if (videoWin && !videoWin.isDestroyed()) videoWin.destroy(); } catch {}
});

ipcMain.on("mpv-available", (e) => { e.returnValue = USE_NATIVE_EMBED || !!mpvPath; });
let mpvPendingLoad = null; // load requested before the surface rect was known

function execMpvLoad(url, startSec) {
  if (!startMpv()) return false;
  mpvActive = true;
  positionVideoHost();
  setMpvWindowVisible(true);
  // NEVER pass extra positional args to loadfile — newer mpv changed the
  // signature (3rd arg = integer index) and an empty-string options arg makes
  // the whole command fail with "invalid parameter" (black screen, no file).
  // The resume position goes through the `start` option-property instead.
  mpvSend(["set_property", "start", startSec > 0 ? String(Math.floor(startSec)) : "none"]);
  mpvSend(["loadfile", url, "replace"]);
  mpvSend(["set_property", "pause", false]);
  mainWindow?.focus();
  return true;
}

ipcMain.handle("mpv-load", (_e, url, startSec) => {
  try {
    if (USE_NATIVE_EMBED) {
      if (!nRect || nRect.width <= 1) {
        // Surface rect not reported yet — defer until the renderer measures it.
        mpvPendingLoad = { url, startSec };
        nActive = true;
        return true;
      }
      return nLoad(url, startSec);
    }
    if (!mpvPath) return false;
    if (!mpvLastRect) {
      // Surface rect not reported yet — defer so mpv never attaches to a
      // hidden default-size window.
      mpvPendingLoad = { url, startSec };
      mpvActive = true;
      return true;
    }
    return execMpvLoad(url, startSec);
  } catch { return false; }
});
ipcMain.handle("mpv-stop", () => {
  try { if (USE_NATIVE_EMBED) { mpvPendingLoad = null; nStop(); } else stopMpvPlayback(); } catch {}
});
ipcMain.handle("mpv-set-bounds", (_e, rect) => {
  try {
    if (USE_NATIVE_EMBED) {
      nSetBounds(rect);
      if (mpvPendingLoad) {
        const p = mpvPendingLoad; mpvPendingLoad = null;
        if (!nLoad(p.url, p.startSec)) mpvNotify({ type: "spawn-error", message: "engine failed to start" });
      }
      return;
    }
    mpvLastRect = rect;
    if (mpvPendingLoad) {
      const p = mpvPendingLoad; mpvPendingLoad = null;
      if (!execMpvLoad(p.url, p.startSec)) mpvNotify({ type: "spawn-error", message: "engine failed to start" });
      return;
    }
    if (!mpvActive) return;
    positionVideoHost();
  } catch {}
});
ipcMain.handle("mpv-set-visible", (_e, visible) => {
  try {
    if (USE_NATIVE_EMBED) { nSetVisible(!!visible && nActive); return; }
    setMpvWindowVisible(!!visible && mpvActive);
  } catch {}
});
ipcMain.handle("mpv-command", (_e, cmd) => {
  try {
    if (USE_NATIVE_EMBED) { nCommand(cmd?.name, cmd?.value); return; }
    // whitelisted control surface from the renderer
    const allowed = {
      pause: (v) => mpvSend(["set_property", "pause", !!v]),
      seek: (v) => mpvSend(["seek", Number(v) || 0, "absolute"]),
      volume: (v) => mpvSend(["set_property", "volume", Math.max(0, Math.min(130, Number(v) || 0))]),
      mute: (v) => mpvSend(["set_property", "mute", !!v]),
      "audio-track": (v) => mpvSend(["set_property", "aid", v === -1 || v === "-1" ? "no" : v]),
      "sub-track": (v) => mpvSend(["set_property", "sid", v === -1 || v === "-1" ? "no" : v]),
    };
    const fn = allowed[cmd?.name];
    if (fn) fn(cmd.value);
  } catch {}
});

// Enable native audio/video track selection API for MKV containers
app.commandLine.appendSwitch("enable-blink-features", "AudioVideoTracks");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      enableWebSQL: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  const isDev = process.env.ELECTRON_DEV === "1";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.on("maximize", () => mainWindow.webContents.send("window-maximized", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("window-maximized", false));
  mainWindow.on("enter-full-screen", () => mainWindow.webContents.send("window-fullscreen", true));
  mainWindow.on("leave-full-screen", () => mainWindow.webContents.send("window-fullscreen", false));

  // Keep the mpv video region glued to the player surface as the app moves/resizes.
  mainWindow.on("move", positionVideoHost);
  mainWindow.on("resize", positionVideoHost);
  mainWindow.on("minimize", () => setMpvWindowVisible(false));
  mainWindow.on("restore", () => { if (mpvActive) setMpvWindowVisible(true); });
  // ontop only applies to the floating-window (Windows) path; under --wid the
  // embedded child rides the app's own z-order, so setting ontop would just be a
  // rejected IPC command.
  if (!MPV_EMBED) {
    mainWindow.on("focus", () => { if (mpvActive) mpvSend(["set_property", "ontop", true]); });
    mainWindow.on("blur", () => { if (mpvProc) mpvSend(["set_property", "ontop", false]); });
  }
  mainWindow.on("closed", () => {
    try { if (USE_NATIVE_EMBED) nStop(); } catch {}
    // Quit mpv gracefully so the provider's connection slot frees right away.
    gracefulQuitMpv();
    setTimeout(() => { try { mpvProc?.kill(); } catch {} mpvProc = null; }, 300);
    try { if (videoWin && !videoWin.isDestroyed()) videoWin.destroy(); } catch {}
    videoWin = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Clear any mpv orphaned by a previous crash before we ever spawn ours.
    reapOrphanMpv();

    // CORS for the renderer's media/stream requests.
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const url = details.url.toLowerCase();
      if (url.includes("/movie/") || url.includes("/series/")) {
        const headers = { ...details.responseHeaders };
        headers["access-control-allow-origin"] = ["*"];
        callback({ responseHeaders: headers });
      } else {
        callback({ responseHeaders: details.responseHeaders });
      }
    });

    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Over-the-air updates from GitHub releases (checks ~30s after launch to
    // stay out of startup's way; downloads in background, installs on quit).
    if (app.isPackaged) {
      setTimeout(() => {
        try {
          const { autoUpdater } = require("electron-updater");
          autoUpdater.autoDownload = true;
          autoUpdater.on("error", () => {});
          autoUpdater.checkForUpdatesAndNotify().catch(() => {});
        } catch {}
      }, 30000);
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers
ipcMain.handle("get-platform", () => process.platform);

ipcMain.handle("minimize-window", () => mainWindow?.minimize());
ipcMain.handle("maximize-window", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("close-window", () => mainWindow?.close());
ipcMain.handle("is-maximized", () => mainWindow?.isMaximized());
ipcMain.handle("toggle-fullscreen", () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});
ipcMain.handle("is-fullscreen", () => mainWindow?.isFullScreen());

ipcMain.handle("open-m3u-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open M3U Playlist",
    filters: [
      { name: "M3U Playlists", extensions: ["m3u", "m3u8"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, "utf-8");
  return { path: filePath, content, name: path.basename(filePath) };
});

ipcMain.handle("fetch-url", async (_, url) => {
  const follow = (targetUrl, redirects = 0) => {
    if (redirects > 5) return Promise.reject(new Error("Too many redirects"));
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
      const req = lib.request(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(follow(res.headers.location, redirects + 1));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (body.trim().startsWith("#EXTM3U") || (res.statusCode >= 200 && res.statusCode < 300)) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      req.end();
    });
  };
  return follow(url);
});

// OpenSubtitles.com API — supply your own key via the LIVEBOX_OPENSUBTITLES_KEY
// env var (get one free at https://www.opensubtitles.com/en/consumers). When
// unset, online subtitle search is simply disabled (returns no results).
const OPENSUB_KEY = process.env.LIVEBOX_OPENSUBTITLES_KEY || "";
const OPENSUB_HEADERS = { "User-Agent": "LiveBox v1.0", "Api-Key": OPENSUB_KEY, "Accept": "application/json" };

function opensub(urlPath) {
  return new Promise((resolve, reject) => {
    const doReq = (u) => {
      const full = u.startsWith("http") ? u : `https://api.opensubtitles.com${u}`;
      https.get(full, { headers: OPENSUB_HEADERS }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doReq(res.headers.location);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))));
        res.on("error", reject);
      }).on("error", reject);
    };
    doReq(urlPath);
  });
}

ipcMain.handle("search-subs", async (_, query, season, episode) => {
  if (!OPENSUB_KEY) return [];   // online subtitle search disabled without a key
  try {
    let url = `/api/v1/subtitles?query=${encodeURIComponent(query)}&languages=ar,en,fr`;
    if (season) url += `&season_number=${season}`;
    if (episode) url += `&episode_number=${episode}`;
    const data = await opensub(url);
    if (!data.data?.length) return [];
    // Best result per language
    const seen = {};
    const tracks = [];
    for (const d of data.data) {
      const a = d.attributes;
      const lang = a.language || "und";
      if (seen[lang]) continue;
      seen[lang] = true;
      const fileId = a.files?.[0]?.file_id;
      if (!fileId) continue;
      tracks.push({
        id: tracks.length,
        name: { en: "English", ar: "Arabic", fr: "French" }[lang] || lang,
        lang,
        fileId,
      });
    }
    return tracks;
  } catch {
    return [];
  }
});

ipcMain.handle("download-sub", async (_, fileId) => {
  if (!OPENSUB_KEY) return null;   // disabled without a key
  try {
    const postData = JSON.stringify({ file_id: fileId });
    const dlInfo = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.opensubtitles.com",
        path: "/api/v1/download",
        method: "POST",
        headers: { ...OPENSUB_HEADERS, "Content-Type": "application/json", "Content-Length": postData.length },
      }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write(postData);
      req.end();
    });
    if (!dlInfo.link) return null;
    // Download the actual SRT file
    return new Promise((resolve, reject) => {
      const doReq = (url) => {
        const lib = url.startsWith("https") ? https : http;
        lib.get(url, { headers: { "User-Agent": "LiveBox v1.0" } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return doReq(res.headers.location);
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        }).on("error", reject);
      };
      doReq(dlInfo.link);
    });
  } catch {
    return null;
  }
});
