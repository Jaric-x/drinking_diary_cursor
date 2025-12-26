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
    mockDataVersion: 'v5_dynamic_year',
    // 用户信息
    userInfo: null,
    isLogin: false
  },

  onLaunch() {
    console.log('[App] 微醺手记启动');
    
    // 初始化云开发
    this.initCloud();
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查存储权限
    this.checkStorageAuth();
    
    // 初始化测试数据（已禁用，生产环境不再加载 mock 数据）
    // this.initMockData();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 初始化云开发
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('[App] 请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    wx.cloud.init({
      env: 'cloud1-6ghdp0iubeb94db8',
      traceUser: true
    });
    
    console.log('[App] 云开发初始化完成');
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('user_info');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLogin = true;
        console.log('[App] 用户已登录:', userInfo.nickname);
      } else {
        console.log('[App] 用户未登录');
      }
    } catch (err) {
      console.error('[App] 检查登录状态失败:', err);
    }
  },

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    try {
      // 使用新的 API，降级到旧 API
      let statusBarHeight = 20;
      try {
        const windowInfo = wx.getWindowInfo();
        statusBarHeight = windowInfo.statusBarHeight || 20;
      } catch (e) {
        // 降级到旧 API
        const systemInfo = wx.getSystemInfoSync();
        statusBarHeight = systemInfo.statusBarHeight || 20;
      }
      
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
      // 使用默认值
      this.globalData.statusBarHeight = 20;
      this.globalData.navBarHeight = 44;
      this.globalData.totalNavHeight = 64;
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
   * 将 mock 数据关联到测试用户账号
   * 已禁用，生产环境不再加载 mock 数据
   */
  initMockData() {
    try {
      const { MOCK_NOTES } = require('./constants/mock-data.js');
      
      // 测试用户的 OpenID
      const TEST_USER_OPENID = 'ox5U-1w7Hp6gfsPofPY0srdA38K8';
      
      // 检查数据版本，如果版本不匹配，则重新加载测试数据
      const savedVersion = wx.getStorageSync('mock_data_version');
      const currentVersion = this.globalData.mockDataVersion;
      
      // 如果版本不匹配，重新加载测试数据
      if (savedVersion !== currentVersion) {
        console.log('[App] 加载测试数据 (版本:', currentVersion, ')');
        
        // 读取现有的所有数据（可能包含其他用户的数据）
        const allLogs = wx.getStorageSync('drinking_diary_logs') || [];
        
        // 移除测试用户的旧数据
        const otherUsersLogs = allLogs.filter(log => log.openid !== TEST_USER_OPENID);
        
        // 保存测试数据（添加 openid 字段）
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
          timeString: note.timeString,
          openid: TEST_USER_OPENID // 关联到测试用户
        }));
        
        // 合并其他用户的数据和测试数据
        const newAllLogs = [...otherUsersLogs, ...notesToSave];
        
        wx.setStorageSync('drinking_diary_logs', newAllLogs);
        wx.setStorageSync('mock_data_version', currentVersion);
        
        console.log('[App] 测试数据加载完成，共', notesToSave.length, '条记录，关联到用户:', TEST_USER_OPENID);
      } else {
        console.log('[App] 使用现有数据版本:', savedVersion);
      }
    } catch (err) {
      console.error('[App] 初始化测试数据失败:', err);
    }
  }
});
