const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

const STREAM_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Local HLS proxy ──────────────────────────────────────────────────────────
// Live streams 302-redirect to a rotating CDN edge and emit relative segment
// paths that the origin host 403s. We follow the redirect and rewrite those
// paths to absolute edge URLs so hls.js fetches segments from the edge.
let proxyPort = 0;

function fetchFinal(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error("too many redirects"));
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": STREAM_UA, Accept: "*/*" } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(fetchFinal(new URL(r.headers.location, url).toString(), redirects + 1));
      }
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf-8"), finalUrl: url }));
      r.on("error", reject);
    });
    req.on("error", reject);
  });
}

function absolutize(uri, finalUrl) {
  try { return new URL(uri, finalUrl).toString(); } catch { return uri; }
}

function serveHls(target, res, attempt = 0) {
  fetchFinal(target)
    .then(({ body, finalUrl }) => {
      // The provider intermittently returns an empty body or an HTML error page
      // instead of a manifest. Don't hand that to hls.js (it throws a fatal
      // levelParsingError) — retry once, then 502 so hls.js retries the load.
      if (!body || body.indexOf("#EXTM3U") === -1) {
        if (attempt < 1) return setTimeout(() => serveHls(target, res, attempt + 1), 300);
        res.writeHead(502); res.end(); return;
      }
      const out = body
        .split("\n")
        .map((line) => {
          const l = line.trim();
          if (!l) return line;
          if (l.startsWith("#")) {
            return l.includes('URI="')
              ? line.replace(/URI="([^"]+)"/, (_, u) => `URI="${absolutize(u, finalUrl)}"`)
              : line;
          }
          return absolutize(l, finalUrl);
        })
        .join("\n");
      res.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      res.end(out);
    })
    .catch(() => { res.writeHead(502); res.end(); });
}

function startProxy() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let parsed;
      try { parsed = new URL(req.url, "http://127.0.0.1"); } catch { res.writeHead(400); res.end(); return; }
      const target = parsed.searchParams.get("u");
      if (!target) { res.writeHead(400); res.end(); return; }
      if (parsed.pathname === "/hls") return serveHls(target, res);
      res.writeHead(404); res.end();
    });
    server.on("error", (e) => { console.error("hls proxy error", e); resolve(); });
    server.listen(0, "127.0.0.1", () => { proxyPort = server.address().port; resolve(); });
  });
}

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

  app.whenReady().then(async () => {
    await startProxy();

    // The VOD catalog is H.264+AAC in Matroska (.mkv). Chromium's <video> can
    // demux Matroska, but only when the response is labelled `video/webm` (WebM
    // is a Matroska subset) — served as `video/x-matroska` it fails to play on
    // Windows. So relabel any Matroska stream to video/webm. (Verified on macOS
    // the relabel still plays; this is the no-transcode fix for Windows.)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      const ctKey = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
      const ct = ctKey ? String(headers[ctKey]).toLowerCase() : "";
      const url = details.url.toLowerCase();
      const isVod = url.includes("/movie/") || url.includes("/series/");
      if (ct.includes("matroska") || (isVod && (ct.includes("octet-stream") || ct === ""))) {
        if (ctKey) delete headers[ctKey];
        headers["Content-Type"] = ["video/webm"];
        headers["access-control-allow-origin"] = ["*"];
        callback({ responseHeaders: headers });
      } else if (isVod) {
        headers["access-control-allow-origin"] = ["*"];
        callback({ responseHeaders: headers });
      } else {
        callback({ responseHeaders: headers });
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
ipcMain.on("get-proxy-port", (e) => { e.returnValue = proxyPort; });
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
