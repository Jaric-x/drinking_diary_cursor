# 开发文档

## 开发环境配置

### 必需工具
- 微信开发者工具（最新稳定版）
- 基础库版本：>= 3.0.0
- 渲染引擎：Skyline

### 项目配置
项目使用了以下关键配置：

```json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "navigationStyle": "custom"
}
```

## 核心功能实现

### 1. 双向Swiper实现

首页使用嵌套Swiper实现二维导航：

```xml
<!-- 外层：垂直Swiper（日期分组） -->
<swiper vertical="{{true}}" bindchange="onVerticalChange">
  <swiper-item wx:for="{{groupedLogs}}">
    <!-- 内层：水平Swiper（同日期记录） -->
    <swiper previous-margin="80rpx" next-margin="80rpx">
      <swiper-item wx:for="{{group.logs}}">
        <!-- 卡片内容 -->
      </swiper-item>
    </swiper>
  </swiper-item>
</swiper>
```

### 2. 图片持久化流程

```javascript
// 1. 选择图片
wx.chooseMedia({
  success: async (res) => {
    const tempPath = res.tempFiles[0].tempFilePath;
    
    // 2. 压缩图片
    const compressed = await fileService.compressImage(tempPath, 80);
    
    // 3. 保存到永久目录
    const savedPath = await fileService.saveImage(compressed);
    
    // 4. 存储路径到数据模型
    this.setData({ imagePath: savedPath });
  }
});
```

### 3. 数据分组逻辑

```javascript
// 按日期分组记录
const groupMap = {};
logs.forEach(log => {
  const date = log.dateString; // "MM.DD"
  if (!groupMap[date]) {
    groupMap[date] = [];
  }
  groupMap[date].push(log);
});

// 转换为数组
const groupedLogs = Object.keys(groupMap).map(date => ({
  date,
  logs: groupMap[date]
}));
```

### 4. 自定义TabBar状态同步

每个TabBar页面需在 `onShow` 中更新选中状态：

```javascript
onShow() {
  if (typeof this.getTabBar === 'function' && this.getTabBar()) {
    this.getTabBar().setData({
      selected: 0 // 0=首页, 1=个人页
    });
  }
}
```

## 样式系统

### CSS变量定义

所有颜色、圆角、阴影等统一在 `styles/variables.wxss` 中定义：

```css
--color-primary: #007AFF;
--radius-card: 32rpx;
--shadow-card: 0 16rpx 40rpx rgba(0, 0, 0, 0.08);
```

### 原子化样式类

常用样式类在 `styles/common.wxss` 中定义：

```css
.flex-center { display: flex; justify-content: center; align-items: center; }
.text-primary { color: var(--color-primary); }
.shadow-card { box-shadow: var(--shadow-card); }
```

## 异常处理

### 1. 图片上传失败

```javascript
try {
  const savedPath = await fileService.saveImage(tempPath);
  this.setData({ imagePath: savedPath });
} catch (err) {
  wx.showToast({ title: '图片上传失败', icon: 'none' });
}
```

### 2. 存储空间不足

```javascript
try {
  wx.setStorageSync(key, data);
} catch (err) {
  if (err.errMsg.includes('exceed')) {
    wx.showToast({ 
      title: '存储空间不足，请清理数据', 
      icon: 'none' 
    });
  }
}
```

### 3. 数据读取失败

```javascript
try {
  const logs = wx.getStorageSync(STORAGE_KEY_LOGS);
  return logs || [];
} catch (err) {
  console.error('读取失败:', err);
  return []; // 返回空数组作为降级方案
}
```

## 性能优化

### 1. 图片懒加载

```xml
<image lazy-load="{{true}}" src="{{imageUrl}}" />
```

### 2. 列表虚拟化

对于大量数据，首页Swiper仅渲染当前可见区域前后各1组数据。

### 3. 图片压缩

上传前自动压缩图片到80%质量，限制文件大小 < 2MB。

## 调试技巧

### 1. 查看存储数据

在控制台执行：

```javascript
const logs = wx.getStorageSync('drinking_diary_logs');
console.log(logs);
```

### 2. 清空所有数据

```javascript
const storageService = require('./services/storage.js');
storageService.clearAll();
```

### 3. 重新加载测试数据

删除所有记录后，重启小程序会自动加载测试数据。

## 常见问题

### Q1: 图片显示不出来？
**A**: 检查图片路径是否已持久化到 `wx.env.USER_DATA_PATH`，临时路径会在小程序关闭后失效。

### Q2: TabBar不显示？
**A**: 确保 `app.json` 中配置了 `"custom": true`，并且 `custom-tab-bar` 目录存在。

### Q3: Swiper滑动不流畅？
**A**: 检查是否设置了 `duration` 和 `easing-function`，避免在 `bindchange` 中执行耗时操作。

### Q4: 数据保存后首页没更新？
**A**: 确保在 `onShow` 中调用了 `this.loadData()` 重新加载数据。

## 代码规范

### 1. 命名规范
- 文件名：小写字母 + 连字符（如 `storage.js`）
- 函数名：驼峰命名（如 `loadData`）
- 常量：大写字母 + 下划线（如 `STORAGE_KEY_LOGS`）

### 2. 注释规范
- 所有函数必须有JSDoc注释
- 复杂逻辑必须添加行内注释
- 关键配置必须说明用途

### 3. 错误处理
- 所有异步操作必须使用 try-catch
- 用户可感知的错误必须显示Toast提示
- 所有错误必须打印到控制台

## 发布检查清单

- [ ] 移除所有 console.log（保留 console.error）
- [ ] 移除测试数据初始化代码（app.js 中的 initMockData）
- [ ] 检查所有图片资源是否正确引用
- [ ] 测试所有页面跳转和返回逻辑
- [ ] 测试数据的增删改查功能
- [ ] 测试异常情况处理
- [ ] 检查隐私协议和用户授权
- [ ] 压缩代码和资源文件
- [ ] 提交代码审核

## 技术支持

如遇到问题，请检查：
1. 微信开发者工具版本是否为最新
2. 基础库版本是否 >= 3.0.0
3. 是否启用了Skyline渲染引擎
4. 控制台是否有报错信息

