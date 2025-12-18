// pages/index/index.js
const app = getApp();
const storageService = require('../../services/storage.js');
const util = require('../../services/util.js');
const userService = require('../../services/user.js');

// 浏览状态存储键
const VIEW_STATE_KEY = 'home_view_state';

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,
    
    // 问候语
    greetingLine1: '',
    greetingLine2: '',
    
    // 用户信息
    userAvatar: '', // 用户头像
    isLogin: false, // 是否已登录
    
    // 分组后的记录数据
    groupedLogs: [], // [{date: '10.24', logs: [...]}]
    
    // Swiper索引
    activeGroupIndex: 0,
    activeLogIndices: {}, // {groupIndex: logIndex}
    
    // 背景图片
    backgroundImage: '',
    
    // 空状态
    isEmpty: false,
    
    // 是否首次加载
    isFirstLoad: true,
    
    // 手势相关
    touchStartX: 0,
    isDragging: false
  },

  onLoad() {
    // 获取导航栏高度
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      totalNavHeight: app.globalData.totalNavHeight
    });
    
    // 设置问候语
    const greeting = util.getGreeting();
    this.setData({
      greetingLine1: greeting.line1,
      greetingLine2: greeting.line2
    });
    
    // 加载用户信息
    this.loadUserInfo();
    
    // 首次加载数据，尝试恢复浏览状态
    this.loadData(true);
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
    
    // 刷新用户信息（可能在个人页登录了）
    this.loadUserInfo();
    
    // 非首次显示时，尝试恢复浏览状态
    if (!this.data.isFirstLoad) {
      this.loadData(true);
    } else {
      this.setData({ isFirstLoad: false });
    }
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = userService.getUserInfo();
    if (userInfo) {
      this.setData({
        userAvatar: userInfo.avatarUrl,
        isLogin: true
      });
    } else {
      this.setData({
        userAvatar: '',
        isLogin: false
      });
    }
  },

  onHide() {
    // 页面隐藏时保存浏览状态
    this.saveViewState();
  },

  onUnload() {
    // 页面卸载时保存浏览状态
    this.saveViewState();
  },

  /**
   * 保存浏览状态
   */
  saveViewState() {
    const { activeGroupIndex, activeLogIndices, groupedLogs } = this.data;
    
    if (groupedLogs.length === 0) return;
    
    try {
      wx.setStorageSync(VIEW_STATE_KEY, {
        activeGroupIndex,
        activeLogIndices,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[Home] 保存浏览状态失败:', err);
    }
  },

  /**
   * 恢复浏览状态
   */
  restoreViewState() {
    try {
      const state = wx.getStorageSync(VIEW_STATE_KEY);
      if (state) {
        // 检查状态是否过期（超过30分钟）
        const isExpired = Date.now() - state.timestamp > 30 * 60 * 1000;
        if (!isExpired) {
          return state;
        }
      }
    } catch (err) {
      console.error('[Home] 恢复浏览状态失败:', err);
    }
    return null;
  },

  /**
   * 加载并分组记录数据
   * @param {boolean} restorePosition - 是否恢复上次浏览位置
   */
  loadData(restorePosition = false) {
    const logs = storageService.getLogs();
    
    if (logs.length === 0) {
      this.setData({ 
        isEmpty: true,
        groupedLogs: []
      });
      return;
    }
    
    // 为每条记录生成基于createTime的显示时间（确保始终使用创建时间而不是更新时间）
    const processedLogs = logs.map(log => ({
      ...log,
      displayDate: util.formatDate(log.createTime),
      displayTime: util.formatTime(log.createTime)
    }));
    
    // 按日期分组（使用基于createTime的displayDate）
    const groupMap = {};
    processedLogs.forEach(log => {
      const date = log.displayDate;
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
        displayDate: date,
        logs: groupMap[date]
      }));
    
    // 初始化每组的活动索引
    let activeLogIndices = {};
    groupedLogs.forEach((group, index) => {
      activeLogIndices[index] = 0;
    });
    
    let activeGroupIndex = 0;
    
    // 尝试恢复浏览状态
    if (restorePosition) {
      const savedState = this.restoreViewState();
      if (savedState) {
        // 验证保存的索引是否有效
        if (savedState.activeGroupIndex < groupedLogs.length) {
          activeGroupIndex = savedState.activeGroupIndex;
        }
        // 恢复每组的卡片索引
        Object.keys(savedState.activeLogIndices || {}).forEach(key => {
          const idx = parseInt(key);
          if (idx < groupedLogs.length) {
            const cardIdx = savedState.activeLogIndices[key];
            if (cardIdx < groupedLogs[idx].logs.length) {
              activeLogIndices[idx] = cardIdx;
            }
          }
        });
      }
    }
    
    // 获取当前卡片作为背景
    const currentGroup = groupedLogs[activeGroupIndex];
    const currentLogIdx = activeLogIndices[activeGroupIndex] || 0;
    const currentLog = currentGroup?.logs[currentLogIdx];
    const backgroundImage = currentLog ? (currentLog.imagePath || currentLog.imageUrl) : '';
    
    this.setData({
      isEmpty: false,
      groupedLogs,
      activeLogIndices,
      backgroundImage,
      activeGroupIndex
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
   * 手势开始
   */
  onTouchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      isDragging: false
    });
  },

  /**
   * 手势移动
   */
  onTouchMove(e) {
    if (this.data.touchStartX !== 0) {
      const distance = Math.abs(e.touches[0].clientX - this.data.touchStartX);
      if (distance > 10 && !this.data.isDragging) {
        this.setData({ isDragging: true });
      }
    }
  },

  /**
   * 手势结束
   */
  onTouchEnd(e) {
    const { touchStartX, isDragging, activeGroupIndex, activeLogIndices, groupedLogs } = this.data;
    
    if (touchStartX === 0) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const groupIndex = parseInt(e.currentTarget.dataset.groupIndex);
    const currentGroup = groupedLogs[groupIndex];
    const maxIndex = currentGroup.logs.length - 1;
    const currentIndex = activeLogIndices[groupIndex] || 0;
    
    if (isLeftSwipe && currentIndex < maxIndex) {
      // 向左滑，查看下一张
      this.setData({
        [`activeLogIndices.${groupIndex}`]: currentIndex + 1
      });
      this.updateBackground();
    } else if (isRightSwipe && currentIndex > 0) {
      // 向右滑，查看上一张
      this.setData({
        [`activeLogIndices.${groupIndex}`]: currentIndex - 1
      });
      this.updateBackground();
    }
    
    // 重置状态
    setTimeout(() => {
      this.setData({
        touchStartX: 0,
        isDragging: false
      });
    }, 100);
  },

  /**
   * 点击卡片，进入编辑页
   */
  onCardTap(e) {
    // 如果正在拖动，不响应点击
    if (this.data.isDragging) return;
    
    const { id, offset } = e.currentTarget.dataset;
    
    // 只有当前卡片(offset === 0)才能点击进入编辑页
    if (offset !== 0) return;
    
    // 先保存当前状态
    this.saveViewState();
    
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
    // 先保存当前状态
    this.saveViewState();
    
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
    this.loadData(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    console.warn('[Home] 图片加载失败:', e.detail);
    // 可以设置默认占位图
  },

  /**
   * 防止事件冒泡
   */
  preventBubble() {
    // 空函数，用于阻止事件冒泡
  }
});
