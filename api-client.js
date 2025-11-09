// API Client for Railway API
// Falls back to local storage if API is unavailable

// API Base URL - Update this with your Railway URL
// يجب أن يبدأ بـ https:// أو http://
function getApiBaseUrl() {
  // محاولة الحصول من localStorage أولاً (للتحديث السريع)
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl && (storedUrl.startsWith('http://') || storedUrl.startsWith('https://'))) {
    return storedUrl;
  }
  
  // ثم من environment variable
  const envUrl = process.env.API_BASE_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl;
  }
  
  // Default - يجب تحديثه بـ URL الخاص بك من Railway
  // مثال: 'https://ayato-launcher.up.railway.app'
  return 'https://ayato-launcher-production.up.railway.app';
}

const API_BASE_URL = getApiBaseUrl();

// Check if API is available
async function checkApiAvailability() {
  // إذا كان URL غير صحيح، لا تحاول الاتصال
  if (!API_BASE_URL || (!API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://'))) {
    console.warn('API_BASE_URL is not a valid URL. Please update it in api-client.js or localStorage (api_base_url)');
    return false;
  }
  
  // إذا كان URL هو الافتراضي، لا تحاول الاتصال
  if (API_BASE_URL === 'https://your-app.up.railway.app') {
    console.info('API_BASE_URL is set to default. Using local storage. Update it to connect to Railway.');
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('API health check timeout. Using local storage.');
    } else {
      console.warn('API not available, using local storage:', error.message);
    }
    return false;
  }
}

// Make API request with error handling
async function apiRequest(endpoint, options = {}) {
  // التحقق من صحة URL
  if (!API_BASE_URL || (!API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://'))) {
    throw new Error('Invalid API_BASE_URL. Must start with http:// or https://');
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for requests
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API request timeout');
    }
    console.error('API request error:', error.message);
    throw error;
  }
}

// Import DataStorage for fallback (lazy import)
async function getDataStorage() {
  try {
    const module = await import('./data-storage-wrapper.js');
    return module.DataStorage;
  } catch (e) {
    console.warn('DataStorage not available for fallback');
    return null;
  }
}

export class ApiClient {
  // Check if we should use API or local storage
  static async useApi() {
    // Check localStorage preference
    const useApi = localStorage.getItem('use_api') !== 'false';
    if (!useApi) return false;
    
    // Check API availability
    return await checkApiAvailability();
  }

