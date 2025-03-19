const { contextBridge, ipcRenderer } = require('electron');

// Exposer les méthodes Electron sécurisées aux scripts du renderer
contextBridge.exposeInMainWorld('electron', {
  changeResolution: (width, height) => {
    console.log('Demande de changement de résolution:', width, height);
    ipcRenderer.send('change-resolution', width, height);
  }
});

console.log('Preload script exécuté avec succès');
