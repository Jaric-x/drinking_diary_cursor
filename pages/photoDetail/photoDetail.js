// pages/photoDetail/photoDetail.js
const app = getApp();
const storageService = require('../../services/storage.js');
const util = require('../../services/util.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 52,
    totalNavHeight: 72,

    // 图标字符
    icons: {
      fanhui: String.fromCharCode(0xe6dc),      // 返回
      weixin: String.fromCharCode(0xe600),       // 微信（新版 icon-weixintubiao1-copy）
      xiazai: String.fromCharCode(0xe63c),       // 下载
      close: String.fromCharCode(0xe605)         // 关闭（icon-icon-close）
    },

    // 笔记列表（所有笔记，按照照片墙顺序）
    notes: [],
    
    // 当前显示的笔记索引
    currentIndex: 0,
    
    // 当前笔记详情
    currentNote: null,

    // 分享海报相关
    showShareModal: false,
    posterWidth: 320,  // 海报宽度（单位：px）固定320px
    posterHeight: 520, // 海报高度（单位：px）增加高度以适应更大的落款区
    qrCodeUrl: '',     // 小程序码 URL
    posterImagePath: '', // 生成的海报图片临时路径
    
    // 数据加载状态
    dataLoaded: false
  },

  onLoad(options) {
    // 初始化导航栏高度
    this.initNavBarHeight();

    // 获取传入的笔记 ID
    const noteId = options.id;
    if (!noteId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 保存笔记 ID 供后续使用
    this.noteId = noteId;

    // 加载所有笔记数据
    this.loadNotes(noteId);
  },

  /**
   * 页面显示时刷新数据（从编辑器返回时会触发）
   */
  onShow() {
    // 如果页面已经加载过数据，则刷新
    if (this.data.dataLoaded && this.noteId) {
      console.log('[PhotoDetail] 页面显示，刷新数据');
      this.loadNotes(this.noteId);
    }
  },

  /**
   * 初始化导航栏高度
   */
  initNavBarHeight() {
    try {
      const globalData = (app && app.globalData) || {};
      const statusBarHeight = globalData.statusBarHeight || 20;
      const navBarHeight = 52; // 标准 iOS 导航栏高度 52px
      const totalNavHeight = statusBarHeight + navBarHeight;
      
      this.setData({
        statusBarHeight,
        navBarHeight,
        totalNavHeight
      });
    } catch (err) {
      console.error('[PhotoDetail] 初始化导航栏高度失败:', err);
    }
  },

  /**
   * 加载笔记数据
   * @param {string} currentNoteId - 当前要显示的笔记 ID
   */
  loadNotes(currentNoteId) {
    // 获取所有笔记（按照照片墙顺序 - 创建时间倒序）
    const allNotes = storageService.getLogs();
    
    if (!allNotes || allNotes.length === 0) {
      wx.showToast({ title: '暂无笔记', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 查找当前笔记的索引
    const currentIndex = allNotes.findIndex(note => note.id === currentNoteId);
    
    if (currentIndex === -1) {
      wx.showToast({ title: '笔记不存在', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      notes: allNotes,
      currentIndex,
      currentNote: allNotes[currentIndex],
      dataLoaded: true  // 数据加载完成
    });
  },

  /**
   * Swiper 切换事件
   */
  onSwiperChange(e) {
    const { current } = e.detail;
    this.setData({
      currentIndex: current,
      currentNote: this.data.notes[current]
    });
  },

  /**
   * 图片加载完成
   */
  onImageLoad(e) {
    console.log('[PhotoDetail] 图片加载成功');
  },

  /**
   * 图片加载失败
   */
  onImageError(e) {
    console.error('[PhotoDetail] 图片加载失败:', e);
    wx.showToast({ title: '图片加载失败', icon: 'none' });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/profile/profile' });
      }
    });
  },

  /**
   * 编辑笔记
   */
  onEdit() {
    const { currentNote } = this.data;
    if (!currentNote) return;

    wx.navigateTo({
      url: `/pages/editor/editor?id=${currentNote.id}`,
      fail: (err) => {
        console.error('[PhotoDetail] 跳转编辑页失败:', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  /**
   * 分享图片
   */
  async onShare() {
    const { currentNote } = this.data;
    if (!currentNote) return;

    try {
      wx.showLoading({ title: '生成海报中...', mask: true });

      // 获取小程序码
      await this.fetchQRCode();

      // 显示分享弹窗
      this.setData({ showShareModal: true });

      // 延迟绘制海报（等待弹窗动画完成）
      setTimeout(() => {
        this.drawPoster();
      }, 100);

    } catch (err) {
      console.error('[PhotoDetail] 生成海报失败:', err);
      wx.showToast({ title: '生成海报失败', icon: 'none' });
      wx.hideLoading();
    }
  },

  /**
   * 获取小程序码 - 使用静态图片
   */
  async fetchQRCode() {
    try {
      // 使用静态小程序码图片（位于 static/qrcode.png）
      this.setData({ qrCodeUrl: '/static/qrcode.png' });
    } catch (err) {
      console.error('[PhotoDetail] 加载小程序码失败:', err);
      this.setData({ qrCodeUrl: '' });
    }
  },

  /**
   * 绘制海报
   */
  async drawPoster() {
    try {
      const { currentNote, posterWidth, posterHeight, qrCodeUrl } = this.data;
      
      // 获取 Canvas 实例
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res || !res[0]) {
            console.error('[PhotoDetail] 获取 Canvas 失败');
            wx.hideLoading();
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置 Canvas 尺寸（使用物理像素）
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = posterWidth * dpr;
          canvas.height = posterHeight * dpr;
          ctx.scale(dpr, dpr);

          // 绘制白色圆角背景
          const borderRadius = 24;
          ctx.fillStyle = '#FFFFFF';
          this.drawRoundRect(ctx, 0, 0, posterWidth, posterHeight, borderRadius);
          ctx.fill();
          
          // 裁剪为圆角矩形区域，后续绘制都在这个区域内
          this.drawRoundRect(ctx, 0, 0, posterWidth, posterHeight, borderRadius);
          ctx.clip();

          // 全局统一内边距 24px
          const padding = 24;
          
          // 1. 绘制图片区（1:1 正方形，顶端对齐，object-cover）
          const imageSize = posterWidth; // 图片宽度等于海报宽度
          const imageTop = 0;
          const imageLeft = 0;
          
          // 处理图片路径（云存储路径需要转换为临时路径）
          const imagePath = await this.getImageTempPath(currentNote.imagePath || currentNote.imageUrl);
          await this.drawImage(ctx, imagePath, imageLeft, imageTop, imageSize, imageSize, canvas, 'cover');

          // 2. 内容区：从图片底部开始，padding 24px
          const contentTop = imageSize + padding;
          
          // 2.1 主标题（酒名）- 水平居中，字号 24px
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const titleTop = contentTop;
          ctx.fillText(currentNote.name || '未命名', posterWidth / 2, titleTop);

          // 2.2 评分（五星）- 水平居中，星星 12px，间距增加
          const starTop = titleTop + 28 + 12; // 标题行高（24px + 4px baseline） + 间距
          await this.drawStars(ctx, currentNote.rating || 0, posterWidth / 2, starTop);

          // 2.3 分割线
          const separatorTop = starTop + 16 + 24; // 评分高度（12px + 4px） + 间距
          ctx.strokeStyle = '#F2F2F7';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, separatorTop);
          ctx.lineTo(posterWidth - padding, separatorTop);
          ctx.stroke();

          // 3. 品牌区（分割线下方，整体增高）
          const brandTop = separatorTop + 26; // 进一步增加间距
          
          // 3.1 左侧文字栈
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 16px sans-serif'; // 字号改为 16px
          ctx.textAlign = 'left';
          ctx.letterSpacing = '0.2em';
          ctx.fillText('微醺手记', padding, brandTop);
          
          ctx.fillStyle = '#999999';
          ctx.font = '12px sans-serif'; // 字号改为 12px
          ctx.letterSpacing = 'normal';
          ctx.fillText('记录每一次微醺时刻', padding, brandTop + 30); // 调整行间距

          // 3.2 右侧小程序码（60x60px）
          if (qrCodeUrl) {
            const qrSize = 60;
            const qrLeft = posterWidth - qrSize - padding;
            const qrTop = brandTop - 10;
            
            // 直接绘制小程序码图片，无黑色背景
            const qrTempPath = await this.getImageTempPath(qrCodeUrl);
            await this.drawImage(ctx, qrTempPath, qrLeft, qrTop, qrSize, qrSize, canvas);
          }

          // 5. 将 Canvas 转换为图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (res) => {
              console.log('[PhotoDetail] 海报生成成功:', res.tempFilePath);
              this.setData({ posterImagePath: res.tempFilePath });
              wx.hideLoading();
            },
            fail: (err) => {
              console.error('[PhotoDetail] Canvas 转图片失败:', err);
              wx.hideLoading();
              wx.showToast({ title: '生成图片失败', icon: 'none' });
            }
          }, this);
        });

    } catch (err) {
      console.error('[PhotoDetail] 绘制海报失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '绘制海报失败', icon: 'none' });
    }
  },

  /**
   * 获取图片临时路径（处理云存储路径）
   * @param {string} path - 图片路径
   * @returns {Promise<string>} 临时路径
   */
  async getImageTempPath(path) {
    if (!path) {
      throw new Error('图片路径为空');
    }

    // 如果是云存储路径，需要转换为临时路径
    if (path.startsWith('cloud://')) {
      try {
        console.log('[PhotoDetail] 转换云存储路径:', path);
        
        // 方法1：使用 wx.cloud.getTempFileURL（推荐）
        const result = await wx.cloud.getTempFileURL({
          fileList: [path]
        });

        if (result.fileList && result.fileList.length > 0) {
          const tempFileURL = result.fileList[0].tempFileURL;
          console.log('[PhotoDetail] 云存储路径转换成功:', tempFileURL);
          return tempFileURL;
        } else {
          throw new Error('获取临时路径失败');
        }
      } catch (err) {
        console.error('[PhotoDetail] 云存储路径转换失败:', err);
        
        // 方法2：使用 wx.getImageInfo 作为备用方案
        try {
          const imageInfo = await wx.getImageInfo({ src: path });
          console.log('[PhotoDetail] 使用 getImageInfo 获取路径成功');
          return imageInfo.path;
        } catch (err2) {
          console.error('[PhotoDetail] getImageInfo 也失败了:', err2);
          throw new Error('无法加载图片');
        }
      }
    }

    // 如果是本地路径或 HTTP 路径，直接返回
    return path;
  },

  /**
   * 在 Canvas 上绘制图片（支持 cover 和 contain）
   */
  drawImage(ctx, src, x, y, width, height, canvas, fit = 'cover') {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      img.onload = () => {
        if (fit === 'cover') {
          // object-fit: cover - 填充整个区域，裁剪多余部分
          const imgAspect = img.width / img.height;
          const targetAspect = width / height;
          
          let sx, sy, sWidth, sHeight;
          
          if (imgAspect > targetAspect) {
            // 图片更宽，按高度缩放
            sHeight = img.height;
            sWidth = sHeight * targetAspect;
            sx = (img.width - sWidth) / 2;
            sy = 0;
          } else {
            // 图片更高，按宽度缩放
            sWidth = img.width;
            sHeight = sWidth / targetAspect;
            sx = 0;
            sy = (img.height - sHeight) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
        } else {
          // object-fit: contain - 完整显示
          ctx.drawImage(img, x, y, width, height);
        }
        resolve();
      };
      img.onerror = () => {
        console.error('[PhotoDetail] 图片加载失败:', src);
        // 绘制占位符
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(x, y, width, height);
        resolve(); // 继续执行
      };
      img.src = src;
    });
  },

  /**
   * 绘制五星评分（居中对齐）
   */
  async drawStars(ctx, rating, centerX, y) {
    const starSize = 12;
    const starGap = 4;
    const totalWidth = starSize * 5 + starGap * 4;
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < 5; i++) {
      const starX = startX + (starSize + starGap) * i;
      const filled = i < rating;
      
      ctx.fillStyle = filled ? '#FFD700' : '#E0E0E0';
      ctx.beginPath();
      this.drawStar(ctx, starX + starSize / 2, y + starSize / 2, starSize / 2, 5, 0.5);
      ctx.fill();
    }
  },

  /**
   * 绘制五角星路径
   */
  drawStar(ctx, cx, cy, outerRadius, points, innerRadiusRatio) {
    const innerRadius = outerRadius * innerRadiusRatio;
    const angle = Math.PI / points;
    
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? innerRadius : outerRadius;
      const x = cx + radius * Math.sin(angle * (i + 1));
      const y = cy - radius * Math.cos(angle * (i + 1));
      ctx.lineTo(x, y);
    }
    
    ctx.closePath();
  },
  
  /**
   * 绘制圆角矩形
   */
  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  /**
   * 保存图片到相册
   */
  async onSaveImage() {
    const { posterImagePath } = this.data;
    
    if (!posterImagePath) {
      wx.showToast({ title: '图片未生成', icon: 'none' });
      return;
    }

    try {
      // 保存图片到相册
      await wx.saveImageToPhotosAlbum({
        filePath: posterImagePath
      });
      
      wx.showToast({ 
        title: '已保存到相册', 
        icon: 'success',
        duration: 2000
      });
      
      // 保存成功后不关闭弹窗，让用户停留在海报界面
      
    } catch (err) {
      console.error('[PhotoDetail] 保存图片失败:', err);
      
      // 如果是权限问题，引导用户授权
      if (err.errMsg && err.errMsg.includes('auth')) {
        wx.showModal({
          title: '需要相册权限',
          content: '保存图片需要相册权限，是否前往设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    }
  },

  /**
   * 分享给朋友（小程序卡片）
   */
  onShareAppMessage() {
    const { currentNote } = this.data;
    return {
      title: `${currentNote.name || '未命名'} - 我的微醺时刻`,
      path: `/pages/index/index`,  // 分享后进入小程序首页
      imageUrl: currentNote.imagePath || currentNote.imageUrl
    };
  },

  /**
   * 关闭分享弹窗
   */
  onCloseShareModal() {
    console.log('[PhotoDetail] 关闭分享弹窗');
    
    // 清除 Canvas 内容
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas')
      .fields({ node: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    
    // 关闭弹窗并清除状态
    this.setData({ 
      showShareModal: false,
      posterImagePath: ''
    });
  },

  /**
   * 阻止弹窗内容点击冒泡
   */
  onModalContentTap() {
    // 阻止事件冒泡
  }
});
