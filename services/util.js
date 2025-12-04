/**
 * 工具函数服务
 * 提供日期格式化、ID生成等通用功能
 */

/**
 * 格式化日期为 MM.DD 格式
 * @param {Date|number} date - 日期对象或时间戳
 * @returns {string} 格式化后的日期字符串，如 "10.24"
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

/**
 * 格式化时间为 HH:mm 格式
 * @param {Date|number} date - 日期对象或时间戳
 * @returns {string} 格式化后的时间字符串，如 "20:30"
 */
function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID字符串
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取当前时段的问候语
 * @returns {string} 问候语文本
 */
function getGreeting() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 11) {
    return '早安，\n准备喝点什么？';
  } else if (hour >= 11 && hour < 14) {
    return '午后时光，\n小酌一杯？';
  } else if (hour >= 14 && hour < 18) {
    return '下午好，\n要不要喝点什么？';
  } else if (hour >= 18 && hour < 22) {
    return '夜幕降临，\n来一杯吧';
  } else {
    return '夜深了，\n来一杯吗？';
  }
}

/**
 * 计算本月记录天数
 * @param {Array} logs - 记录数组
 * @returns {number} 本月记录天数
 */
function calculateMonthDays(logs) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const daysSet = new Set();
  
  logs.forEach(log => {
    const logDate = new Date(log.createTime);
    if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
      daysSet.add(logDate.getDate());
    }
  });
  
  return daysSet.size;
}

module.exports = {
  formatDate,
  formatTime,
  generateId,
  getGreeting,
  calculateMonthDays
};

