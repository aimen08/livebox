const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
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
