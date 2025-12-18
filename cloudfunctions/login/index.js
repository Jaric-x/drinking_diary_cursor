// 云函数：login
// 用途：获取用户的 openid
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 获取用户 OpenID
 * @returns {Object} { openid, appid, unionid }
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    
    return {
      success: true,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    };
  } catch (err) {
    console.error('[login] 获取用户信息失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
