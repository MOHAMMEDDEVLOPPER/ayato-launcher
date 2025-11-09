const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { DataManager } = require('./src/js/utils/data-manager.js');

// Expose app path globally for renderer process
global.appPath = app.getAppPath();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0B0B0F',
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true, // Enable web security (Firebase CDN works with this)
      allowRunningInsecureContent: false // Disable insecure content
    }
  });

  mainWindow.loadFile('src/index.html');

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Log when page is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });
  
  // Log errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // تهيئة البيانات الافتراضية
  DataManager.initializeDefaultData();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC handlers for file dialogs
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Download Folder'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('select-file', async (event, options = {}) => {
  if (!mainWindow) return null;

  const dialogOptions = {
    properties: options.multiSelections ? ['openFile', 'multiSelections'] : ['openFile'],
    title: options.title || 'Select File',
    filters: options.filters || []
  };

  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

  if (result.canceled) {
    return null;
  }

  // Return array if multiSelections, single file otherwise
  if (options.multiSelections) {
    return result.filePaths;
  }

  return result.filePaths[0];
});

// Expose OS utilities to renderer
ipcMain.handle('get-os-info', () => {
  return {
    platform: os.platform(),
    homedir: os.homedir()
  };
});

// IPC handler for copying local files/folders
ipcMain.handle('copy-local-file', async (event, options) => {
  if (!mainWindow) return { success: false, error: 'Window not available' };

  const { sourcePath, destinationPath, gameName, downloadId } = options;
  const fs = require('fs');
  const path = require('path');

  try {
    // Ensure destination directory exists
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    const stats = fs.statSync(sourcePath);
    const isDirectory = stats.isDirectory();
    
    // Preserve file extension if it's a file
    let destination;
    if (isDirectory) {
      destination = path.join(destinationPath, gameName);
    } else {
      // Extract extension from source file
      const sourceExt = path.extname(sourcePath);
      const sourceName = path.basename(sourcePath, sourceExt);
      // Use game name but preserve original extension
      destination = path.join(destinationPath, gameName + sourceExt);
    }

    // Send progress update
    mainWindow.webContents.send('download-progress', {
      downloadId,
      progress: 0,
      downloaded: 0,
      total: stats.size || 0
    });

    if (isDirectory) {
      // Copy directory recursively
      await copyDirectory(sourcePath, destination);
    } else {
      // Copy single file
      fs.copyFileSync(sourcePath, destination);
    }

    // Send completion
    mainWindow.webContents.send('download-complete', {
      downloadId,
      filePath: destination,
      gameId: null // Will be set by download manager
    });

    return { success: true, filePath: destination };
  } catch (error) {
    console.error('Copy local file error:', error);
    mainWindow.webContents.send('download-error', {
      downloadId,
      error: error.message
    });
    return { success: false, error: error.message };
  }
});

// Helper function to copy directory recursively
async function copyDirectory(source, destination) {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// IPC handler for file downloads
ipcMain.handle('download-file', async (event, options) => {
  if (!mainWindow) return { success: false, error: 'Window not available' };

  const { url, path: downloadPath, filename, downloadId } = options;

  try {
    // Use Electron's session to download files
    const { session } = require('electron');
    const fs = require('fs');
    const https = require('https');
    const http = require('http');

    // Ensure download directory exists
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    const filePath = require('path').join(downloadPath, filename);

    // For now, we'll use a simple download approach
    // In production, you might want to use a more robust download library
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filePath);
          const totalSize = parseInt(response.headers['content-length'], 10);
          let downloadedSize = 0;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const progress = (downloadedSize / totalSize) * 100;
            
            // Send progress update to renderer
            mainWindow.webContents.send('download-progress', {
              downloadId,
              progress: Math.min(100, progress),
              downloaded: downloadedSize,
              total: totalSize
            });
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            mainWindow.webContents.send('download-complete', { 
              downloadId, 
              filePath,
              gameId: null // Will be set by download manager
            });
            resolve({ success: true, filePath });
          });

          fileStream.on('error', (err) => {
            fs.unlink(filePath, () => {});
            mainWindow.webContents.send('download-error', { downloadId, error: err.message });
            reject(err);
          });
        } else {
          const error = new Error(`Download failed with status ${response.statusCode}`);
          mainWindow.webContents.send('download-error', { downloadId, error: error.message });
          reject(error);
        }
      }).on('error', (err) => {
        mainWindow.webContents.send('download-error', { downloadId, error: err.message });
        reject(err);
      });
    });
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
});

