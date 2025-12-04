// pages/profile/profile.js
const app = getApp();
const storageService = require('../../services/storage.js');
const util = require('../../services/util.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,
    
    // 用户信息
    userName: 'Alex',
    userTitle: 'Sommelier in training',
    avatarUrl: 'https://picsum.photos/200/200',
    
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
    // 获取导航栏高度
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      totalNavHeight: app.globalData.totalNavHeight
    });
    
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadData();
    
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
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
