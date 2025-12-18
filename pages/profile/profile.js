// pages/profile/profile.js
const app = getApp();
const storageService = require('../../services/storage.js');
const util = require('../../services/util.js');
const userService = require('../../services/user.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,

    // 图标字符
    icons: {
      guozhi: String.fromCodePoint(0x10209),  // 果汁 (使用 fromCodePoint)
      qianbao: String.fromCodePoint(0x1020b), // 钱包 (使用 fromCodePoint)
      riqi: String.fromCodePoint(0x1020d)     // 日期 (使用 fromCodePoint)
    },
    
    // 用户信息
    isLogin: false,
    userName: '点击登录',
    avatarUrl: '',
    
    // 统计数据
    stats: {
      totalNotes: 0,
      totalSpent: 0,
      daysActive: 0
    },
    
    // 记录列表
    logs: [],
    
    // 空状态
    isEmpty: false
  },

  onLoad() {
    // 获取导航栏高度，添加容错处理
    try {
      const globalData = (app && app.globalData) || {};
      const statusBarHeight = globalData.statusBarHeight || 20;
      const navBarHeight = globalData.navBarHeight || 44;
      const totalNavHeight = globalData.totalNavHeight || (statusBarHeight + navBarHeight);
      
      this.setData({
        statusBarHeight: statusBarHeight,
        navBarHeight: navBarHeight,
        totalNavHeight: totalNavHeight
      });
    } catch (err) {
      console.error('[Profile] 初始化导航栏高度失败:', err);
      // 使用默认值
      this.setData({
        statusBarHeight: 20,
        navBarHeight: 44,
        totalNavHeight: 64
      });
    }
    
    this.loadUserInfo();
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新用户信息和数据
    this.loadUserInfo();
    this.loadData();
    
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = userService.getUserInfo();
    if (userInfo) {
      this.setData({
        isLogin: true,
        userName: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl
      });
    } else {
      this.setData({
        isLogin: false,
        userName: '点击登录',
        avatarUrl: ''
      });
    }
  },

  /**
   * 加载数据
   */
  loadData() {
    const logs = storageService.getLogs();
    
    if (logs.length === 0) {
      this.setData({
        isEmpty: true,
        logs: [],
        stats: {
          totalNotes: 0,
          totalSpent: 0,
          daysActive: 0
        }
      });
      return;
    }
    
    // 计算统计数据
    const stats = this.calculateStats(logs);
    
    this.setData({
      isEmpty: false,
      logs,
      stats
    });
  },

  /**
   * 计算统计数据
   */
  calculateStats(logs) {
    // 总杯数
    const totalNotes = logs.length;
    
    // 总花费
    const totalSpent = logs.reduce((sum, log) => {
      return sum + (log.price || 0);
    }, 0);
    
    // 本月记录天数
    const daysActive = util.calculateMonthDays(logs);
    
    return {
      totalNotes,
      totalSpent: totalSpent.toFixed(0), // 取整显示
      daysActive
    };
  },

  /**
   * 点击头像
   */
  async onAvatarTap() {
    if (this.data.isLogin) {
      // 已登录，跳转到个人信息编辑页
      wx.navigateTo({
        url: '/pages/userInfo/userInfo',
        fail: (err) => {
          console.error('[Profile] 跳转个人信息页失败:', err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else {
      // 未登录，触发登录流程
      await this.handleLogin();
    }
  },

  /**
   * 处理登录
   */
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      
      const userInfo = await userService.login();
      
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      
      // 刷新页面显示
      this.loadUserInfo();
      
    } catch (err) {
      wx.hideLoading();
      
      if (err.message === '用户取消授权') {
        wx.showToast({ title: '登录已取消', icon: 'none' });
      } else {
        console.error('[Profile] 登录失败:', err);
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    }
  },

  /**
   * 点击照片，进入编辑页
   */
  onPhotoTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/editor/editor?id=${id}`,
      fail: (err) => {
        console.error('[Profile] 跳转编辑页失败:', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    console.warn('[Profile] 图片加载失败:', e.detail);
  }
});
