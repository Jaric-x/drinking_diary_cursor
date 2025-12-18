// pages/userInfo/userInfo.js
const app = getApp();
const userService = require('../../services/user.js');

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
    editingNickname: ''
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
  }
});
