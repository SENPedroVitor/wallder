const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('wendlerIsland', {
  snapshot: () => ipcRenderer.invoke('island:snapshot'),
  action: input => ipcRenderer.invoke('island:action', input),
  pointer: inside => ipcRenderer.send('island:pointer', inside === true),
  surface: bounds => ipcRenderer.send('island:surface', bounds),
  open: input => ipcRenderer.invoke('island:open', input),
  unfollow: id => ipcRenderer.invoke('island:unfollow', id),
  copyPix: id => ipcRenderer.invoke('island:copy-pix', id),
  hide: () => ipcRenderer.send('island:hide'),
  onCollapse: callback => { const listener = () => callback(); ipcRenderer.on('island:collapse', listener); return () => ipcRenderer.removeListener('island:collapse', listener) },
  onToggle: callback => { const listener = () => callback(); ipcRenderer.on('island:toggle', listener); return () => ipcRenderer.removeListener('island:toggle', listener) },
})
