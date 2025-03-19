const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Déterminer l'icône à utiliser selon la plateforme
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'images', 'icon.ico');
  } else {
    iconPath = path.join(__dirname, 'images', 'icon.png');
  }

  // Créer la fenêtre du navigateur avec l'icône spécifiée
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    // Ajout des options pour cacher la barre de menu
    autoHideMenuBar: true // Cette option cache automatiquement la barre de menu
  });

  // Pour supprimer complètement la barre de menu (option la plus radicale)
  mainWindow.setMenu(null);

  // Charger le site Mistral AI Chat
  mainWindow.loadURL('https://mammouth.ai/app/a/default');

  // Définir le titre de la fenêtre
  mainWindow.setTitle('Mammouth AI Chat');

  // Ouvrir les outils de développement (optionnel)
  // mainWindow.webContents.openDevTools();
}

// Quand Electron a fini de s'initialiser
app.whenReady().then(() => {
  createWindow();
  
  // Sur macOS, définir l'icône du dock
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'images', 'icon.png'));
  }
});

// Quitter quand toutes les fenêtres sont fermées, sauf sur macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Sur macOS, recréer une fenêtre quand l'icône du dock est cliquée
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
