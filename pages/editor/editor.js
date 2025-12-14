// pages/editor/editor.js
const app = getApp();
const storageService = require('../../services/storage.js');
const fileService = require('../../services/file.js');
const util = require('../../services/util.js');
const { PRESET_TAGS } = require('../../constants/tags.js');

Page({
  data: {
    // 导航栏高度
    statusBarHeight: 20,
    navBarHeight: 44,
    totalNavHeight: 64,

    // 图标字符
    icons: {
      qianbi: String.fromCharCode(0xe6da),   // 铅笔
      dianzan: String.fromCharCode(0xe6d7),  // 点赞
      dingwei: String.fromCharCode(0xe6d9),  // 定位
      kaquan: String.fromCharCode(0xe6d8),   // 卡券
      kanjia: String.fromCharCode(0xe6db)    // 砍价（标签）
    },
    
    // 页面模式
    isEditing: false,
    editId: null,
    
    // 表单数据
    imageUrl: '',
    imagePath: '', // 本地永久路径
    name: '',
    rating: 0,
    location: '',
    price: '',
    notes: '',
    
    // 标签
    presetTags: PRESET_TAGS,
    selectedTags: [],
    customTags: [], // 自定义标签列表
    tagSelectedMap: {}, // 标签选中状态映射 {tagName: true/false}
    customTag: '',
    
    // UI状态
    showCustomTagInput: false,
    isSubmitting: false
  },

  onLoad(options) {
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
      console.error('[Editor] 初始化导航栏高度失败:', err);
      // 使用默认值
      this.setData({
        statusBarHeight: 20,
        navBarHeight: 44,
        totalNavHeight: 64
      });
    }
    
    // 检查是否是编辑模式
    if (options.id) {
      this.setData({ isEditing: true, editId: options.id });
      this.loadLogData(options.id);
    }
  },

  /**
   * 加载记录数据（编辑模式）
   */
  loadLogData(id) {
    const log = storageService.getLogById(id);
    if (log) {
      this.setData({
        imageUrl: log.imagePath || log.imageUrl,
        imagePath: log.imagePath || '',
        name: log.name || '',
        rating: log.rating || 0,
        location: log.location || '',
        price: log.price ? String(log.price) : '',
        notes: log.notes || '',
        selectedTags: log.tags || []
      }, () => {
        // 更新标签选中状态映射，确保选中态正确显示
        this.updateTagSelectedMap();
      });
    } else {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        const fileSize = res.tempFiles[0].size;
        
        // 检查文件大小（2MB限制）
        if (fileSize > 2 * 1024 * 1024) {
          wx.showToast({ title: '图片过大，请重新选择', icon: 'none' });
          return;
        }
        
        // 先显示预览
        this.setData({ imageUrl: tempPath });
        
        try {
          // 压缩并保存图片
          wx.showLoading({ title: '处理中...', mask: true });
          const compressedPath = await fileService.compressImage(tempPath, 80);
          const savedPath = await fileService.saveImage(compressedPath);
          
          this.setData({
            imageUrl: savedPath,
            imagePath: savedPath
          });
          
          wx.hideLoading();
        } catch (err) {
          console.error('图片处理失败:', err);
          wx.hideLoading();
          wx.showToast({ title: '图片上传失败', icon: 'none' });
        }
      }
    });
  },

  /**
   * 输入酒名
   */
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  /**
   * 选择评分
   */
  onRatingTap(e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    this.setData({ rating });
  },

  /**
   * 输入地点
   */
  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  /**
   * 输入价格
   */
  onPriceInput(e) {
    this.setData({ price: e.detail.value });
  },

  /**
   * 输入笔记
   */
  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  /**
   * 更新标签选中状态映射
   */
  updateTagSelectedMap() {
    const { selectedTags, presetTags } = this.data;
    const tagSelectedMap = {};
    const customTags = [];
    
    selectedTags.forEach(tag => {
      tagSelectedMap[tag] = true;
      // 如果不是预设标签，则加入自定义标签列表
      if (presetTags.indexOf(tag) < 0) {
        customTags.push(tag);
      }
    });
    
    this.setData({ tagSelectedMap, customTags });
  },

  /**
   * 切换标签选中状态
   */
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    let selectedTags = [...this.data.selectedTags]; // 创建新数组
    
    const index = selectedTags.indexOf(tag);
    if (index >= 0) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tag);
    }
    
    this.setData({ selectedTags }, () => {
      this.updateTagSelectedMap();
    });
  },

  /**
   * 显示自定义标签输入
   */
  showCustomInput() {
    this.setData({ showCustomTagInput: true });
  },

  /**
   * 输入自定义标签
   */
  onCustomTagInput(e) {
    // maxlength 属性已经限制了输入长度，这里直接使用即可
    this.setData({ customTag: e.detail.value });
  },

  /**
   * 添加自定义标签
   */
  addCustomTag() {
    const { customTag } = this.data;
    const trimmedTag = customTag.trim();
    
    if (!trimmedTag) {
      wx.showToast({ title: '请输入标签名称', icon: 'none' });
      return;
    }
    
    // 检查是否已存在
    const selectedTags = [...this.data.selectedTags];
    if (selectedTags.indexOf(trimmedTag) >= 0) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    
    selectedTags.push(trimmedTag);
    
    this.setData({
      selectedTags,
      customTag: '',
      showCustomTagInput: false
    }, () => {
      this.updateTagSelectedMap();
    });
    
    // 保存到用户标签库
    storageService.addUserTag(trimmedTag);
  },

  /**
   * 取消自定义标签输入
   */
  cancelCustomInput() {
    this.setData({
      customTag: '',
      showCustomTagInput: false
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { imagePath, imageUrl, name, rating } = this.data;
    
    // 编辑模式下，imageUrl可能是网络图片
    if (!imagePath && !imageUrl) {
      wx.showToast({ title: '请上传照片', icon: 'none' });
      return false;
    }
    
    if (!name || name.trim() === '') {
      wx.showToast({ title: '请输入酒品名称', icon: 'none' });
      return false;
    }
    
    if (rating === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return false;
    }
    
    return true;
  },

  /**
   * 保存记录
   */
  async onSave() {
    if (this.data.isSubmitting) return;
    
    // 验证表单
    if (!this.validateForm()) return;
    
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '保存中...', mask: true });
    
    try {
      const { isEditing, editId, imagePath, imageUrl, name, rating, location, price, notes, selectedTags } = this.data;
      
      const log = {
        id: isEditing ? editId : util.generateId(),
        name: name.trim(),
        rating: rating,
        imagePath: imagePath || imageUrl,
        imageUrl: imagePath || imageUrl,
        location: location.trim(),
        price: price ? parseFloat(price) : undefined,
        notes: notes.trim(),
        tags: selectedTags
      };
      
      await storageService.saveLog(log);
      
      wx.hideLoading();
      wx.showToast({ 
        title: isEditing ? '更新成功' : '保存成功', 
        icon: 'success',
        duration: 1500
      });
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (err) {
      console.error('保存失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      this.setData({ isSubmitting: false });
    }
  },

  /**
   * 删除记录
   */
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          
          try {
            await storageService.deleteLog(this.data.editId);
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            console.error('删除失败:', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 返回/取消
   */
  onCancel() {
    const { isEditing, name, rating, imagePath } = this.data;
    
    // 检查是否有未保存的修改
    const hasChanges = !isEditing && (name || rating > 0 || imagePath);
    
    if (hasChanges) {
      wx.showModal({
        title: '确认退出',
        content: '当前有未保存的内容，确定要退出吗？',
        confirmText: '退出',
        confirmColor: '#FF3B30',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 页面卸载时的清理
   */
  onUnload() {
    // 如果有未保存的临时图片，可以在这里清理
    // 但为了用户体验，我们保留图片直到真正保存
  }
});
