const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    frame: process.platform !== "win32",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

  app.whenReady().then(() => {
    // Fix MIME types for video streaming (MKV, etc.)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const url = details.url.toLowerCase();
      if (url.includes("/movie/") || url.includes("/series/")) {
        const headers = { ...details.responseHeaders };
        headers["content-type"] = ["video/mp4"];
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
    const lib = parsed.protocol === "https:" ? require("https") : require("http");
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

ipcMain.handle("store-get", (_, key) => {
  try {
    const storePath = path.join(app.getPath("userData"), "store.json");
    if (!fs.existsSync(storePath)) return null;
    const data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    return data[key] ?? null;
  } catch { return null; }
});

ipcMain.handle("store-set", (_, key, value) => {
  try {
    const storePath = path.join(app.getPath("userData"), "store.json");
    let data = {};
    if (fs.existsSync(storePath)) data = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    data[key] = value;
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
});
