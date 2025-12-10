/**
 * 数据存储服务
 * 处理所有本地数据的CRUD操作
 */

const util = require('./util.js');
const fileService = require('./file.js');

const STORAGE_KEY_LOGS = 'drinking_diary_logs';
const STORAGE_KEY_TAGS = 'drinking_diary_tags';

/**
 * 获取所有记录
 * @returns {Array} 记录数组，按创建时间倒序
 */
function getLogs() {
  try {
    const logs = wx.getStorageSync(STORAGE_KEY_LOGS);
    if (!logs || !Array.isArray(logs)) {
      return [];
    }
    // 按创建时间倒序排列
    return logs.sort((a, b) => b.createTime - a.createTime);
  } catch (err) {
    console.error('[StorageService] 读取记录失败:', err);
    return [];
  }
}

/**
 * 根据ID获取单条记录
 * @param {string} id - 记录ID
 * @returns {Object|null} 记录对象
 */
function getLogById(id) {
  const logs = getLogs();
  return logs.find(log => log.id === id) || null;
}

/**
 * 保存记录（新建或更新）
 * @param {Object} log - 记录对象
 * @returns {Promise<Object>} 保存后的记录对象
 */
function saveLog(log) {
  return new Promise((resolve, reject) => {
    try {
      const logs = getLogs();
      const now = Date.now();
      
      // 查找是否已存在
      const existingIndex = logs.findIndex(item => item.id === log.id);
      
      if (existingIndex >= 0) {
        // 更新现有记录 - 保留原记录的创建时间信息
        const oldLog = logs[existingIndex];
        log.createTime = oldLog.createTime; // 保留创建时间
        log.updateTime = now;
        log.dateString = oldLog.dateString; // 保留创建日期字符串（兼容旧逻辑）
        log.timeString = oldLog.timeString; // 保留创建时间字符串（兼容旧逻辑）
        logs[existingIndex] = log;
        console.log('[StorageService] 更新记录:', log.id);
      } else {
        // 新建记录
        log.createTime = now;
        log.updateTime = now;
        log.dateString = util.formatDate(now);
        log.timeString = util.formatTime(now);
        logs.unshift(log);
        console.log('[StorageService] 新建记录:', log.id);
      }
      
      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEY_LOGS, logs);
      resolve(log);
    } catch (err) {
      console.error('[StorageService] 保存记录失败:', err);
      reject(err);
    }
  });
}

/**
 * 删除记录
 * @param {string} id - 记录ID
 * @returns {Promise<void>}
 */
function deleteLog(id) {
  return new Promise((resolve, reject) => {
    try {
      const logs = getLogs();
      const logIndex = logs.findIndex(log => log.id === id);
      
      if (logIndex < 0) {
        reject(new Error('记录不存在'));
        return;
      }
      
      const log = logs[logIndex];
      
      // 删除关联的图片文件
      if (log.imagePath) {
        fileService.deleteImage(log.imagePath).catch(err => {
          console.warn('[StorageService] 删除图片失败，继续删除记录', err);
        });
      }
      
      // 从数组中移除
      logs.splice(logIndex, 1);
      
      // 保存到本地存储
      wx.setStorageSync(STORAGE_KEY_LOGS, logs);
      console.log('[StorageService] 删除记录:', id);
      resolve();
    } catch (err) {
      console.error('[StorageService] 删除记录失败:', err);
      reject(err);
    }
  });
}

/**
 * 获取自定义标签列表
 * @returns {Array<string>} 标签数组
 */
function getUserTags() {
  try {
    const tags = wx.getStorageSync(STORAGE_KEY_TAGS);
    return Array.isArray(tags) ? tags : [];
  } catch (err) {
    console.error('[StorageService] 读取标签失败:', err);
    return [];
  }
}

/**
 * 添加自定义标签
 * @param {string} tag - 标签名称
 * @returns {Promise<void>}
 */
function addUserTag(tag) {
  return new Promise((resolve, reject) => {
    try {
      if (!tag || tag.trim() === '') {
        reject(new Error('标签不能为空'));
        return;
      }
      
      const tags = getUserTags();
      
      // 检查是否已存在
      if (tags.includes(tag)) {
        resolve(); // 已存在，直接返回
        return;
      }
      
      tags.push(tag);
      wx.setStorageSync(STORAGE_KEY_TAGS, tags);
      console.log('[StorageService] 添加标签:', tag);
      resolve();
    } catch (err) {
      console.error('[StorageService] 添加标签失败:', err);
      reject(err);
    }
  });
}

/**
 * 清空所有数据（用于测试）
 */
function clearAll() {
  try {
    wx.removeStorageSync(STORAGE_KEY_LOGS);
    wx.removeStorageSync(STORAGE_KEY_TAGS);
    console.log('[StorageService] 清空所有数据');
  } catch (err) {
    console.error('[StorageService] 清空数据失败:', err);
  }
}

module.exports = {
  getLogs,
  getLogById,
  saveLog,
  deleteLog,
  getUserTags,
  addUserTag,
  clearAll
};

