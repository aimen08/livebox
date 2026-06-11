const { contextBridge, ipcRenderer } = require("electron");

// True only on Windows when the bundled mpv engine is present.
const mpvAvailable = ipcRenderer.sendSync("mpv-available") === true;

contextBridge.exposeInMainWorld("electron", {
  mpvAvailable,
  mpv: {
    load: (url, startSec) => ipcRenderer.invoke("mpv-load", url, startSec || 0),
    stop: () => ipcRenderer.invoke("mpv-stop"),
    setBounds: (rect) => ipcRenderer.invoke("mpv-set-bounds", rect),
    setVisible: (v) => ipcRenderer.invoke("mpv-set-visible", v),
    command: (name, value) => ipcRenderer.invoke("mpv-command", { name, value }),
    onEvent: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on("mpv-event", handler);
      return () => ipcRenderer.removeListener("mpv-event", handler);
    },
  },
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  maximizeWindow: () => ipcRenderer.invoke("maximize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),
  openM3UFile: () => ipcRenderer.invoke("open-m3u-file"),
  fetchURL: (url) => ipcRenderer.invoke("fetch-url", url),
  searchSubs: (query, season, episode) => ipcRenderer.invoke("search-subs", query, season, episode),
  downloadSub: (url) => ipcRenderer.invoke("download-sub", url),
  onWindowMaximized: (cb) => {
    ipcRenderer.on("window-maximized", (_, val) => cb(val));
  },
});
