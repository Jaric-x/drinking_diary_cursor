// app.js
App({
  globalData: {
    // 系统信息
    statusBarHeight: 20, // 状态栏高度
    navBarHeight: 44, // 导航栏高度
    totalNavHeight: 64, // 总导航高度
    // 全局数据标记
    needRefresh: false,
    // Mock数据版本（修改测试数据时更新此值）
    mockDataVersion: 'v5_dynamic_year'
  },

  onLaunch() {
    console.log('[App] 微醺笔记启动');
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查存储权限
    this.checkStorageAuth();
    
    // 初始化测试数据（仅开发阶段）
    this.initMockData();
  },

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      const navBarHeight = 44; // 导航栏标准高度
      
      this.globalData.statusBarHeight = statusBarHeight;
      this.globalData.navBarHeight = navBarHeight;
      this.globalData.totalNavHeight = statusBarHeight + navBarHeight;
      
      console.log('[App] 系统信息:', {
        statusBarHeight,
        navBarHeight,
        totalNavHeight: this.globalData.totalNavHeight
      });
    } catch (err) {
      console.error('[App] 获取系统信息失败:', err);
    }
  },

  /**
   * 检查存储权限
   */
  checkStorageAuth() {
    try {
      wx.getStorageInfoSync();
      console.log('[App] 存储权限正常');
    } catch (err) {
      console.error('[App] 存储权限异常:', err);
      wx.showModal({
        title: '提示',
        content: '应用需要存储权限才能正常使用',
        showCancel: false
      });
    }
  },

  /**
   * 初始化测试数据（开发阶段使用）
   */
  initMockData() {
    try {
      const storageService = require('./services/storage.js');
      const { MOCK_NOTES } = require('./constants/mock-data.js');
      
      // 检查数据版本，如果版本不匹配或没有数据，则加载测试数据
      const savedVersion = wx.getStorageSync('mock_data_version');
      const currentVersion = this.globalData.mockDataVersion;
      
      const logs = storageService.getLogs();
      
      // 如果版本不匹配或没有数据，重新加载测试数据
      if (savedVersion !== currentVersion || logs.length === 0) {
        console.log('[App] 加载测试数据 (版本:', currentVersion, ')');
        
        // 清空旧数据
        if (savedVersion !== currentVersion) {
          wx.removeStorageSync('drinking_diary_logs');
          wx.removeStorageSync('drinking_diary_tags');
          console.log('[App] 清除旧版本数据');
        }
        
        // 保存测试数据
        const notesToSave = MOCK_NOTES.map(note => ({
          id: note.id,
          name: note.name,
          rating: note.rating,
          imagePath: note.imageUrl,
          imageUrl: note.imageUrl,
          location: note.location,
          price: note.price,
          notes: note.notes,
          tags: note.tags,
          createTime: note.createTime,
          updateTime: note.updateTime,
          dateString: note.dateString,
          timeString: note.timeString
        }));
        
        wx.setStorageSync('drinking_diary_logs', notesToSave);
        wx.setStorageSync('mock_data_version', currentVersion);
        
        console.log('[App] 测试数据加载完成，共', notesToSave.length, '条记录');
      } else {
        console.log('[App] 使用现有数据，共', logs.length, '条记录');
      }
    } catch (err) {
      console.error('[App] 初始化测试数据失败:', err);
    }
  }
});
