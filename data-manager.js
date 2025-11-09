// مدير البيانات - واجهة سهلة للتعامل مع التخزين المشفر
// يعمل في Node.js Server
const { EncryptedStorage } = require('./encrypted-storage.js');

class DataManager {
  // المستخدمين
  static getUsers() {
    return EncryptedStorage.load('users') || [];
  }

  static saveUsers(users) {
    return EncryptedStorage.save('users', users);
  }

  static addUser(user) {
    const users = this.getUsers();
    users.push(user);
    return this.saveUsers(users);
  }

  static updateUser(userId, updates) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      return this.saveUsers(users);
    }
    return false;
  }

  static deleteUser(userId) {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== userId);
    return this.saveUsers(filtered);
  }

  static getUserById(userId) {
    const users = this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  static getUserByUsername(username) {
    const users = this.getUsers();
    return users.find(u => u.username === username) || null;
  }

  static getUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => u.email === email.toLowerCase()) || null;
  }

  // الألعاب
  static getGames() {
    return EncryptedStorage.load('games') || [];
  }

  static saveGames(games) {
    return EncryptedStorage.save('games', games);
  }

  static addGame(game) {
    const games = this.getGames();
    games.push(game);
    return this.saveGames(games);
  }

  static updateGame(gameId, updates) {
    const games = this.getGames();
    const index = games.findIndex(g => g.id === gameId);
    if (index !== -1) {
      games[index] = { ...games[index], ...updates };
      return this.saveGames(games);
    }
    return false;
  }

  static deleteGame(gameId) {
    const games = this.getGames();
    const filtered = games.filter(g => g.id !== gameId);
    return this.saveGames(filtered);
  }

  static getGameById(gameId) {
    const games = this.getGames();
    return games.find(g => g.id === gameId) || null;
  }

  // أكواد التفعيل
  static getActivationCodes() {
    return EncryptedStorage.load('activation_codes') || [];
  }

  static saveActivationCodes(codes) {
    return EncryptedStorage.save('activation_codes', codes);
  }

  static addActivationCode(code) {
    const codes = this.getActivationCodes();
    codes.push(code);
    return this.saveActivationCodes(codes);
  }

  static deleteActivationCode(codeValue) {
    const codes = this.getActivationCodes();
    const filtered = codes.filter(c => c.code !== codeValue);
    return this.saveActivationCodes(filtered);
  }

  static getActivationCodeByCode(codeValue) {
    const codes = this.getActivationCodes();
    return codes.find(c => c.code === codeValue) || null;
  }

  // الإعلانات
  static getAnnouncements() {
    return EncryptedStorage.load('announcements') || [];
  }

  static saveAnnouncements(announcements) {
    return EncryptedStorage.save('announcements', announcements);
  }

  // التحديثات
  static getUpdates() {
    return EncryptedStorage.load('updates') || [];
  }

  static saveUpdates(updates) {
    return EncryptedStorage.save('updates', updates);
  }

  static addUpdate(update) {
    const updates = this.getUpdates();
    updates.push(update);
    return this.saveUpdates(updates);
  }

  static deleteUpdate(updateId) {
    const updates = this.getUpdates();
    const filtered = updates.filter(u => u.id !== updateId);
    return this.saveUpdates(filtered);
  }

  // السيرفرات
  static getServers() {
    return EncryptedStorage.load('servers') || [];
  }

  static saveServers(servers) {
    return EncryptedStorage.save('servers', servers);
  }

  // Gift Codes
  static getGiftCodes() {
    return EncryptedStorage.load('gift_codes') || [];
  }

  static saveGiftCodes(codes) {
    return EncryptedStorage.save('gift_codes', codes);
  }

  static addGiftCode(code) {
    const codes = this.getGiftCodes();
    codes.push(code);
    return this.saveGiftCodes(codes);
  }

  static deleteGiftCode(codeValue) {
    const codes = this.getGiftCodes();
    const filtered = codes.filter(c => c.code !== codeValue);
    return this.saveGiftCodes(filtered);
  }

  static getGiftCodeByCode(codeValue) {
    const codes = this.getGiftCodes();
    return codes.find(c => c.code === codeValue) || null;
  }

  // Favorites
  static getFavorites() {
    return EncryptedStorage.load('favorites') || [];
  }

  static saveFavorites(favorites) {
    return EncryptedStorage.save('favorites', favorites);
  }

  // Settings
  static getSettings() {
    return EncryptedStorage.load('settings') || {};
  }

  static saveSettings(settings) {
    return EncryptedStorage.save('settings', settings);
  }

  // تهيئة البيانات الافتراضية
  static initializeDefaultData() {
    try {
      // المستخدمين
      if (!this.getUsers().length) {
        try {
          this.saveUsers([
            {
              id: 'AYT-PKJK7IIK',
              username: 'AYATO',
              email: 'admin@ayato.com',
              password: '', // سيتم تعيينه عند تسجيل الدخول
              activationCode: 'AYATO-CODE:123456789012',
              isActivated: true,
              isVerified: true,
              isAdmin: true,
              coins: 0,
              activeServer: null,
              twoFactorEnabled: false,
              twoFactorSecret: null,
              createdAt: Date.now()
            }
          ]);
          console.log('👤 Default users saved');
        } catch (e) {
          console.error('❌ Users init failed:', e.message);
        }
      }

      // أكواد التفعيل
      if (!this.getActivationCodes().length) {
        try {
          this.saveActivationCodes([
            {
              code: 'AYATO-CODE:123456789012',
              type: 'PUB',
              linkedUserId: null,
              expiryDate: null,
              isValid: true
            },
            {
              code: 'AYATO-CODE:PRIV78901234',
              type: 'PRIVATE',
              linkedUserId: null,
              expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
              isValid: true
            }
          ]);
          console.log('🔑 Default activation codes saved');
        } catch (e) {
          console.error('❌ Activation codes init failed:', e.message);
        }
      }

      // الإعلانات
      if (!this.getAnnouncements().length) {
        try {
          this.saveAnnouncements([
            {
              id: 'announcement-1',
              title: 'Welcome to AYATO LAUNCHER',
              description: 'Thank you for using AYATO LAUNCHER!',
              timestamp: Date.now(),
              type: 'news',
              author: 'AYATO Team'
            }
          ]);
          console.log('📢 Default announcements saved');
        } catch (e) {
          console.error('❌ Announcements init failed:', e.message);
        }
      }

      console.log('✅ Default data initialized');
      console.log('📦 Default data initialized successfully');
    } catch (error) {
      console.error('❌ initializeDefaultData error:', error.message);
      console.error('❌ initializeDefaultData stack:', error.stack);
    }
  }
}

module.exports = { DataManager };

