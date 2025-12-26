// pages/userInfo/userInfo.js
const app = getApp();
const userService = require('../../services/user.js');
const cloudService = require('../../services/cloud.js');
const storageService = require('../../services/storage.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,
    
    // 用户信息
    userInfo: null,
    nickname: '',
    avatarUrl: '',
    
    // 昵称编辑弹窗
    showNicknameModal: false,
    editingNickname: '',
    
    // 云端数据
    lastBackupTime: '',
    backupStatusText: '无云备份'
  },

  onLoad() {
    // 获取导航栏高度
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      totalNavHeight: app.globalData.totalNavHeight
    });
    
    // 加载用户信息
    this.loadUserInfo();
    
    // 加载最后备份时间
    this.loadLastBackupTime();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = userService.getUserInfo();
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({
      userInfo: userInfo,
      nickname: userInfo.nickname,
      avatarUrl: userInfo.avatarUrl
    });
  },

  /**
   * 选择头像（新版微信头像选择方式）
   */
  async onChooseAvatar(e) {
    try {
      const { avatarUrl } = e.detail;
      
      // 用户取消选择时，avatarUrl 可能为空，这是正常情况
      if (!avatarUrl) {
        console.log('[UserInfo] 用户取消选择头像');
        return;
      }
      
      wx.showLoading({ title: '上传中...', mask: true });
      
      // 直接上传临时文件到云存储
      const fileID = await userService.updateAvatar(avatarUrl);
      
      this.setData({ avatarUrl: fileID });
      wx.hideLoading();
      wx.showToast({ title: '头像已更新', icon: 'success' });
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UserInfo] 上传头像失败:', err);
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  },

  /**
   * 点击昵称 - 显示编辑弹窗
   */
  onNicknameTap() {
    this.setData({
      showNicknameModal: true,
      editingNickname: this.data.nickname
    });
  },

  /**
   * 昵称输入
   */
  onNicknameInput(e) {
    this.setData({
      editingNickname: e.detail.value
    });
  },

  /**
   * 昵称输入失焦（用于安全检测）
   */
  onNicknameBlur(e) {
    // 微信会自动进行安全检测
    // 如果未通过，会自动清空输入内容
    const value = e.detail.value;
    this.setData({
      editingNickname: value
    });
  },

  /**
   * 点击遮罩关闭弹窗
   */
  onModalMaskTap() {
    this.setData({
      showNicknameModal: false,
      editingNickname: ''
    });
  },

  /**
   * 点击弹窗内容区域（阻止冒泡）
   */
  onModalContentTap() {
    // 阻止事件冒泡到遮罩层
  },

  /**
   * 取消编辑昵称
   */
  onCancelNickname() {
    this.setData({
      showNicknameModal: false,
      editingNickname: ''
    });
  },

  /**
   * 确认修改昵称
   */
  async onConfirmNickname() {
    const newNickname = this.data.editingNickname.trim();
    
    if (!newNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    
    if (newNickname === this.data.nickname) {
      this.setData({
        showNicknameModal: false,
        editingNickname: ''
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      
      await userService.updateNickname(newNickname);
      
      this.setData({ 
        nickname: newNickname,
        showNicknameModal: false,
        editingNickname: ''
      });
      
      wx.hideLoading();
      wx.showToast({ title: '昵称已更新', icon: 'success' });
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UserInfo] 更新昵称失败:', err);
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
    }
  },

  /**
   * 退出登录
   */
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.handleLogout();
        }
      }
    });
  },

  /**
   * 处理退出登录
   */
  handleLogout() {
    try {
      userService.logout();
      wx.showToast({ title: '已退出登录', icon: 'success' });
      
      // 延迟返回，让用户看到提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (err) {
      console.error('[UserInfo] 退出登录失败:', err);
      wx.showToast({ title: '退出失败', icon: 'none' });
    }
  },

  /**
   * 返回上一页
   */
  onBackTap() {
    wx.navigateBack();
  },

  /**
   * 加载最后备份时间
   */
  async loadLastBackupTime() {
    try {
      const lastBackupTime = await cloudService.getLastBackupTime();
      if (lastBackupTime) {
        // 格式化时间显示 (MM-DD)
        const date = new Date(lastBackupTime);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        this.setData({
          lastBackupTime: `${month}-${day}`,
          backupStatusText: `备份时间: ${month}-${day}`
        });
      } else {
        this.setData({
          lastBackupTime: '',
          backupStatusText: '无云备份'
        });
      }
    } catch (err) {
      console.error('[UserInfo] 加载最后备份时间失败:', err);
      this.setData({
        backupStatusText: '无云备份'
      });
    }
  },

  /**
   * 备份到服务器
   */
  async onBackupTap() {
    try {
      // 获取本地笔记
      const notes = storageService.getLogs();
      
      if (notes.length === 0) {
        wx.showToast({ title: '暂无笔记需要备份', icon: 'none' });
        return;
      }
      
      wx.showLoading({ title: '备份中...', mask: true });
      
      // 调用云服务备份
      const result = await cloudService.backupNotes(notes);
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({ 
          title: `备份成功 (${result.count}/${result.total})`, 
          icon: 'success',
          duration: 2000
        });
        
        // 刷新最后备份时间
        this.loadLastBackupTime();
      } else {
        throw new Error('备份失败');
      }
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UserInfo] 备份失败:', err);
      wx.showToast({ title: '备份失败，请重试', icon: 'none' });
    }
  },

  /**
   * 从服务器恢复
   */
  onRestoreTap() {
    wx.showModal({
      title: '提示',
      content: '恢复将覆盖本地所有笔记数据，确定继续吗？',
      confirmText: '确定恢复',
      confirmColor: '#007AFF',
      success: (res) => {
        if (res.confirm) {
          this.handleRestore();
        }
      }
    });
  },

  /**
   * 处理恢复
   */
  async handleRestore() {
    try {
      wx.showLoading({ title: '恢复中...', mask: true });
      
      // 从云端获取笔记
      const notes = await cloudService.restoreNotes();
      
      if (notes.length === 0) {
        wx.hideLoading();
        wx.showToast({ title: '云端暂无备份数据', icon: 'none' });
        return;
      }
      
      // 覆盖本地数据 - 使用正确的 storage key
      wx.setStorageSync('drinking_diary_logs', notes);
      
      wx.hideLoading();
      wx.showToast({ 
        title: `恢复成功 (${notes.length}条)`, 
        icon: 'success',
        duration: 2000
      });
      
      // 通知所有页面刷新
      const pages = getCurrentPages();
      pages.forEach(page => {
        // 标记首页和个人页需要刷新
        if (page.route === 'pages/index/index' || page.route === 'pages/profile/profile') {
          // 直接调用 loadData 方法刷新数据
          if (typeof page.loadData === 'function') {
            page.loadData();
          }
        }
      });
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UserInfo] 恢复失败:', err);
      wx.showToast({ title: '恢复失败，请重试', icon: 'none' });
    }
  },

  /**
   * 删除云端备份
   */
  onDeleteCloudTap() {
    wx.showModal({
      title: '警告',
      content: '确定删除云端所有备份数据？此操作不可恢复！',
      confirmText: '确定删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          this.handleDeleteCloud();
        }
      }
    });
  },

  /**
   * 处理删除云端备份
   */
  async handleDeleteCloud() {
    try {
      wx.showLoading({ title: '删除中...', mask: true });
      
      const result = await cloudService.deleteCloudBackup();
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({ 
          title: '已删除云端备份', 
          icon: 'success' 
        });
        
        // 清除最后备份时间显示
        this.setData({ 
          lastBackupTime: '',
          backupStatusText: '当前无云备份'
        });
      } else {
        throw new Error('删除失败');
      }
      
    } catch (err) {
      wx.hideLoading();
      console.error('[UserInfo] 删除云端备份失败:', err);
      wx.showToast({ title: '删除失败，请重试', icon: 'none' });
    }
  },

  /**
   * 点击隐私协议
   */
  onPrivacyTap() {
    wx.navigateTo({
      url: '/pages/privacy/privacy',
      fail: (err) => {
        console.error('[UserInfo] 跳转隐私协议页失败:', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});
