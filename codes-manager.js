// Admin codes management module
import { StorageManager, STORAGE_KEYS } from '../utils/storage.js';
import { NotificationManager } from '../../components/notification-manager.js';
import { ApiClient } from '../utils/api-client.js';
import { DataStorage } from '../utils/data-storage-wrapper.js';
import { IconManager } from '../utils/icon-manager.js';

export function initCodesTab(contentArea) {
  // Use requestAnimationFrame to prevent UI freezing
  requestAnimationFrame(() => {
    contentArea.innerHTML = `
      <div class="admin-tab-content">
        <div class="admin-section-header">
          <h2>Activation Codes Management</h2>
          <p class="text-secondary">Generate and manage activation codes</p>
          <button id="generate-code-btn" class="btn btn-primary" style="margin-top: 16px;">Generate New Code</button>
        </div>
        <div class="codes-list" id="codes-list">
          <!-- Codes will be loaded here -->
        </div>
        <div class="loading-state" id="codes-loading">
          <div class="spinner"></div>
          <p class="text-secondary">Loading codes...</p>
        </div>
        <div class="empty-state" id="codes-empty" style="display: none;">
          <div class="empty-icon" id="codes-empty-icon"></div>
          <p class="text-muted">No codes found</p>
        </div>
      </div>
    `;

    // Setup event listeners after DOM update
    requestAnimationFrame(() => {
      const generateBtn = document.getElementById('generate-code-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', showGenerateCodeModal);
      }

      loadCodes();
    });
  });
}

async function loadCodes() {
  const codesList = document.getElementById('codes-list');
  const loadingState = document.getElementById('codes-loading');
  const emptyState = document.getElementById('codes-empty');

  if (!codesList) return;

  try {
    let codes;
    try {
      codes = await ApiClient.getActivationCodes();
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      codes = await DataStorage.getActivationCodes();
    }

    loadingState.style.display = 'none';

    if (codes.length === 0) {
      codesList.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    codesList.style.display = 'flex';
    emptyState.style.display = 'none';
    codesList.innerHTML = '';

    for (const code of codes) {
      const codeCard = await createCodeCard(code);
      codesList.appendChild(codeCard);
    }
  } catch (error) {
    console.error('Error loading codes:', error);
    loadingState.style.display = 'none';
    emptyState.style.display = 'flex';
  }
}

async function createCodeCard(code) {
  const card = document.createElement('div');
  card.className = 'admin-code-card';
  card.setAttribute('data-code', code.code);

  const isExpired = code.expiryDate && code.expiryDate < Date.now();
  const expiryText = code.expiryDate 
    ? (isExpired ? 'Expired' : new Date(code.expiryDate).toLocaleDateString())
    : 'Permanent';

  // Load icons
  const deleteIconHTML = await IconManager.getIconHTML('delete', { size: 16, color: 'currentColor' });
  const successIconHTML = await IconManager.getIconHTML('success', { size: 14, color: '#10B981' });
  const errorIconHTML = await IconManager.getIconHTML('error', { size: 14, color: '#EF4444' });

  card.innerHTML = `
    <div class="code-card-header">
      <div class="code-card-title">
        <h3>${code.code}</h3>
        <span class="code-badge ${code.type.toLowerCase()}">${code.type}</span>
      </div>
    </div>
    <div class="code-card-body">
      <div class="code-info-item">
        <strong>Type:</strong> <span>${code.type}</span>
      </div>
      <div class="code-info-item">
        <strong>Status:</strong> 
        <span class="status-badge ${code.isValid && !isExpired ? 'valid' : 'invalid'}" style="display: inline-flex; align-items: center; gap: 4px;">
          ${code.isValid && !isExpired ? successIconHTML + ' Valid' : errorIconHTML + ' Invalid'}
        </span>
      </div>
      <div class="code-info-item">
        <strong>Expiry:</strong> <span>${expiryText}</span>
      </div>
      ${code.linkedUserId ? `<div class="code-info-item"><strong>Linked User:</strong> <span>${code.linkedUserId}</span></div>` : ''}
      ${code.usedBy ? `<div class="code-info-item"><strong>Used By:</strong> <span>${code.usedBy}</span></div>` : ''}
    </div>
    <div class="code-card-footer">
      <button class="btn btn-sm btn-danger" data-action="delete" style="display: inline-flex; align-items: center; gap: 4px;">
        ${deleteIconHTML || ''} Delete
      </button>
    </div>
  `;

  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deleteCode(code.code));
  }

  return card;
}

function showGenerateCodeModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('generate-code-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'generate-code-modal';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10000';

  overlay.innerHTML = `
    <div class="admin-modal" style="position: relative; z-index: 10001;">
      <div class="admin-modal-header">
        <h2>Generate New Code</h2>
        <button class="modal-close" id="close-generate-modal" style="background: none; border: none; color: var(--text-primary); font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
      </div>
      <form id="generate-code-form" class="admin-modal-body">
        <div class="form-group">
          <label class="form-label">Code (Auto-generated)</label>
          <input type="text" id="generated-code" class="form-input" readonly>
          <button type="button" id="regenerate-code-btn" class="btn btn-secondary" style="margin-top: 8px;">Regenerate</button>
        </div>
        <div class="form-group">
          <label class="form-label">Code Type</label>
          <select id="code-type" class="form-input" required>
            <option value="PUB">PUB (Public - Multiple uses)</option>
            <option value="PRIVATE">PRIVATE (Single use, linked to user)</option>
          </select>
        </div>
        <div class="form-group" id="linked-user-group" style="display: none;">
          <label class="form-label">Linked User ID (for PRIVATE codes)</label>
          <input type="text" id="linked-user-id" class="form-input" placeholder="Enter user ID">
        </div>
        <div class="form-group">
          <label class="form-label">Expiry</label>
          <select id="expiry-type" class="form-input" required>
            <option value="permanent">Permanent</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="year">Year</option>
          </select>
        </div>
        <div class="form-group" id="expiry-value-group" style="display: none;">
          <label class="form-label">Expiry Value</label>
          <input type="number" id="expiry-value" class="form-input" min="1" placeholder="Enter number">
        </div>
        <div class="admin-modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-generate">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Code</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.classList.add('modal-enter');
  });

  // Generate initial code
  generateRandomCode();

  // Event listeners
  const codeType = document.getElementById('code-type');
  const linkedUserGroup = document.getElementById('linked-user-group');
  const expiryType = document.getElementById('expiry-type');
  const expiryValueGroup = document.getElementById('expiry-value-group');
  const regenerateBtn = document.getElementById('regenerate-code-btn');
  const form = document.getElementById('generate-code-form');
  const closeBtn = document.getElementById('close-generate-modal');
  const cancelBtn = document.getElementById('cancel-generate');

  codeType.addEventListener('change', (e) => {
    linkedUserGroup.style.display = e.target.value === 'PRIVATE' ? 'block' : 'none';
  });

  expiryType.addEventListener('change', (e) => {
    expiryValueGroup.style.display = e.target.value === 'permanent' ? 'none' : 'block';
  });

  regenerateBtn.addEventListener('click', generateRandomCode);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    createCode();
  });

  function closeModal() {
    overlay.classList.add('modal-exit');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&+';
    let code = 'AYATO-CODE:';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('generated-code').value = code;
  }

  async function createCode() {
    const code = document.getElementById('generated-code').value;
    const type = document.getElementById('code-type').value;
    const linkedUserId = type === 'PRIVATE' ? document.getElementById('linked-user-id').value.trim() : null;
    const expiryType = document.getElementById('expiry-type').value;
    const expiryValue = document.getElementById('expiry-value').value;

    if (!code) {
      NotificationManager.error('Error', 'Code is required');
      return;
    }

    if (type === 'PRIVATE' && !linkedUserId) {
      NotificationManager.error('Error', 'Linked User ID is required for PRIVATE codes');
      return;
    }

    let expiryDate = null;
    if (expiryType !== 'permanent') {
      const value = parseInt(expiryValue);
      if (!value || value < 1) {
        NotificationManager.error('Error', 'Please enter a valid expiry value');
        return;
      }

      const now = Date.now();
      const multipliers = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };

      expiryDate = now + (value * multipliers[expiryType]);
    }

    let codes;
    try {
      codes = await ApiClient.getActivationCodes();
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      codes = await DataStorage.getActivationCodes();
    }
    
    // Check if code already exists
    if (codes.find(c => c.code === code)) {
      NotificationManager.error('Error', 'Code already exists');
      return;
    }

    const newCode = {
      code,
      type,
      linkedUserId: linkedUserId || null,
      expiryDate,
      isValid: true
    };

    try {
      await ApiClient.addActivationCode(newCode);
    } catch (error) {
      console.warn('ApiClient failed, using DataStorage:', error);
      await DataStorage.addActivationCode(newCode);
    }

    NotificationManager.success('Code Created', `Code ${code} has been created successfully`);
    closeModal();
    await loadCodes();
  }
}

async function deleteCode(code) {
  const confirmed = confirm(`Are you sure you want to delete code "${code}"?`);
  if (!confirmed) return;

  try {
    await ApiClient.deleteActivationCode(code);
  } catch (error) {
    console.warn('ApiClient failed, using DataStorage:', error);
    await DataStorage.deleteActivationCode(code);
  }

  NotificationManager.success('Code Deleted', `Code ${code} has been deleted`);
  await loadCodes();
}