  // Users
  static async getUsers() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/users');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    // Fallback to local storage
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getUsers();
    }
    return [];
  }

  static async saveUsers(users) {
    try {
      if (await this.useApi()) {
        // API doesn't have saveUsers, update each user individually
        // For now, fallback to local
        const DataStorage = await getDataStorage();
        if (DataStorage) {
          return await DataStorage.saveUsers(users);
        }
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.saveUsers(users);
    }
    return false;
  }

  static async addUser(user) {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/users', {
          method: 'POST',
          body: JSON.stringify(user)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.addUser(user);
    }
    return false;
  }

  static async updateUser(userId, updates) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.updateUser(userId, updates);
    }
    return false;
  }

  static async deleteUser(userId) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/users/${userId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.deleteUser(userId);
    }
    return false;
  }

  static async getUserById(userId) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/users/${userId}`);
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getUserById(userId);
    }
    return null;
  }

  static async getUserByUsername(username) {
    try {
      if (await this.useApi()) {
        const users = await this.getUsers();
        return users.find(u => u.username === username) || null;
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getUserByUsername(username);
    }
    return null;
  }

  static async getUserByEmail(email) {
    try {
      if (await this.useApi()) {
        const users = await this.getUsers();
        return users.find(u => u.email === email.toLowerCase()) || null;
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getUserByEmail(email);
    }
    return null;
  }

  // Games
  static async getGames() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/games');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getGames();
    }
    return [];
  }

  static async saveGames(games) {
    try {
      if (await this.useApi()) {
        // API doesn't have saveGames, fallback to local
        const DataStorage = await getDataStorage(); if (DataStorage) {
          return await DataStorage && DataStorage.saveGames(games);
        }
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.saveGames(games);
    }
    return false;
  }

  static async addGame(game) {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/games', {
          method: 'POST',
          body: JSON.stringify(game)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.addGame(game);
    }
    return false;
  }

  static async updateGame(gameId, updates) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/games/${gameId}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.updateGame(gameId, updates);
    }
    return false;
  }

  static async deleteGame(gameId) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/games/${gameId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.deleteGame(gameId);
    }
    return false;
  }

  static async getGameById(gameId) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/games/${gameId}`);
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getGameById(gameId);
    }
    return null;
  }

  // Activation Codes
  static async getActivationCodes() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/activation-codes');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getActivationCodes();
    }
    return [];
  }

  static async saveActivationCodes(codes) {
    try {
      if (await this.useApi()) {
        // API doesn't have saveActivationCodes, fallback to local
        const DataStorage = await getDataStorage(); if (DataStorage) {
          return await DataStorage && DataStorage.saveActivationCodes(codes);
        }
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.saveActivationCodes(codes);
    }
    return false;
  }

  static async addActivationCode(code) {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/activation-codes', {
          method: 'POST',
          body: JSON.stringify(code)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.addActivationCode(code);
    }
    return false;
  }

  static async deleteActivationCode(codeValue) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/activation-codes/${encodeURIComponent(codeValue)}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.deleteActivationCode(codeValue);
    }
    return false;
  }

  static async getActivationCodeByCode(codeValue) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/activation-codes/${encodeURIComponent(codeValue)}`);
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getActivationCodeByCode(codeValue);
    }
    return null;
  }

  // Updates
  static async getUpdates() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/updates');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getUpdates();
    }
    return [];
  }

  static async saveUpdates(updates) {
    try {
      if (await this.useApi()) {
        // API doesn't have saveUpdates, fallback to local
        const DataStorage = await getDataStorage(); if (DataStorage) {
          return await DataStorage && DataStorage.saveUpdates(updates);
        }
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.saveUpdates(updates);
    }
    return false;
  }

  static async addUpdate(update) {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/updates', {
          method: 'POST',
          body: JSON.stringify(update)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.addUpdate(update);
    }
    return false;
  }

  static async deleteUpdate(updateId) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/updates/${updateId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.deleteUpdate(updateId);
    }
    return false;
  }

  // Gift Codes
  static async getGiftCodes() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/gift-codes');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getGiftCodes();
    }
    return [];
  }

  static async saveGiftCodes(codes) {
    try {
      if (await this.useApi()) {
        // API doesn't have saveGiftCodes, fallback to local
        const DataStorage = await getDataStorage(); if (DataStorage) {
          return await DataStorage && DataStorage.saveGiftCodes(codes);
        }
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.saveGiftCodes(codes);
    }
    return false;
  }

  static async addGiftCode(code) {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/gift-codes', {
          method: 'POST',
          body: JSON.stringify(code)
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.addGiftCode(code);
    }
    return false;
  }

  static async deleteGiftCode(codeValue) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/gift-codes/${encodeURIComponent(codeValue)}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.deleteGiftCode(codeValue);
    }
    return false;
  }

  static async getGiftCodeByCode(codeValue) {
    try {
      if (await this.useApi()) {
        return await apiRequest(`/api/gift-codes/${encodeURIComponent(codeValue)}`);
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getGiftCodeByCode(codeValue);
    }
    return null;
  }

  // Servers
  static async getServers() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/servers');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getServers();
    }
    return [];
  }

  // Announcements
  static async getAnnouncements() {
    try {
      if (await this.useApi()) {
        return await apiRequest('/api/announcements');
      }
    } catch (error) {
      console.warn('API failed, using local storage');
    }
    
    const DataStorage = await getDataStorage();
    if (DataStorage) {
      return await DataStorage.getAnnouncements();
    }
    return [];
  }
}

