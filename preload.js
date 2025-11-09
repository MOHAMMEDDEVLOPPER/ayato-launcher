// Preload script to expose Electron APIs to renderer
// Note: Since contextIsolation is disabled, we can directly expose to window
const { ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

// Expose Electron APIs directly to window (since contextIsolation is disabled)
if (typeof window !== 'undefined') {
  window.electron = {
    ipcRenderer: {
      invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
      on: (channel, func) => {
        const validChannels = ['download-progress', 'download-complete', 'download-error'];
        if (validChannels.includes(channel)) {
          ipcRenderer.on(channel, (event, data) => func(data));
        }
      },
      removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
      }
    },
    os: {
      platform: () => os.platform(),
      homedir: () => os.homedir()
    }
  };

  // Expose DataManager API
  window.dataManager = {
    // Users
    getUsers: () => ipcRenderer.invoke('data-get-users'),
    saveUsers: (users) => ipcRenderer.invoke('data-save-users', users),
    addUser: (user) => ipcRenderer.invoke('data-add-user', user),
    updateUser: (userId, updates) => ipcRenderer.invoke('data-update-user', userId, updates),
    deleteUser: (userId) => ipcRenderer.invoke('data-delete-user', userId),
    getUserById: (userId) => ipcRenderer.invoke('data-get-user-by-id', userId),
    getUserByUsername: (username) => ipcRenderer.invoke('data-get-user-by-username', username),
    getUserByEmail: (email) => ipcRenderer.invoke('data-get-user-by-email', email),

    // Games
    getGames: () => ipcRenderer.invoke('data-get-games'),
    saveGames: (games) => ipcRenderer.invoke('data-save-games', games),
    addGame: (game) => ipcRenderer.invoke('data-add-game', game),
    updateGame: (gameId, updates) => ipcRenderer.invoke('data-update-game', gameId, updates),
    deleteGame: (gameId) => ipcRenderer.invoke('data-delete-game', gameId),
    getGameById: (gameId) => ipcRenderer.invoke('data-get-game-by-id', gameId),

    // Activation Codes
    getActivationCodes: () => ipcRenderer.invoke('data-get-activation-codes'),
    saveActivationCodes: (codes) => ipcRenderer.invoke('data-save-activation-codes', codes),
    addActivationCode: (code) => ipcRenderer.invoke('data-add-activation-code', code),
    deleteActivationCode: (codeValue) => ipcRenderer.invoke('data-delete-activation-code', codeValue),

    // Announcements
    getAnnouncements: () => ipcRenderer.invoke('data-get-announcements'),
    saveAnnouncements: (announcements) => ipcRenderer.invoke('data-save-announcements', announcements),

    // Updates
    getUpdates: () => ipcRenderer.invoke('data-get-updates'),
    saveUpdates: (updates) => ipcRenderer.invoke('data-save-updates', updates),
    addUpdate: (update) => ipcRenderer.invoke('data-add-update', update),
    deleteUpdate: (updateId) => ipcRenderer.invoke('data-delete-update', updateId),

    // Servers
    getServers: () => ipcRenderer.invoke('data-get-servers'),
    saveServers: (servers) => ipcRenderer.invoke('data-save-servers', servers),

    // Gift Codes
    getGiftCodes: () => ipcRenderer.invoke('data-get-gift-codes'),
    saveGiftCodes: (codes) => ipcRenderer.invoke('data-save-gift-codes', codes),
    addGiftCode: (code) => ipcRenderer.invoke('data-add-gift-code', code),
    deleteGiftCode: (codeValue) => ipcRenderer.invoke('data-delete-gift-code', codeValue),

    // Favorites
    getFavorites: () => ipcRenderer.invoke('data-get-favorites'),
    saveFavorites: (favorites) => ipcRenderer.invoke('data-save-favorites', favorites),

    // Settings
    getSettings: () => ipcRenderer.invoke('data-get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('data-save-settings', settings)
  };
}

