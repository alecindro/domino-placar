const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 750,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Carrega o build de produção do Angular
  win.loadFile(path.join(__dirname, 'dist/domino-placar/browser/index.html'));
}

app.whenReady().then(createWindow);