// IPC handlers for DataManager
ipcMain.handle('data-get-users', () => {
  return DataManager.getUsers();
});

ipcMain.handle('data-save-users', (event, users) => {
  return DataManager.saveUsers(users);
});

ipcMain.handle('data-add-user', (event, user) => {
  return DataManager.addUser(user);
});

ipcMain.handle('data-update-user', (event, userId, updates) => {
  return DataManager.updateUser(userId, updates);
});

ipcMain.handle('data-delete-user', (event, userId) => {
  return DataManager.deleteUser(userId);
});

ipcMain.handle('data-get-user-by-id', (event, userId) => {
  return DataManager.getUserById(userId);
});

ipcMain.handle('data-get-user-by-username', (event, username) => {
  return DataManager.getUserByUsername(username);
});

ipcMain.handle('data-get-user-by-email', (event, email) => {
  return DataManager.getUserByEmail(email);
});

ipcMain.handle('data-get-games', () => {
  return DataManager.getGames();
});

ipcMain.handle('data-save-games', (event, games) => {
  return DataManager.saveGames(games);
});

ipcMain.handle('data-add-game', (event, game) => {
  return DataManager.addGame(game);
});

ipcMain.handle('data-update-game', (event, gameId, updates) => {
  return DataManager.updateGame(gameId, updates);
});

ipcMain.handle('data-delete-game', (event, gameId) => {
  return DataManager.deleteGame(gameId);
});

ipcMain.handle('data-get-game-by-id', (event, gameId) => {
  return DataManager.getGameById(gameId);
});

ipcMain.handle('data-get-activation-codes', () => {
  return DataManager.getActivationCodes();
});

ipcMain.handle('data-save-activation-codes', (event, codes) => {
  return DataManager.saveActivationCodes(codes);
});

ipcMain.handle('data-add-activation-code', (event, code) => {
  return DataManager.addActivationCode(code);
});

ipcMain.handle('data-delete-activation-code', (event, codeValue) => {
  return DataManager.deleteActivationCode(codeValue);
});

ipcMain.handle('data-get-announcements', () => {
  return DataManager.getAnnouncements();
});

ipcMain.handle('data-save-announcements', (event, announcements) => {
  return DataManager.saveAnnouncements(announcements);
});

ipcMain.handle('data-get-updates', () => {
  return DataManager.getUpdates();
});

ipcMain.handle('data-save-updates', (event, updates) => {
  return DataManager.saveUpdates(updates);
});

ipcMain.handle('data-add-update', (event, update) => {
  return DataManager.addUpdate(update);
});

ipcMain.handle('data-delete-update', (event, updateId) => {
  return DataManager.deleteUpdate(updateId);
});

ipcMain.handle('data-get-servers', () => {
  return DataManager.getServers();
});

ipcMain.handle('data-save-servers', (event, servers) => {
  return DataManager.saveServers(servers);
});

ipcMain.handle('data-get-gift-codes', () => {
  return DataManager.getGiftCodes();
});

ipcMain.handle('data-save-gift-codes', (event, codes) => {
  return DataManager.saveGiftCodes(codes);
});

ipcMain.handle('data-add-gift-code', (event, code) => {
  return DataManager.addGiftCode(code);
});

ipcMain.handle('data-delete-gift-code', (event, codeValue) => {
  return DataManager.deleteGiftCode(codeValue);
});

ipcMain.handle('data-get-favorites', () => {
  return DataManager.getFavorites();
});

ipcMain.handle('data-save-favorites', (event, favorites) => {
  return DataManager.saveFavorites(favorites);
});

ipcMain.handle('data-get-settings', () => {
  return DataManager.getSettings();
});

ipcMain.handle('data-save-settings', (event, settings) => {
  return DataManager.saveSettings(settings);
});

