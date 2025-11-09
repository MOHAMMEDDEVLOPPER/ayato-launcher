// نظام التخزين المشفر - يعمل في Node.js Server
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// مفتاح التشفير (غيّره إلى مفتاح سري خاص بك)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'AyAtO-LaUnChEr-2024-SeCrEt!!'; // 32 حرف بالضبط
const IV_LENGTH = 16;

// مسار التخزين - في مجلد server/.data
const DATA_PATH = path.join(__dirname, '..', '.data');

// إنشاء المجلد إذا لم يكن موجوداً
if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

class EncryptedStorage {
  // تشفير النص
  static encrypt(text) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  // فك التشفير
  static decrypt(text) {
    try {
      const parts = text.split(':');
      if (parts.length !== 2) {
        return null;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // توليد اسم ملف عشوائي
  static generateFilename() {
    return crypto.randomBytes(16).toString('hex') + '.dat';
  }

  // توزيع البيانات على ملفات متعددة
  static distributeData(data, numFiles = 100) {
    try {
      const dataString = JSON.stringify(data);
      const chunkSize = Math.ceil(dataString.length / numFiles);
      const chunks = [];
      
      for (let i = 0; i < numFiles; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, dataString.length);
        const chunk = dataString.slice(start, end);
        
        if (chunk.length > 0) {
          const encrypted = this.encrypt(chunk);
          if (!encrypted) {
            throw new Error('Failed to encrypt chunk');
          }
          
          chunks.push({
            index: i,
            data: encrypted,
            checksum: crypto.createHash('md5').update(chunk).digest('hex')
          });
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('Distribute data error:', error);
      return null;
    }
  }

  // إعادة تجميع البيانات
  static reassembleData(chunks) {
    if (!chunks || chunks.length === 0) {
      return null;
    }
    
    try {
      // ترتيب حسب الـ index
      chunks.sort((a, b) => a.index - b.index);
      
      // فك التشفير والتحقق
      const decryptedChunks = [];
      for (const chunk of chunks) {
        const decrypted = this.decrypt(chunk.data);
        if (!decrypted) {
          console.error('Failed to decrypt chunk:', chunk.index);
          return null;
        }
        
        // التحقق من الـ checksum
        const checksum = crypto.createHash('md5').update(decrypted).digest('hex');
        if (checksum !== chunk.checksum) {
          console.error('Checksum mismatch for chunk:', chunk.index);
          return null;
        }
        
        decryptedChunks.push(decrypted);
      }
      
      const fullData = decryptedChunks.join('');
      return JSON.parse(fullData);
    } catch (error) {
      console.error('Reassemble data error:', error);
      return null;
    }
  }

  // حفظ البيانات
  static save(collectionName, data) {
    try {
      // توزيع البيانات
      const chunks = this.distributeData(data, 100);
      if (!chunks) {
        return false;
      }
      
      const manifest = {};
      
      // حذف الملفات القديمة لهذه المجموعة
      this.deleteCollection(collectionName);
      
      // حفظ كل chunk في ملف منفصل
      chunks.forEach((chunk) => {
        const filename = this.generateFilename();
        const filepath = path.join(DATA_PATH, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(chunk), 'utf8');
        manifest[chunk.index] = filename;
      });
      
      // حفظ الـ manifest
      const manifestPath = path.join(DATA_PATH, `.${collectionName}.manifest`);
      const encryptedManifest = this.encrypt(JSON.stringify(manifest));
      if (!encryptedManifest) {
        return false;
      }
      fs.writeFileSync(manifestPath, encryptedManifest, 'utf8');
      
      return true;
    } catch (error) {
      console.error('Save error:', error);
      return false;
    }
  }

  // قراءة البيانات
  static load(collectionName) {
    try {
      // قراءة الـ manifest
      const manifestPath = path.join(DATA_PATH, `.${collectionName}.manifest`);
      
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      
      const encryptedManifest = fs.readFileSync(manifestPath, 'utf8');
      const manifestJson = this.decrypt(encryptedManifest);
      
      if (!manifestJson) {
        return null;
      }
      
      const manifest = JSON.parse(manifestJson);
      
      // قراءة كل الـ chunks
      const chunks = [];
      for (const [index, filename] of Object.entries(manifest)) {
        const filepath = path.join(DATA_PATH, filename);
        
        if (!fs.existsSync(filepath)) {
          console.error('Missing chunk file:', filename);
          return null;
        }
        
        const chunkData = fs.readFileSync(filepath, 'utf8');
        chunks.push(JSON.parse(chunkData));
      }
      
      // إعادة تجميع البيانات
      return this.reassembleData(chunks);
    } catch (error) {
      console.error('Load error:', error);
      return null;
    }
  }

  // حذف مجموعة
  static deleteCollection(collectionName) {
    try {
      const manifestPath = path.join(DATA_PATH, `.${collectionName}.manifest`);
      
      if (fs.existsSync(manifestPath)) {
        // قراءة الـ manifest
        const encryptedManifest = fs.readFileSync(manifestPath, 'utf8');
        const manifestJson = this.decrypt(encryptedManifest);
        
        if (manifestJson) {
          const manifest = JSON.parse(manifestJson);
          
          // حذف كل الملفات
          for (const filename of Object.values(manifest)) {
            const filepath = path.join(DATA_PATH, filename);
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
            }
          }
        }
        
        // حذف الـ manifest
        fs.unlinkSync(manifestPath);
      }
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  // حذف كل البيانات
  static clearAll() {
    try {
      const files = fs.readdirSync(DATA_PATH);
      files.forEach(file => {
        const filepath = path.join(DATA_PATH, file);
        if (fs.statSync(filepath).isFile()) {
          fs.unlinkSync(filepath);
        }
      });
      return true;
    } catch (error) {
      console.error('Clear all error:', error);
      return false;
    }
  }
}

module.exports = { EncryptedStorage };

