const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('testflow', {
  platform: process.platform,
  isElectron: true,
})
