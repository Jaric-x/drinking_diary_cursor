/**
 * 用户服务层
 * 管理用户登录、信息获取和更新
 */

const app = getApp();
const db = wx.cloud.database();
const usersCollection = db.collection('users');

/**
 * 微信登录 - 获取用户信息并保存到云端
 * @returns {Promise<Object>} 用户信息
 */
async function login() {
  try {
    console.log('[UserService] 开始登录流程');
    
    // 1. 获取用户授权信息
    const userProfile = await getUserProfile();
    if (!userProfile) {
      throw new Error('用户取消授权');
    }
    
    // 2. 调用云函数获取 openid
    const cloudResult = await wx.cloud.callFunction({
      name: 'login'
    });
    
    if (!cloudResult.result.success) {
      throw new Error('获取 OpenID 失败');
    }
    
    const openid = cloudResult.result.openid;
    console.log('[UserService] 获取 OpenID 成功:', openid);
    
    // 3. 上传头像到云存储
    let avatarUrl = userProfile.avatarUrl;
    try {
      // 下载微信头像（Promise 化）
      const tempFile = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: userProfile.avatarUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res);
            } else {
              reject(new Error(`下载失败: ${res.statusCode}`));
            }
          },
          fail: reject
        });
      });
      
      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: `avatar/${openid}_${Date.now()}.jpg`,
        filePath: tempFile.tempFilePath
      });
      
      avatarUrl = uploadResult.fileID;
      console.log('[UserService] 头像上传成功:', avatarUrl);
    } catch (err) {
      console.warn('[UserService] 头像上传失败，使用微信头像:', err);
      avatarUrl = userProfile.avatarUrl;
    }
    
    // 4. 保存或更新用户信息到云数据库
    const userInfo = {
      _id: openid,
      nickname: userProfile.nickName,
      avatarUrl: avatarUrl,
      createdAt: db.serverDate(),
      lastBackupAt: null
    };
    
    try {
      // 尝试创建新用户
      await usersCollection.add({
        data: userInfo
      });
      console.log('[UserService] 新用户创建成功');
    } catch (err) {
      // 如果用户已存在，更新用户信息
      // errCode -502001 或 -502002 都表示重复键错误
      if (err.errCode === -502001 || err.errCode === -502002) {
        await usersCollection.doc(openid).update({
          data: {
            nickname: userInfo.nickname,
            avatarUrl: userInfo.avatarUrl
          }
        });
        console.log('[UserService] 用户信息更新成功');
      } else {
        throw err;
      }
    }
    
    // 5. 保存用户信息到本地
    const localUserInfo = {
      openid: openid,
      nickname: userInfo.nickname,
      avatarUrl: userInfo.avatarUrl
    };
    
    wx.setStorageSync('user_info', localUserInfo);
    
    // 6. 更新全局状态
    app.globalData.userInfo = localUserInfo;
    app.globalData.isLogin = true;
    
    console.log('[UserService] 登录成功:', localUserInfo);
    return localUserInfo;
    
  } catch (err) {
    console.error('[UserService] 登录失败:', err);
    throw err;
  }
}

/**
 * 获取用户授权信息
 * @returns {Promise<Object>} 用户信息
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('[UserService] 获取用户信息成功:', res.userInfo);
        resolve(res.userInfo);
      },
      fail: (err) => {
        console.log('[UserService] 用户取消授权:', err);
        resolve(null);
      }
    });
  });
}

/**
 * 获取本地用户信息
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  try {
    const userInfo = wx.getStorageSync('user_info');
    return userInfo || null;
  } catch (err) {
    console.error('[UserService] 获取本地用户信息失败:', err);
    return null;
  }
}

/**
 * 检查是否已登录
 * @returns {Boolean}
 */
function isLogin() {
  const userInfo = getUserInfo();
  return !!userInfo;
}

/**
 * 更新用户昵称
 * @param {String} nickname - 新昵称
 * @returns {Promise<Boolean>}
 */
async function updateNickname(nickname) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    // 更新云数据库
    await usersCollection.doc(userInfo.openid).update({
      data: {
        nickname: nickname
      }
    });
    
    // 更新本地存储
    userInfo.nickname = nickname;
    wx.setStorageSync('user_info', userInfo);
    
    // 更新全局状态
    app.globalData.userInfo = userInfo;
    
    console.log('[UserService] 昵称更新成功:', nickname);
    return true;
  } catch (err) {
    console.error('[UserService] 昵称更新失败:', err);
    throw err;
  }
}

/**
 * 更新用户头像
 * @param {String} filePath - 本地图片路径
 * @returns {Promise<String>} 云存储文件 ID
 */
async function updateAvatar(filePath) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    // 上传到云存储
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath: `avatar/${userInfo.openid}_${Date.now()}.jpg`,
      filePath: filePath
    });
    
    const fileID = uploadResult.fileID;
    console.log('[UserService] 头像上传成功:', fileID);
    
    // 删除旧头像（如果是云存储文件）
    if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('cloud://')) {
      try {
        await wx.cloud.deleteFile({
          fileList: [userInfo.avatarUrl]
        });
        console.log('[UserService] 旧头像删除成功');
      } catch (err) {
        console.warn('[UserService] 旧头像删除失败:', err);
      }
    }
    
    // 更新云数据库
    await usersCollection.doc(userInfo.openid).update({
      data: {
        avatarUrl: fileID
      }
    });
    
    // 更新本地存储
    userInfo.avatarUrl = fileID;
    wx.setStorageSync('user_info', userInfo);
    
    // 更新全局状态
    app.globalData.userInfo = userInfo;
    
    console.log('[UserService] 头像更新成功');
    return fileID;
  } catch (err) {
    console.error('[UserService] 头像更新失败:', err);
    throw err;
  }
}

/**
 * 使用微信头像（已废弃，保留用于兼容）
 * 推荐使用 chooseAvatar 方式获取头像
 * @returns {Promise<String>} 云存储文件 ID
 * @deprecated
 */
async function useWechatAvatar() {
  try {
    const userInfo = getUserInfo();
    if (!userInfo) {
      throw new Error('未登录');
    }
    
    // 获取微信头像
    const userProfile = await getUserProfile();
    if (!userProfile) {
      throw new Error('获取微信头像失败');
    }
    
    // 下载微信头像（Promise 化）
    const tempFile = await new Promise((resolve, reject) => {
      wx.downloadFile({
        url: userProfile.avatarUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res);
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`));
          }
        },
        fail: reject
      });
    });
    
    // 上传到云存储
    return await updateAvatar(tempFile.tempFilePath);
  } catch (err) {
    console.error('[UserService] 使用微信头像失败:', err);
    throw err;
  }
}

/**
 * 退出登录
 */
function logout() {
  try {
    // 清除本地存储
    wx.removeStorageSync('user_info');
    
    // 清除全局状态
    app.globalData.userInfo = null;
    app.globalData.isLogin = false;
    
    console.log('[UserService] 退出登录成功');
  } catch (err) {
    console.error('[UserService] 退出登录失败:', err);
    throw err;
  }
}

module.exports = {
  login,
  getUserInfo,
  isLogin,
  updateNickname,
  updateAvatar,
  useWechatAvatar,
  logout
};
