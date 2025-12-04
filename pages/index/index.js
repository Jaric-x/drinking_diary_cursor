// pages/index/index.js
const app = getApp();
const storageService = require('../../services/storage.js');
const util = require('../../services/util.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,
    
    // 问候语
    greeting: '',
    
    // 分组后的记录数据
    groupedLogs: [], // [{date: '10.24', logs: [...]}]
    
    // Swiper索引
    activeGroupIndex: 0,
    activeLogIndices: {}, // {groupIndex: logIndex}
    
    // 背景图片
    backgroundImage: '',
    
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
    
    // 设置问候语
    this.setData({
      greeting: util.getGreeting()
    });
  },

  onShow() {
    // 每次显示时刷新数据（从编辑页返回时）
    this.loadData();
    
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 加载并分组记录数据
   */
  loadData() {
    const logs = storageService.getLogs();
    
    if (logs.length === 0) {
      this.setData({ 
        isEmpty: true,
        groupedLogs: []
      });
      return;
    }
    
    // 按日期分组
    const groupMap = {};
    logs.forEach(log => {
      const date = log.dateString;
      if (!groupMap[date]) {
        groupMap[date] = [];
      }
      groupMap[date].push(log);
    });
    
    // 转换为数组格式，并按日期降序排列
    const groupedLogs = Object.keys(groupMap)
      .sort((a, b) => {
        // 将 MM.DD 转换为可比较的数字
        const [aMonth, aDay] = a.split('.').map(Number);
        const [bMonth, bDay] = b.split('.').map(Number);
        // 降序排列（最新的在前面）
        if (aMonth !== bMonth) return bMonth - aMonth;
        return bDay - aDay;
      })
      .map(date => ({
        date,
        logs: groupMap[date]
      }));
    
    // 初始化每组的活动索引
    const activeLogIndices = {};
    groupedLogs.forEach((group, index) => {
      activeLogIndices[index] = 0;
    });
    
    // 设置背景图片为第一张卡片
    const firstLog = groupedLogs[0]?.logs[0];
    const backgroundImage = firstLog ? (firstLog.imagePath || firstLog.imageUrl) : '';
    
    this.setData({
      isEmpty: false,
      groupedLogs,
      activeLogIndices,
      backgroundImage,
      activeGroupIndex: 0
    });
  },

  /**
   * 垂直Swiper切换（切换日期分组）
   */
  onVerticalChange(e) {
    const current = e.detail.current;
    this.setData({ 
      activeGroupIndex: current 
    });
    
    // 更新背景图片
    this.updateBackground();
  },

  /**
   * 水平Swiper切换（切换同日期内的卡片）
   */
  onHorizontalChange(e) {
    const groupIndex = parseInt(e.currentTarget.dataset.groupIndex);
    const current = e.detail.current;
    
    this.setData({
      [`activeLogIndices.${groupIndex}`]: current
    });
    
    // 如果是当前活动的组，更新背景
    if (groupIndex === this.data.activeGroupIndex) {
      this.updateBackground();
    }
  },

  /**
   * 更新背景图片
   */
  updateBackground() {
    const { groupedLogs, activeGroupIndex, activeLogIndices } = this.data;
    
    if (groupedLogs.length === 0) return;
    
    const currentGroup = groupedLogs[activeGroupIndex];
    if (!currentGroup) return;
    
    const logIndex = activeLogIndices[activeGroupIndex] || 0;
    const currentLog = currentGroup.logs[logIndex];
    
    if (currentLog) {
      this.setData({
        backgroundImage: currentLog.imagePath || currentLog.imageUrl
      });
    }
  },

  /**
   * 点击卡片，进入编辑页
   */
  onCardTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/editor/editor?id=${id}`,
      fail: (err) => {
        console.error('[Home] 跳转编辑页失败:', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  /**
   * 点击添加按钮
   */
  onAddTap() {
    wx.navigateTo({
      url: '/pages/editor/editor',
      fail: (err) => {
        console.error('[Home] 跳转新建页失败:', err);
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
    console.warn('[Home] 图片加载失败:', e.detail);
    // 可以设置默认占位图
  }
});
