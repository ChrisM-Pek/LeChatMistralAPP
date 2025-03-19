const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Assurez-vous que cela est désactivé si vous utilisez nodeIntegration
        },
        icon: path.join(__dirname, 'images', 'icon.png')
    });

    win.loadURL('https://mammouth.ai');

    // Intercepter les tentatives de navigation dans la même fenêtre
    win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    // Intercepter les tentatives d'ouverture de nouvelles fenêtres
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Intercepter les clics sur les liens qui ouvrent de nouvelles fenêtres
    win.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

