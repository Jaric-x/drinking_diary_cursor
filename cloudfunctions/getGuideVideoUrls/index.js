// 云函数：getGuideVideoUrls
// 用途：以服务端权限批量获取引导视频临时链接
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  try {
    const fileIDs = Array.isArray(event.fileIDs) ? event.fileIDs.filter(Boolean) : [];
    if (fileIDs.length === 0) {
      return {
        success: true,
        fileList: []
      };
    }

    const res = await cloud.getTempFileURL({
      fileList: fileIDs
    });

    return {
      success: true,
      fileList: res.fileList || []
    };
  } catch (err) {
    console.error('[getGuideVideoUrls] 获取临时链接失败:', err);
    return {
      success: false,
      error: err.message || 'unknown error',
      fileList: []
    };
  }
};

