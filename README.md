# 微醺笔记 (Drinking Diary)

一款专注于个人酒品记录的微信小程序，帮助用户记录每一杯喝过或调制过的酒，建立个人的酒品档案库。

## 📱 功能特性

### 核心功能
- ✅ **创建记录**：拍照/选图，记录酒品名称、评分、地点、价格、标签和品鉴笔记
- ✅ **首页浏览**：双向Swiper交互，纵向按日期浏览，横向切换同日记录
- ✅ **个人酒库**：统计总杯数、总花费、记录天数，照片墙展示所有记录
- ✅ **编辑删除**：支持编辑已有记录和删除功能
- ✅ **本地存储**：所有数据存储在本地，无需网络，保护隐私

### 设计特色
- 🎨 **iOS风格**：遵循iOS设计规范，毛玻璃效果、流畅动画
- 🌈 **动态背景**：首页背景随当前卡片图片变化，营造沉浸式体验
- 🏷️ **智能标签**：9个预设标签（甜味、酸味、苦味、辛辣、果香、花香、坚果味、焦糖味、烟熏味）+ 自定义标签
- ⭐ **评分系统**：5星评分，直观记录喜好程度

## 🏗️ 技术架构

### 技术栈
- **框架**：微信小程序原生框架 (Skyline渲染引擎)
- **存储**：wx.storage (本地存储) + FileSystemManager (图片持久化)
- **样式**：原子化CSS + CSS变量系统

### 目录结构
```
miniprogram/
├── pages/              # 页面
│   ├── index/          # 首页
│   ├── editor/         # 编辑页
│   └── profile/        # 个人页
├── services/           # 业务服务
│   ├── storage.js      # 数据存储
│   ├── file.js         # 文件管理
│   └── util.js         # 工具函数
├── constants/          # 常量配置
│   ├── tags.js         # 预设标签
│   └── mock-data.js    # 测试数据
├── styles/             # 全局样式
│   ├── variables.wxss  # CSS变量
│   └── common.wxss     # 原子化样式
├── custom-tab-bar/     # 自定义TabBar
├── app.js
├── app.json
└── app.wxss
```

### 数据模型
```javascript
{
  id: string,              // 唯一ID
  name: string,            // 酒品名称（必填）
  rating: number,          // 评分 1-5（必填）
  imagePath: string,       // 本地图片路径（必填）
  location: string,        // 地点（可选）
  price: number,           // 价格（可选）
  notes: string,           // 品鉴笔记（可选）
  tags: string[],          // 标签数组
  createTime: number,      // 创建时间戳
  updateTime: number,      // 更新时间戳
  dateString: string,      // 格式化日期 "MM.DD"
  timeString: string       // 格式化时间 "HH:mm"
}
```

## 🚀 快速开始

### 环境要求
- 微信开发者工具 (最新版)
- 基础库版本 >= 3.0.0

### 运行步骤
1. 使用微信开发者工具打开项目
2. 编译运行
3. 首次启动会自动加载测试数据（5条示例记录）

### 测试数据
项目内置了5条测试数据，包含：
- Old Fashioned
- Manhattan
- Vesper Martini
- Negroni Sbagliato
- Highball

可在 `constants/mock-data.js` 中查看或修改。

## 📖 使用说明

### 创建记录
1. 点击底部中间的蓝色 **+** 按钮
2. 上传酒品照片（必填）
3. 填写酒品名称（必填）
4. 选择评分（必填）
5. 填写地点、价格（可选）
6. 选择标签或添加自定义标签
7. 记录品鉴笔记（可选）
8. 点击底部 **保存笔记** 按钮

### 浏览记录
- **纵向滑动**：切换不同日期的记录
- **横向滑动**：切换同一天的多条记录
- **点击卡片**：进入编辑页查看详情

### 编辑/删除
1. 在首页或个人页点击记录
2. 进入编辑页修改信息
3. 点击 **保存修改** 更新记录
4. 点击右上角垃圾桶图标删除记录

### 查看统计
1. 点击底部右侧 **个人** 图标
2. 查看总杯数、总花费、本月记录天数
3. 浏览照片墙，点击照片进入详情

## 🎨 设计规范

### 色彩体系
- 品牌蓝：`#007AFF`
- 背景灰：`#F2F2F7`
- 评分橙：`#FF9500`
- 危险红：`#FF3B30`

### 圆角规范
- 卡片圆角：`32rpx` (16px)
- 按钮圆角：`24rpx` (12px)
- 标签圆角：`999rpx` (Pill shape)

### 阴影规范
- 卡片阴影：`0 16rpx 40rpx rgba(0, 0, 0, 0.08)`
- 悬浮阴影：`0 8rpx 24rpx rgba(0, 0, 0, 0.15)`

## 🔧 开发说明

### 服务层说明

#### StorageService (services/storage.js)
- `getLogs()` - 获取所有记录
- `getLogById(id)` - 获取单条记录
- `saveLog(log)` - 保存/更新记录
- `deleteLog(id)` - 删除记录
- `getUserTags()` - 获取自定义标签
- `addUserTag(tag)` - 添加自定义标签

#### FileService (services/file.js)
- `saveImage(tempPath)` - 保存临时图片到永久目录
- `deleteImage(path)` - 删除本地图片
- `compressImage(src, quality)` - 压缩图片

#### UtilService (services/util.js)
- `formatDate(date)` - 格式化日期为 "MM.DD"
- `formatTime(date)` - 格式化时间为 "HH:mm"
- `generateId()` - 生成唯一ID
- `getGreeting()` - 获取时段问候语
- `calculateMonthDays(logs)` - 计算本月记录天数

### 注意事项

1. **图片持久化**：必须将 `wx.chooseMedia` 返回的临时路径转存到 `wx.env.USER_DATA_PATH`
2. **数据校验**：保存前必须验证 `imagePath`、`name`、`rating` 三个必填字段
3. **TabBar同步**：每个页面的 `onShow` 需调用 `this.getTabBar().setData({ selected })`
4. **预设标签**：严格使用PRD中的9个中文标签，不要自行修改

## 📝 待优化功能

- [ ] 搜索筛选功能
- [ ] 云同步支持
- [ ] 社交分享功能
- [ ] 数据导出功能
- [ ] 更多统计图表

## 📄 许可证

本项目仅供学习交流使用。

## 👨‍💻 开发者

开发于 2025年，基于微信小程序原生框架。

