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

  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));

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
