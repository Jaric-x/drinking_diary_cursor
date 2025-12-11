// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    tabs: [
      {
        key: 'home',
        pagePath: '/pages/index/index',
        icon: String.fromCodePoint(0x1020c) // icon-shouye (使用 fromCodePoint)
      },
      {
        key: 'profile',
        pagePath: '/pages/profile/profile',
        icon: String.fromCodePoint(0x1020a) // icon-wode (使用 fromCodePoint)
      }
    ]
  },

  methods: {
    /**
     * 切换Tab
     */
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      
      // 如果是当前页面，不执行跳转
      if (this.data.selected === index) {
        return;
      }
      
      this.setData({ selected: index });
      
      wx.switchTab({
        url: path
      });
    },

    /**
     * 打开编辑页（新建记录）
     */
    openEditor() {
      wx.navigateTo({
        url: '/pages/editor/editor'
      });
    }
  }
});

