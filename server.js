// Express API Server for AYATO LAUNCHER
const express = require('express');
const cors = require('cors');
const { DataManager } = require('./storage/data-manager.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize default data (async to prevent blocking)
setTimeout(() => {
  try {
    DataManager.initializeDefaultData();
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}, 1000);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'AYATO LAUNCHER API is running' });
});

// ==================== GAMES ENDPOINTS ====================

// GET /api/games - Get all games
app.get('/api/games', (req, res) => {
  try {
    const games = DataManager.getGames();
    res.json({ success: true, data: games });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/games/:id - Get game by ID
app.get('/api/games/:id', (req, res) => {
  try {
    const game = DataManager.getGameById(req.params.id);
    if (game) {
      res.json({ success: true, data: game });
    } else {
      res.status(404).json({ success: false, error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/games - Create new game
app.post('/api/games', (req, res) => {
  try {
    const game = req.body;
    if (!game.id || !game.title) {
      return res.status(400).json({ success: false, error: 'Game ID and title are required' });
    }
    const result = DataManager.addGame(game);
    if (result) {
      res.status(201).json({ success: true, data: game });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create game' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/games/:id - Update game
app.put('/api/games/:id', (req, res) => {
  try {
    const updates = req.body;
    const result = DataManager.updateGame(req.params.id, updates);
    if (result) {
      const updatedGame = DataManager.getGameById(req.params.id);
      res.json({ success: true, data: updatedGame });
    } else {
      res.status(404).json({ success: false, error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/games/:id - Delete game
app.delete('/api/games/:id', (req, res) => {
  try {
    const result = DataManager.deleteGame(req.params.id);
    if (result) {
      res.json({ success: true, message: 'Game deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ACTIVATION CODES ENDPOINTS ====================

// GET /api/activation-codes - Get all activation codes
app.get('/api/activation-codes', (req, res) => {
  try {
    const codes = DataManager.getActivationCodes();
    res.json({ success: true, data: codes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/activation-codes/:code - Get activation code by code value
app.get('/api/activation-codes/:code', (req, res) => {
  try {
    const code = DataManager.getActivationCodeByCode(req.params.code);
    if (code) {
      res.json({ success: true, data: code });
    } else {
      res.status(404).json({ success: false, error: 'Activation code not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/activation-codes - Create new activation code
app.post('/api/activation-codes', (req, res) => {
  try {
    const code = req.body;
    if (!code.code) {
      return res.status(400).json({ success: false, error: 'Code value is required' });
    }
    const result = DataManager.addActivationCode(code);
    if (result) {
      res.status(201).json({ success: true, data: code });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create activation code' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/activation-codes/:code - Delete activation code
app.delete('/api/activation-codes/:code', (req, res) => {
  try {
    const result = DataManager.deleteActivationCode(req.params.code);
    if (result) {
      res.json({ success: true, message: 'Activation code deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Activation code not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== UPDATES ENDPOINTS ====================

// GET /api/updates - Get all updates
app.get('/api/updates', (req, res) => {
  try {
    const updates = DataManager.getUpdates();
    res.json({ success: true, data: updates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/updates - Create new update
app.post('/api/updates', (req, res) => {
  try {
    const update = req.body;
    if (!update.id || !update.title) {
      return res.status(400).json({ success: false, error: 'Update ID and title are required' });
    }
    const result = DataManager.addUpdate(update);
    if (result) {
      res.status(201).json({ success: true, data: update });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create update' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/updates/:id - Delete update
app.delete('/api/updates/:id', (req, res) => {
  try {
    const result = DataManager.deleteUpdate(req.params.id);
    if (result) {
      res.json({ success: true, message: 'Update deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Update not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USERS ENDPOINTS ====================

// GET /api/users - Get all users
app.get('/api/users', (req, res) => {
  try {
    const users = DataManager.getUsers();
    // Remove sensitive data before sending
    const safeUsers = users.map(user => {
      const { password, twoFactorSecret, ...safeUser } = user;
      return safeUser;
    });
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id - Get user by ID
app.get('/api/users/:id', (req, res) => {
  try {
    const user = DataManager.getUserById(req.params.id);
    if (user) {
      const { password, twoFactorSecret, ...safeUser } = user;
      res.json({ success: true, data: safeUser });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users - Create new user
app.post('/api/users', (req, res) => {
  try {
    const user = req.body;
    if (!user.id || !user.username || !user.email) {
      return res.status(400).json({ success: false, error: 'User ID, username, and email are required' });
    }
    const result = DataManager.addUser(user);
    if (result) {
      const { password, twoFactorSecret, ...safeUser } = user;
      res.status(201).json({ success: true, data: safeUser });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/:id - Update user
app.put('/api/users/:id', (req, res) => {
  try {
    const updates = req.body;
    // Prevent updating sensitive fields directly
    delete updates.password;
    delete updates.twoFactorSecret;
    const result = DataManager.updateUser(req.params.id, updates);
    if (result) {
      const updatedUser = DataManager.getUserById(req.params.id);
      const { password, twoFactorSecret, ...safeUser } = updatedUser;
      res.json({ success: true, data: safeUser });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/:id - Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const result = DataManager.deleteUser(req.params.id);
    if (result) {
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GIFT CODES ENDPOINTS ====================

// GET /api/gift-codes - Get all gift codes
app.get('/api/gift-codes', (req, res) => {
  try {
    const codes = DataManager.getGiftCodes();
    res.json({ success: true, data: codes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gift-codes/:code - Get gift code by code value
app.get('/api/gift-codes/:code', (req, res) => {
  try {
    const code = DataManager.getGiftCodeByCode(req.params.code);
    if (code) {
      res.json({ success: true, data: code });
    } else {
      res.status(404).json({ success: false, error: 'Gift code not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gift-codes - Create new gift code
app.post('/api/gift-codes', (req, res) => {
  try {
    const code = req.body;
    if (!code.code) {
      return res.status(400).json({ success: false, error: 'Code value is required' });
    }
    const result = DataManager.addGiftCode(code);
    if (result) {
      res.status(201).json({ success: true, data: code });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create gift code' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/gift-codes/:code - Delete gift code
app.delete('/api/gift-codes/:code', (req, res) => {
  try {
    const result = DataManager.deleteGiftCode(req.params.code);
    if (result) {
      res.json({ success: true, message: 'Gift code deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Gift code not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SERVERS ENDPOINTS ====================

// GET /api/servers - Get all servers
app.get('/api/servers', (req, res) => {
  try {
    const servers = DataManager.getServers();
    res.json({ success: true, data: servers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANNOUNCEMENTS ENDPOINTS ====================

// GET /api/announcements - Get all announcements
app.get('/api/announcements', (req, res) => {
  try {
    const announcements = DataManager.getAnnouncements();
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/announcements - Create new announcement
app.post('/api/announcements', (req, res) => {
  try {
    const announcements = DataManager.getAnnouncements();
    const announcement = req.body;
    if (!announcement.id || !announcement.title) {
      return res.status(400).json({ success: false, error: 'Announcement ID and title are required' });
    }
    announcements.push(announcement);
    const result = DataManager.saveAnnouncements(announcements);
    if (result) {
      res.status(201).json({ success: true, data: announcement });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create announcement' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AYATO LAUNCHER API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API endpoints: http://localhost:${PORT}/api/*`);
});

