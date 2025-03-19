const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuration par défaut
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// Position codée en dur du bouton de résolution (ne change pas)
const BUTTON_POSITION = {
  left: 12,
  bottom: 60
};

// Position codée en dur du dropdown (ne change pas)
const DROPDOWN_POSITION = {
  left: 12,
  bottom: 105
};

// Charger ou initialiser la configuration (uniquement pour les dimensions de la fenêtre)
let config;
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(configData);
    console.log('Configuration chargée depuis:', CONFIG_FILE);
    
    // S'assurer que le champ window existe
    if (!config.window) {
      config.window = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
  } else {
    config = { window: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT } };
    console.log('Aucun fichier de configuration trouvé, utilisation des dimensions par défaut');
    saveConfig(config);
  }
} catch (err) {
  console.error('Erreur lors du chargement de la configuration:', err);
  config = { window: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT } };
  saveConfig(config);
}

// Fonction pour sauvegarder la configuration (uniquement les dimensions)
function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf8');
    console.log('Configuration sauvegardée');
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la configuration:', err);
  }
}

// Déclaration de mainWindow au niveau global du script
let mainWindow = null;

function createWindow() {
  // Récupérer la résolution sauvegardée
  const savedWidth = config.window.width;
  const savedHeight = config.window.height;

  // Déterminer l'icône à utiliser selon la plateforme
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'images', 'icon.ico');
  } else {
    iconPath = path.join(__dirname, 'images', 'icon.png');
  }

  // Créer la fenêtre du navigateur avec la résolution sauvegardée
  mainWindow = new BrowserWindow({
    width: savedWidth,
    height: savedHeight,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });

  // Pour supprimer complètement la barre de menu
  mainWindow.setMenu(null);

  // Charger le site Mammouth AI Chat
  mainWindow.loadURL('https://mammouth.ai/app/a/default');

  // Utiliser notre approche hybride pour injecter le bouton après le chargement
  mainWindow.webContents.on('did-finish-load', () => {
    // Attendre un petit délai initial pour laisser le DOM se construire
    setTimeout(() => {
      checkForUIReadyAndInjectButton();
    }, 500);
  });

  // Définir le titre de la fenêtre
  mainWindow.setTitle('Mammouth AI Chat');

  // Enregistrer la taille de la fenêtre quand elle est fermée
  mainWindow.on('close', () => {
    if (!mainWindow) return; // Vérification de sécurité
    
    const { width, height } = mainWindow.getBounds();
    config.window.width = width;
    config.window.height = height;
    saveConfig(config);
  });
}

function checkForUIReadyAndInjectButton(attempts = 0) {
  // Vérification de sécurité
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('La fenêtre principale n\'existe plus, abandon de l\'injection');
    return;
  }
  
  // Limiter le nombre de tentatives (10 max = 3 secondes)
  if (attempts >= 3) {
    console.log('Nombre maximum de tentatives atteint, injection du bouton...');
    injectResolutionButton();
    return;
  }

  // Vérifie si certains éléments de l'interface Mammouth AI sont présents
  mainWindow.webContents.executeJavaScript(`
    (function() {
      // Vérifier plusieurs éléments clés
      const chatInputReady = document.querySelector('.mammouth-chat-input') !== null 
                          || document.querySelector('textarea') !== null;
      const appContainerReady = document.querySelector('#app') !== null;
      
      return chatInputReady && appContainerReady;
    })()
  `).then(uiReady => {
    if (uiReady) {
      console.log('Interface détectée, injection du bouton de résolution');
      injectResolutionButton();
    } else {
      console.log('Interface pas encore prête, tentative ' + (attempts + 1) + '/3');
      // L'interface n'est pas encore prête, réessayons dans 300ms
      setTimeout(() => checkForUIReadyAndInjectButton(attempts + 1), 300);
    }
  }).catch(err => {
    console.error('Erreur lors de la vérification de l\'interface :', err);
    // En cas d'erreur, injecter le bouton directement
    injectResolutionButton();
  });
}

