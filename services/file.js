/**
 * 文件管理服务
 * 处理图片的持久化存储和删除
 */

const fs = wx.getFileSystemManager();
const USER_DATA_PATH = wx.env.USER_DATA_PATH;

/**
 * 保存临时图片到本地永久目录
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} 永久文件路径
 */
function saveImage(tempFilePath) {
  return new Promise((resolve, reject) => {
    // 生成唯一文件名
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const destPath = `${USER_DATA_PATH}/${fileName}`;
    
    // 复制文件到永久目录
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: destPath,
      success: () => {
        console.log('[FileService] 图片保存成功:', destPath);
        resolve(destPath);
      },
      fail: (err) => {
        console.error('[FileService] 图片保存失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 删除本地图片文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>}
 */
function deleteImage(filePath) {
  return new Promise((resolve, reject) => {
    // 检查是否是本地永久文件
    if (!filePath || !filePath.includes(USER_DATA_PATH)) {
      resolve(); // 不是本地文件，直接返回
      return;
    }
    
    fs.unlink({
      filePath: filePath,
      success: () => {
        console.log('[FileService] 图片删除成功:', filePath);
        resolve();
      },
      fail: (err) => {
        console.warn('[FileService] 图片删除失败:', err);
        resolve(); // 删除失败也继续，避免阻塞业务逻辑
      }
    });
  });
}

/**
 * 压缩图片
 * @param {string} src - 源图片路径
 * @param {number} quality - 压缩质量 0-100
 * @returns {Promise<string>} 压缩后的临时路径
 */
function compressImage(src, quality = 80) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: src,
      quality: quality,
      success: (res) => {
        console.log('[FileService] 图片压缩成功');
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('[FileService] 图片压缩失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  saveImage,
  deleteImage,
  compressImage
};

