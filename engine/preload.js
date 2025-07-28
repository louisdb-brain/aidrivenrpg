const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveSpells: (data) => ipcRenderer.send('save-spells', data),
    loadSpells: () => ipcRenderer.invoke('load-spells')
});
