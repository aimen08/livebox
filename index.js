const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const { spawn } = require("child_process");

// ── mpv playback engine (Windows only) ──────────────────────────────────────
// Chromium's <video> on Windows cannot demux the provider's MKV catalog and
// chokes on its redirecting live HLS. On Windows we render ALL playback with a
// bundled mpv (ffmpeg inside: every container/codec, hw decode, robust live
// handling). mpv runs as a child process drawing into a child window via
// --wid and is controlled over its JSON IPC pipe — no native modules needed.
// macOS/Linux keep the Chromium <video>/hls.js path (it works there).

function resolveMpvPath() {
  // Explicit override — lets us point at any mpv binary (dev smoke-testing on
  // macOS, or a user-supplied build on Windows).
  if (process.env.LIVEBOX_MPV) {
    try { if (fs.existsSync(process.env.LIVEBOX_MPV)) return process.env.LIVEBOX_MPV; } catch {}
  }
  if (process.platform !== "win32") return null;
  const candidates = [
    path.join(process.resourcesPath || "", "mpv", "mpv.exe"),
    path.join(__dirname, "build-res", "win", "mpv", "mpv.exe"),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}
const mpvPath = resolveMpvPath();
const MPV_PIPE = process.platform === "win32"
  ? "\\\\.\\pipe\\livebox-mpv-" + process.pid
  : path.join(require("os").tmpdir(), "livebox-mpv-" + process.pid + ".sock");

let videoHost = null;       // frameless child BrowserWindow mpv draws into
let mpvProc = null;
let mpvSock = null;
let mpvReady = false;
let mpvActive = false;      // something is (or should be) playing
let mpvQueue = [];          // commands queued until the IPC pipe connects
let mpvLastRect = null;     // last bounds reported by the renderer (DIP, relative to content)
let mpvPosTimer = null;
let mpvReqSeq = 0;
const mpvCmdNames = new Map(); // request_id → command label, to classify responses

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

function ensureVideoHost() {
  if (videoHost && !videoHost.isDestroyed()) return videoHost;
  videoHost = new BrowserWindow({
    parent: mainWindow,
    frame: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#000000",
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "LiveBox Video",
  });
  videoHost.setMenuBarVisibility(false);
  videoHost.on("close", (e) => { if (!appQuitting) e.preventDefault(); });
  return videoHost;
}

function positionVideoHost() {
  if (!videoHost || videoHost.isDestroyed() || !mainWindow || !mpvLastRect) return;
  try {
    const c = mainWindow.getContentBounds();
    videoHost.setBounds({
      x: Math.round(c.x + mpvLastRect.x),
      y: Math.round(c.y + mpvLastRect.y),
      width: Math.max(1, Math.round(mpvLastRect.width)),
      height: Math.max(1, Math.round(mpvLastRect.height)),
    });
  } catch {}
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
        else if (msg.name === "track-list") mpvNotify({ type: "tracks", value: msg.data });
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
    const host = ensureVideoHost();
    const hbuf = host.getNativeWindowHandle();
    // SIGNED read is deliberate: HWNDs ≥ 0x80000000 sign-extend on Win64, and
    // mpv's --wid parses an int64 — the canonical libmpv embedding form is the
    // signed value (an unsigned print can exceed INT64_MAX and fail to parse,
    // leaving mpv detached while the host window stays black).
    const wid = hbuf.length >= 8 ? hbuf.readBigInt64LE(0).toString() : hbuf.readInt32LE(0).toString();
    const logFile = path.join(app.getPath("userData"), "mpv.log");
    const errFile = path.join(app.getPath("userData"), "mpv-stderr.log");
    let errFd = "ignore";
    try { errFd = fs.openSync(errFile, "a"); } catch {}
    mpvProc = spawn(mpvPath, [
      "--wid=" + wid,
      "--input-ipc-server=" + MPV_PIPE,
      "--no-config",
      "--idle=yes",
      "--force-window=yes",
      "--keep-open=no",
      "--no-border",
      "--osc=yes",                 // mpv's on-screen controls (seek/pause/tracks)
      "--hwdec=auto-safe",
      "--cache=yes",
      "--demuxer-max-bytes=64MiB",
      "--alang=ara,ar,eng,en,fra,fr",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--log-file=" + logFile,
    ], { stdio: ["ignore", "ignore", errFd], windowsHide: true });
    mpvNotify({ type: "engine", state: "spawned", wid });
    // CRITICAL: without this listener a failed spawn (missing exe, antivirus
    // block, bad arch) emits an unhandled 'error' event and kills the whole
    // main process — the app "just closes".
    mpvProc.on("error", (err) => {
      mpvProc = null; mpvReady = false; mpvSock = null; mpvActive = false;
      clearInterval(mpvPosTimer);
      mpvNotify({ type: "spawn-error", message: err?.message || "failed to start mpv" });
      if (videoHost && !videoHost.isDestroyed()) videoHost.hide();
    });
    mpvProc.on("exit", () => {
      mpvProc = null; mpvReady = false; mpvSock = null;
      clearInterval(mpvPosTimer);
      if (mpvActive) mpvNotify({ type: "exit" });
      mpvActive = false;
      if (videoHost && !videoHost.isDestroyed()) videoHost.hide();
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
  mpvSend(["stop"]);
  if (videoHost && !videoHost.isDestroyed()) videoHost.hide();
}

let appQuitting = false;
app.on("before-quit", () => {
  appQuitting = true;
  try { mpvSend(["quit"]); } catch {}
  setTimeout(() => { try { mpvProc?.kill(); } catch {} }, 200);
});

ipcMain.on("mpv-available", (e) => { e.returnValue = !!mpvPath; });
ipcMain.handle("mpv-load", (_e, url, startSec) => {
  try {
    if (!mpvPath) return false;
    if (!startMpv()) return false;
    mpvActive = true;
    // NEVER pass extra positional args to loadfile — newer mpv changed the
    // signature (3rd arg = integer index) and an empty-string options arg makes
    // the whole command fail with "invalid parameter" (black screen, no file).
    // The resume position goes through the `start` option-property instead.
    mpvSend(["set_property", "start", startSec > 0 ? String(Math.floor(startSec)) : "none"]);
    mpvSend(["loadfile", url, "replace"]);
    mpvSend(["set_property", "pause", false]);
    if (mpvLastRect) { positionVideoHost(); videoHost?.show(); mainWindow?.focus(); }
    return true;
  } catch { return false; }
});
ipcMain.handle("mpv-stop", () => { try { stopMpvPlayback(); } catch {} });
ipcMain.handle("mpv-set-bounds", (_e, rect) => {
  try {
    mpvLastRect = rect;
    if (!mpvActive) return;
    ensureVideoHost();
    positionVideoHost();
    if (videoHost && !videoHost.isDestroyed() && !videoHost.isVisible()) videoHost.show();
  } catch {}
});
ipcMain.handle("mpv-set-visible", (_e, visible) => {
  try {
    if (!videoHost || videoHost.isDestroyed()) return;
    if (visible && mpvActive) { positionVideoHost(); videoHost.show(); }
    else videoHost.hide();
  } catch {}
});
ipcMain.handle("mpv-command", (_e, cmd) => {
  try {
    // whitelisted control surface from the renderer
    const allowed = {
      pause: (v) => mpvSend(["set_property", "pause", !!v]),
      seek: (v) => mpvSend(["seek", Number(v) || 0, "absolute"]),
      volume: (v) => mpvSend(["set_property", "volume", Math.max(0, Math.min(130, Number(v) || 0))]),
      mute: (v) => mpvSend(["set_property", "mute", !!v]),
      "audio-track": (v) => mpvSend(["set_property", "aid", v]),
      "sub-track": (v) => mpvSend(["set_property", "sid", v]),
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

  // Keep the mpv video host glued to the player region as the window moves.
  mainWindow.on("move", positionVideoHost);
  mainWindow.on("resize", positionVideoHost);
  mainWindow.on("minimize", () => { if (videoHost && !videoHost.isDestroyed()) videoHost.hide(); });
  mainWindow.on("restore", () => { if (mpvActive && videoHost && !videoHost.isDestroyed()) { positionVideoHost(); videoHost.show(); } });
  mainWindow.on("closed", () => { try { mpvProc?.kill(); } catch {} });
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

// OpenSubtitles.com API
const OPENSUB_KEY = "REDACTED_OPENSUBTITLES_KEY";
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
