// Game management utility module
import { ApiClient } from './api-client.js';
import { DataStorage } from './data-storage-wrapper.js';

export class GameManager {
  /**
   * Get all games
   * @returns {Promise<Array>} Array of game objects
   */
  static async getAllGames() {
    try {
      return await ApiClient.getGames();
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      return await DataStorage.getGames();
    }
  }

  /**
   * Get game by ID
   * @param {string} gameId - Game ID
   * @returns {Promise<Object|null>} Game object or null
   */
  static async getGameById(gameId) {
    try {
      return await ApiClient.getGameById(gameId);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      return await DataStorage.getGameById(gameId);
    }
  }

  /**
   * Add a new game
   * @param {Object} gameData - Game data object
   * @returns {Promise<Object>} Created game object
   */
  static async addGame(gameData) {
    const game = {
      id: gameData.id || `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: gameData.name,
      description: gameData.description || '',
      fullDescription: gameData.fullDescription || gameData.description || '',
      image: gameData.image || '',
      size: gameData.size || 0, // in MB
      downloadUrl: gameData.downloadUrl || '',
      isLocalFile: gameData.isLocalFile || false, // Flag for local files
      requirements: gameData.requirements || {
        os: 'Windows 10+',
        ram: '8GB',
        storage: '50GB',
        graphics: 'DirectX 11'
      },
      screenshots: gameData.screenshots || [],
      publisher: gameData.publisher || 'Unknown',
      releaseDate: gameData.releaseDate || Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await ApiClient.addGame(game);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      await DataStorage.addGame(game);
    }
    return game;
  }

  /**
   * Update an existing game
   * @param {string} gameId - Game ID
   * @param {Object} updates - Game data updates
   * @returns {Promise<Object|null>} Updated game object or null
   */
  static async updateGame(gameId, updates) {
    try {
      const result = await ApiClient.updateGame(gameId, updates);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      const result = await DataStorage.updateGame(gameId, updates);
      if (result) {
        return await DataStorage.getGameById(gameId);
      }
    }
    return null;
  }

  /**
   * Delete a game
   * @param {string} gameId - Game ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async deleteGame(gameId) {
    try {
      return await ApiClient.deleteGame(gameId);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      return await DataStorage.deleteGame(gameId);
    }
  }

  /**
   * Format size from MB to readable string
   * @param {number} sizeInMB - Size in megabytes
   * @returns {string} Formatted size string
   */
  static formatSize(sizeInMB) {
    if (sizeInMB < 1024) {
      return `${sizeInMB} MB`;
    } else {
      const sizeInGB = (sizeInMB / 1024).toFixed(2);
      return `${sizeInGB} GB`;
    }
  }

  /**
   * Initialize default games for testing
   * Note: Default games are no longer added automatically
   */
  static async initDefaultGames() {
    // No default games - admin must add games manually
    return;
  }

  /**
   * Delete default games (Epic Adventure, Space Explorer, Racing Legends)
   * This function removes the default games from the database
   */
  static async deleteDefaultGames() {
    const defaultGameIds = ['game-1', 'game-2', 'game-3'];
    const games = await this.getAllGames();
    
    for (const gameId of defaultGameIds) {
      const game = games.find(g => g.id === gameId);
      if (game) {
        await this.deleteGame(gameId);
        console.log(`Deleted default game: ${game.name} (${gameId})`);
      }
    }
    
    console.log('✅ Default games deletion completed');
  }
}

