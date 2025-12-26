// pages/privacy/privacy.js
const app = getApp();

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64
  },

  onLoad(options) {
    // 获取导航栏高度
    try {
      const globalData = (app && app.globalData) || {};
      const statusBarHeight = globalData.statusBarHeight || 20;
      const navBarHeight = globalData.navBarHeight || 44;
      const totalNavHeight = globalData.totalNavHeight || (statusBarHeight + navBarHeight);
      
      this.setData({
        statusBarHeight,
        navBarHeight,
        totalNavHeight
      });
    } catch (err) {
      console.error('[Privacy] 获取导航栏高度失败:', err);
      // 使用默认值
      this.setData({
        statusBarHeight: 20,
        navBarHeight: 44,
        totalNavHeight: 64
      });
    }
  },

  /**
   * 返回上一页
   */
  onBackTap() {
    wx.navigateBack();
  }
});