function injectResolutionButton() {
  // Vérification de sécurité
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('La fenêtre principale n\'existe plus, abandon de l\'injection du bouton');
    return;
  }
  
  // Récupérer la résolution actuelle pour marquer l'option active
  const currentWidth = mainWindow.getSize()[0];
  const currentHeight = mainWindow.getSize()[1];
  
  // Utiliser les positions codées en dur
  console.log('Position du bouton:', BUTTON_POSITION);
  console.log('Position du dropdown:', DROPDOWN_POSITION);

  const css = `
    #resolution-button {
      position: fixed;
      left: ${BUTTON_POSITION.left}px;
      bottom: ${BUTTON_POSITION.bottom}px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      border-radius: 4px;
      padding: 8px 12px;
      cursor: pointer;
      z-index: 9999;
      font-size: 14px;
      border: none;
    }
    #resolution-button:hover {
      background-color: rgba(0, 0, 0, 0.8);
    }
    .res-dropdown {
      position: fixed;
      left: ${DROPDOWN_POSITION.left}px;
      bottom: ${DROPDOWN_POSITION.bottom}px;
      background-color: #222;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: none;
      border: 1px solid #444;
    }
    .res-dropdown.active {
      display: block;
    }
    .res-option {
      padding: 8px 12px;
      cursor: pointer;
    }
    .res-option:hover {
      background-color: #333;
    }
    .res-option.active {
      background-color: #444;
      font-weight: bold;
    }
    .custom-option {
      border-top: 1px solid #444;
      color: #3668FF;
    }
    .res-info {
      color: #999;
      font-size: 12px;
      font-style: italic;
      text-align: center;
      padding: 8px 12px;
      border-top: 1px solid #444;
    }
  `;

  const js = `
    // Créer le bouton de résolution
    const button = document.createElement('button');
    button.id = 'resolution-button';
    button.innerText = 'Resolution';  // Texte fixe "Resolution" au lieu de la dimension
    document.body.appendChild(button);
    
    // Créer le dropdown de résolution
    const dropdown = document.createElement('div');
    dropdown.className = 'res-dropdown';
    document.body.appendChild(dropdown);
    
    // Ajouter l'information sur la résolution actuelle
    const resInfo = document.createElement('div');
    resInfo.className = 'res-info';
    resInfo.innerText = 'Current: ${currentWidth}x${currentHeight}';
    dropdown.appendChild(resInfo);
    
    // Ajouter les options de résolution
    const resolutions = [
      { width: 800, height: 600 },
      { width: 1024, height: 768 },
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 }
    ];
    
    resolutions.forEach(res => {
      const option = document.createElement('div');
      option.className = 'res-option';
      if (res.width === ${currentWidth} && res.height === ${currentHeight}) {
        option.className += ' active';
      }
      option.innerText = res.width + 'x' + res.height;
      option.setAttribute('data-width', res.width);
      option.setAttribute('data-height', res.height);
      dropdown.appendChild(option);
    });
    
    // Ajouter l'option de résolution personnalisée
    const customOption = document.createElement('div');
    customOption.className = 'res-option custom-option';
    customOption.innerText = '✨ Custom...';
    dropdown.appendChild(customOption);
    
    // Gestionnaire pour le bouton de résolution
    button.addEventListener('click', () => {
      dropdown.classList.toggle('active');
    });
    
    // Cliquer en dehors pour fermer le dropdown
    document.addEventListener('click', (event) => {
      if (event.target !== button && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
      }
    });
    
    // Gérer les options de résolution
    const options = dropdown.querySelectorAll('.res-option:not(.custom-option)');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const width = parseInt(option.getAttribute('data-width'));
        const height = parseInt(option.getAttribute('data-height'));
        
        // Appliquer la nouvelle résolution
        if (window.electron && window.electron.changeResolution) {
          window.electron.changeResolution(width, height);
          
          // Mettre à jour l'élément actif
          document.querySelectorAll('.res-option').forEach(opt => {
            opt.classList.remove('active');
          });
          option.classList.add('active');
          
          // Mettre à jour l'info sur la résolution actuelle
          resInfo.innerText = 'Current: ' + width + 'x' + height;
          
          // Fermer le dropdown
          dropdown.classList.remove('active');
        }
      });
    });
    
    // Gérer l'option personnalisée
    customOption.addEventListener('click', () => {
      // Fermer d'abord le dropdown
      dropdown.classList.remove('active');
      
      // Récupérer les dimensions actuelles pour valeur par défaut
      const currentSize = resInfo.innerText.replace('Current: ', '').split('x');
      const defaultWidth = parseInt(currentSize[0]) || 1280;
      const defaultHeight = parseInt(currentSize[1]) || 720;
      
      // Créer une boîte de dialogue modale personnalisée
      const modal = document.createElement('div');
      modal.className = 'custom-res-modal';
      modal.innerHTML = \`
        <div class="modal-content">
          <h3>Custom resolution</h3>
          <div class="input-group">
            <label for="custom-width">Width (px):</label>
            <input type="number" id="custom-width" min="640" max="3840" value="\${defaultWidth}">
          </div>
          <div class="input-group">
            <label for="custom-height">Height (px):</label>
            <input type="number" id="custom-height" min="480" max="2160" value="\${defaultHeight}">
          </div>
          <div class="modal-buttons">
            <button id="cancel-res">Cancel</button>
            <button id="apply-res">Apply</button>
          </div>
        </div>
      \`;
      document.body.appendChild(modal);
      
      // Ajouter le CSS pour la modale (comme avant)
      const modalStyle = document.createElement('style');
      modalStyle.textContent = \`
        .custom-res-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }
        .modal-content {
          background-color: #222;
          border-radius: 8px;
          padding: 20px;
          width: 300px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          border: 1px solid #444;
        }
        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 15px;
          text-align: center;
          color: #fff;
        }
        .input-group {
          margin-bottom: 15px;
          display: flex;
          flex-direction: column;
        }
        .input-group label {
          margin-bottom: 5px;
          font-weight: bold;
        }
        .input-group input {
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #555;
          background-color: #333;
          color: white;
          width: calc(100% - 18px);
        }
        .modal-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .modal-buttons button {
          padding: 8px 15px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          width: 48%;
        }
        #cancel-res {
          background-color: #444;
          color: white;
        }
        #apply-res {
          background-color: #3668FF;
          color: white;
        }
        #cancel-res:hover {
          background-color: #555;
        }
        #apply-res:hover {
          background-color: #4879FF;
        }
      \`;
      document.head.appendChild(modalStyle);
      
      // Focus sur le premier champ
      document.getElementById('custom-width').focus();
      
      // Gérer les actions modales
      document.getElementById('cancel-res').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      document.getElementById('apply-res').addEventListener('click', () => {
        const width = parseInt(document.getElementById('custom-width').value);
        const height = parseInt(document.getElementById('custom-height').value);
        
        // Validation simple
        if (width >= 640 && width <= 3840 && height >= 480 && height <= 2160) {
          // Appliquer la résolution personnalisée
          if (window.electron && window.electron.changeResolution) {
            window.electron.changeResolution(width, height);
            // Mise à jour de l'info de résolution actuelle
            resInfo.innerText = 'Current: ' + width + 'x' + height;
            // Décocher toutes les options prédéfinies
            document.querySelectorAll('.res-option').forEach(opt => {
              opt.classList.remove('active');
            });
            // Vérifier si la résolution correspond à une option prédéfinie
            resolutions.forEach(res => {
              if (res.width === width && res.height === height) {
                const matchingOption = dropdown.querySelector(\`.res-option[data-width="\${width}"][data-height="\${height}"]\`);
                if (matchingOption) {
                  matchingOption.classList.add('active');
                }
              }
            });
          }
          document.body.removeChild(modal);
        } else {
          alert('Invalid dimensions! The width must be between 640 and 3840 pixels, and the height between 480 and 2160 pixels.');
        }
      });
      
      // Fermer la modale en cliquant en dehors du contenu, mais pas lors de la sélection de texte
      let isMouseDown = false;
      let isDragging = false;

      modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) {
          isMouseDown = true;
          isDragging = false;
        }
      });

      modal.addEventListener('mousemove', () => {
        if (isMouseDown) {
          isDragging = true;
        }
      });

      modal.addEventListener('mouseup', (e) => {
        if (e.target === modal && isMouseDown && !isDragging) {
          document.body.removeChild(modal);
        }
        isMouseDown = false;
        isDragging = false;
      });

      // Pour gérer également le cas où l'utilisateur quitte la fenêtre pendant le glissement
      document.addEventListener('mouseup', () => {
        isMouseDown = false;
        isDragging = false;
      });
      
      // Permettre la soumission par la touche Entrée
      const inputs = modal.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            document.getElementById('apply-res').click();
          }
        });
      });
    });
  `;

  try {
    // Injecter le CSS et le JavaScript dans la page avec des vérifications de sécurité
    mainWindow.webContents.executeJavaScript(`
      (function() {
        // Supprimer les éléments existants s'ils existent
        const oldButton = document.getElementById('resolution-button');
        if (oldButton) oldButton.remove();
        const oldDropdown = document.querySelector('.res-dropdown');
        if (oldDropdown) oldDropdown.remove();
        const oldModal = document.querySelector('.custom-res-modal');
        if (oldModal) oldModal.remove();
        
        // Ajouter le CSS
        const style = document.createElement('style');
        style.textContent = \`${css}\`;
        document.head.appendChild(style);
        
        // Exécuter le JavaScript
        ${js}
      })();
    `).catch(err => console.error('Erreur lors de l\'injection du bouton de résolution:', err));
  } catch (error) {
    console.error('Erreur critique lors de l\'injection du bouton:', error);
  }
}

// Quand Electron a fini de s'initialiser
app.whenReady().then(() => {
  console.log('App prête, création de la fenêtre');
  createWindow();
  
  // Sur macOS, définir l'icône du dock
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'images', 'icon.png'));
  }
  
  // Écouter les demandes de changement de résolution
  ipcMain.on('change-resolution', (event, width, height) => {
    console.log('Demande de changement de résolution reçue:', width, height);
    
    // Vérification de sécurité
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('La fenêtre principale n\'existe plus, impossible de changer la résolution');
      return;
    }
    
    // Changer la taille de la fenêtre
    mainWindow.setSize(width, height);
    mainWindow.center(); // Centrer la fenêtre
    
    // Sauvegarder la nouvelle résolution préférée
    config.window.width = width;
    config.window.height = height;
    saveConfig(config);
    
    console.log('Résolution changée avec succès');
  });
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
