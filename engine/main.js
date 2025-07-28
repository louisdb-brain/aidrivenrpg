const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, 'build/index.html'));
}

ipcMain.on('save-spells', (event, spellData) => {
    const filePath = path.resolve(__dirname, '..', 'spells.json');
    fs.writeFileSync(filePath, JSON.stringify(spellData, null, 2));
    console.log(' spells.json saved!');
});

ipcMain.handle('load-spells', async () => {
    const filePath = path.resolve(__dirname, '..', 'spells.json');
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        console.error('Failed to load spells.json:', e);
        return []; // Return empty array to avoid crashing the renderer
    }
    win.webContents.openDevTools()
});


app.whenReady().then(createWindow);

