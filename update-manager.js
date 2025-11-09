// Update management utility module
import { StorageManager, STORAGE_KEYS } from './storage.js';
import { ApiClient } from './api-client.js';
import { DataStorage } from './data-storage-wrapper.js';

export class UpdateManager {
  /**
   * Get all updates
   * @returns {Promise<Array>} Array of update objects
   */
  static async getAllUpdates() {
    try {
      return await ApiClient.getUpdates();
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      const updates = await DataStorage.getUpdates();
      return Array.isArray(updates) ? updates : [];
    }
  }

  /**
   * Get update by ID
   * @param {string} updateId - Update ID
   * @returns {Promise<Object|null>} Update object or null
   */
  static async getUpdateById(updateId) {
    try {
      const updates = await ApiClient.getUpdates();
      return updates.find(u => u.id === updateId) || null;
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      const updates = await DataStorage.getUpdates();
      return updates.find(u => u.id === updateId) || null;
    }
  }

  /**
   * Get latest update
   * @returns {Promise<Object|null>} Latest update object or null
   */
  static async getLatestUpdate() {
    const updates = await this.getAllUpdates();
    if (updates.length === 0) return null;
    
    // Sort by release date (newest first)
    const sorted = [...updates].sort((a, b) => b.releaseDate - a.releaseDate);
    return sorted[0];
  }

  /**
   * Add a new update
   * @param {Object} updateData - Update data object
   * @returns {Promise<Object>} Created update object
   */
  static async addUpdate(updateData) {
    const update = {
      id: updateData.id || `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: updateData.name,
      description: updateData.description || '',
      version: updateData.version || '1.0.0',
      size: updateData.size || 0, // in MB
      releaseDate: updateData.releaseDate || Date.now(),
      isRequired: updateData.isRequired !== undefined ? updateData.isRequired : true,
      downloadUrl: updateData.downloadUrl || '',
      createdAt: Date.now()
    };

    try {
      await ApiClient.addUpdate(update);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      await DataStorage.addUpdate(update);
    }
    return update;
  }

  /**
   * Delete an update
   * @param {string} updateId - Update ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async deleteUpdate(updateId) {
    try {
      return await ApiClient.deleteUpdate(updateId);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      return await DataStorage.deleteUpdate(updateId);
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
   * Check if user has seen this update
   * @param {string} updateId - Update ID
   * @param {string} userId - User ID
   * @returns {boolean} True if user has seen the update
   */
  static hasUserSeenUpdate(updateId, userId) {
    const seenUpdates = StorageManager.getItem('ayato_seen_updates') || {};
    const userSeen = seenUpdates[userId] || [];
    return userSeen.includes(updateId);
  }

  /**
   * Mark update as seen by user
   * @param {string} updateId - Update ID
   * @param {string} userId - User ID
   */
  static markUpdateAsSeen(updateId, userId) {
    const seenUpdates = StorageManager.getItem('ayato_seen_updates') || {};
    if (!seenUpdates[userId]) {
      seenUpdates[userId] = [];
    }
    if (!seenUpdates[userId].includes(updateId)) {
      seenUpdates[userId].push(updateId);
      StorageManager.setItem('ayato_seen_updates', seenUpdates);
    }
  }

  /**
   * Get unseen updates for user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of unseen update objects
   */
  static async getUnseenUpdates(userId) {
    const updates = await this.getAllUpdates();
    if (!Array.isArray(updates)) {
      return [];
    }
    return updates.filter(update => !this.hasUserSeenUpdate(update.id, userId));
  }

  /**
   * Initialize default updates for testing
   */
  static async initDefaultUpdates() {
    const updates = await this.getAllUpdates();
    if (updates.length > 0) {
      return; // Updates already initialized
    }

    const defaultUpdates = [
      {
        id: 'update-1',
        name: 'Performance Improvements',
        description: 'This update includes various performance optimizations and bug fixes to improve your launcher experience.',
        version: '1.0.1',
        size: 50, // 50MB
        releaseDate: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
        isRequired: false,
        downloadUrl: 'https://example.com/updates/1.0.1.zip',
        createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'update-2',
        name: 'New Features Update',
        description: 'Added new features including improved search functionality, better download management, and enhanced UI elements.',
        version: '1.1.0',
        size: 120, // 120MB
        releaseDate: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        isRequired: true,
        downloadUrl: 'https://example.com/updates/1.1.0.zip',
        createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Add default updates
    for (const update of defaultUpdates) {
      try {
        await ApiClient.addUpdate(update);
      } catch (error) {
        console.warn('ApiClient failed, using DataStorage:', error);
        await DataStorage.addUpdate(update);
      }
    }
  }
}

