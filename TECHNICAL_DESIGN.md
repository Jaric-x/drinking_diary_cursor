# 微醺笔记 (Drinking Diary) - 技术架构方案 (MVP)

## 1. 项目概述
本项目为微信小程序应用，核心功能为个人酒品记录与浏览。
MVP版本完全基于**本地存储**实现，无需后端服务器，重点保障数据读写速度与交互流畅度。
设计风格参考 iOS 原生应用体验，强调流畅的动画与精致的视觉反馈。

## 2. 技术选型

### 2.1 核心框架
- **基础框架**: 微信小程序原生框架 (WXML, WXSS, JS/TS)
  - *理由*: 项目结构简单，原生框架性能最好，无跨端需求，包体积最小。
- **UI 规范**: 原生组件 + 自定义原子化样式类
  - *理由*: 
    - 需要高度还原设计稿的 "毛玻璃(Backdrop blur)"、"高斯模糊"、"平滑阴影" 等效果，现成组件库难以满足。
    - 采用类似 Tailwind CSS 的原子化思想构建 `common.wxss`，统一管理圆角、阴影、间距。

### 2.2 数据存储方案 (核心)
为突破 `localStorage` 10MB 限制并保障性能，采用 **JSON + FileSystem** 混合存储：
1.  **结构化数据 (JSON)**: 使用 `wx.setStorageSync` / `wx.getStorageSync`。
    -   Key: `drinking_diary_logs` (主记录列表)
    -   Key: `drinking_diary_tags` (自定义标签)
2.  **媒体资源 (Images)**: 使用 `wx.getFileSystemManager()`。
    -   用户选择图片后，**必须**将临时路径 (`tmp://`) 转存至本地用户目录 (`wx.env.USER_DATA_PATH`)。

### 2.3 视觉系统 (Visual System)
根据 PRD 1.5 及 UI Demo，建立全局 CSS 变量系统 (`styles/variables.wxss`)：

```css
page {
  /* 品牌色 */
  --color-primary: #007AFF;   /* Brand Blue */
  --color-bg: #F2F2F7;        /* iOS style light gray background */
  --color-card-bg: #FFFFFF;
  
  /* 文本色 */
  --text-main: rgba(0, 0, 0, 0.9);
  --text-secondary: #3C3C43;  /* 60% opacity handled via opacity or hex alpha if needed */
  --text-placeholder: #999999;

  /* 功能色 */
  --color-star: #FF9500;
  --color-tag-bg: #E5E5EA;
  --color-tag-active: #007AFF;
  --color-danger: #FF3B30;

  /* 圆角 & 阴影 */
  --radius-card: 16px;
  --radius-btn: 12px;
  --shadow-card: 0 8px 20px rgba(0, 0, 0, 0.08);
  --shadow-float: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  /* 动画曲线 */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-blur: 1000ms;
}
```

---

## 3. 目录结构设计

```text
miniprogram/
├── assets/                 # 静态资源
│   ├── icons/              # SVG/PNG 图标 (Home, User, Plus, Star...)
│   └── images/             # 默认占位图
├── components/             # 公共组件
│   ├── diary-card/         # 首页卡片 (展示图、分、评、签)
│   ├── stat-card/          # 个人页统计卡片 (3列布局)
│   ├── rating-star/        # 评分组件 (支持只读/交互模式)
│   ├── navigation-bar/     # 自定义导航栏 (支持透明/毛玻璃)
│   └── page-container-box/ # 模拟 Modal 弹窗容器
├── pages/                  # 页面
│   ├── index/              # 首页 (双向 Swiper 交互)
│   ├── profile/            # 个人酒库 (Grid 布局)
│   └── editor/             # 编辑页 (全屏 Modal 风格)
├── services/               # 业务逻辑
│   ├── storage.js          # 数据存取
│   ├── file.js             # 文件管理
│   └── util.js             # 日期格式化 (MM.DD)
├── styles/                 
│   ├── variables.wxss      # 变量定义
│   └── common.wxss         # 原子类 (.flex-center, .shadow-sm...)
├── app.js
└── app.json
```

---

## 4. 数据结构设计 (Schema)

### 4.1 主记录模型 (Log Model)
Key: `drinking_diary_logs`

```javascript
/**
 * @typedef {Object} Log
 * @property {string} id - 唯一标识
 * @property {string} name - 酒名 (必填)
 * @property {string} imagePath - 本地永久路径 (必填)
 * @property {number} rating - 评分 1-5 (必填)
 * @property {string} [location] - 地点
 * @property {number} [price] - 价格
 * @property {string} [notes] - 品鉴笔记
 * @property {string[]} tags - 标签列表
 * @property {number} createTime - 创建时间戳
 * @property {number} updateTime - 更新时间戳
 * @property {string} dateString - 格式化日期 "MM.DD" (用于首页分组索引)
 * @property {string} timeString - 格式化时间 "HH:mm" (用于卡片展示)
 */
```

### 4.2 标签数据模型 (Tag Model)
Key: `drinking_diary_tags`
采用**分离存储**策略：预设标签硬编码在代码中，用户自定义标签存储在本地 Storage。

**A. 预设标签 (Constants)**
```javascript
// constants/tags.js
export const PRESET_TAGS = [
  "Fruity", "Smoky", "Sweet", "Dry", "Bitter", "Strong", "Smooth", // 口感
  "Whisky", "Gin", "Rum", "Vodka", "Tequila", "Brandy",            // 基酒
  "Cocktail", "Wine", "Beer"                                       // 类型
];
```

**B. 用户标签 (Storage Schema)**
```javascript
/**
 * @typedef {string[]} UserTags
 * // 示例: ["MyFavorite", "HolidaySpecial"]
 * // 注意：仅存储用户新增的标签，展示时将 PRESET_TAGS 和 UserTags 合并并去重。
 */
```

---

## 5. 核心功能实现方案

### 5.1 首页：双向交互 (2D Navigation)
PRD 要求 "纵向切换日期，横向切换同日记录"。
*   **方案**: 嵌套 Swiper 架构
    1.  **外层 Swiper (Vertical)**:
        *   `vertical="true"`
        *   每个 `swiper-item` 代表一个**日期分组**。
        *   高度设为 `100vh` (或减去 TabBar 高度)。
    2.  **内层 Swiper (Horizontal)**:
        *   `vertical="false"`
        *   置于每个外层 Item 内部。
        *   每个 `swiper-item` 是一张 `diary-card`。
        *   设置 `previous-margin="40rpx"` 和 `next-margin="40rpx"` 以实现"堆叠预览"效果 (Card Stack 模拟)，让用户看到前后有卡片。
*   **日期书签 (Date Indicator)**:
    *   使用 `position: absolute; right: 0; top: 50%;` 悬浮在页面右侧。
    *   选中态: 黑色半胶囊背景，白色文字。
    *   非选中态: 灰色半胶囊背景，灰色小圆点。
    *   监听外层 Swiper 的 `bindchange` 事件，更新当前高亮的日期。

### 5.2 编辑页：模态体验 (Modal Style)
PRD 要求 "模态页面风格"，但作为核心功能，建议使用**独立页面** (`pages/editor/index`) 配合**自定义转场动画**。
*   **UI 实现**:
    *   `navigationStyle: "custom"` (隐藏原生导航栏)。
    *   自定义 Header: 包含 "Cancel" (左) 和 "Save" (底部悬浮大按钮)。
    *   进入动画: 使用 `wx.navigateTo` 的 `routeType: 'present'` (基础库 2.29+ 支持类似 iOS 的从下往上弹出效果)，或者自行实现 CSS `transform: translateY` 动画。
    *   表单样式: 采用 "Inset Grouped" 风格 (白色圆角卡片悬浮在灰色背景上)。
*   **交互逻辑**:
    *   **图片上传**: 点击占位图 -> `wx.chooseMedia` -> `FileService.saveImage` -> 更新状态。
    *   **标签选择**: 预设标签 (Flex wrap 布局) + 自定义标签 (Input + Add 按钮)。

### 5.3 个人页：统计与网格
*   **统计卡片**: 使用 Grid 布局 (`display: grid; grid-template-columns: 1fr 1fr 1fr;`)，中间加分隔线 (`border-right`)。
*   **照片墙**: 使用 `display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;` 实现紧凑网格。

### 5.4 底部导航 (Custom TabBar)
由于系统 TabBar 不支持高斯模糊 (Backdrop Filter) 和中间悬浮大按钮，需要使用 **Custom TabBar**。
*   在 `app.json` 中配置 `tabBar.custom = true`。
*   在 `custom-tab-bar/` 目录实现组件。
*   **中间按钮**: 绝对定位，突起样式，系统蓝背景，点击 `bindtap="openEditor"`。
*   **背景**: 高透磨砂玻璃 (Backdrop Blur XL)。

---

## 6. 开发标准与规范 (Development Standards)

### 6.1 数据操作规范 (CRUD)
所有页面**严禁**直接调用 `wx.getStorage/setStorage`，必须统一通过 `StorageService` 类进行操作。

*   **读取 (Read)**: `StorageService.getLogs()` 返回按时间倒序排列的数组。
*   **写入 (Create/Update)**: `StorageService.saveLog(log)`。必须在此方法内自动处理 `createTime` 和 `updateTime`，并更新 `dateString` 索引字段。
*   **删除 (Delete)**: `StorageService.deleteLog(id)`。删除记录时，应同时检查并删除关联的本地图片文件（如果该图片未被其他记录引用）。

### 6.2 图片持久化标准
*   **生命周期**:
    1.  `wx.chooseMedia` 获取 `tempFilePath` (临时路径)。
    2.  **立即**调用 `FileService.saveImage(tempFilePath)`。
    3.  `FileService` 使用 `wx.getFileSystemManager().saveFile` 将图片移至 `wx.env.USER_DATA_PATH` 目录。
    4.  返回的新路径 (如 `http://usr/local_123.jpg`) 存入 Log 对象。
*   **异常处理**: 若保存失败，UI 应提示用户并阻止表单提交。

### 6.3 数据状态同步
*   **场景**: 编辑页新建/修改记录后，返回首页，列表需要刷新。
*   **方案**:
    *   使用 `wx.eventChannel` (推荐): 在 `navigateTo` 时建立通道，编辑页保存成功后 `eventChannel.emit('refresh')`。
    *   备选: 在 `App.globalData` 设置脏标记 `isDirty: true`，首页 `onShow` 检查标记并决定是否重载数据。

---

## 7. 异常处理与优化
1.  **图片加载失败**: 在 `<image>` 组件绑定 `binderror`，显示默认 "酒杯" 图标。
2.  **数据量大**:
    *   虽然是本地存储，但渲染大量图片会卡顿。
    *   **优化**: 首页 Swiper 仅渲染当前日期前后各 1 组数据 (虚拟列表思想)，但这在 MVP 阶段可能过于复杂。
    *   **MVP 策略**: 限制初始加载天数（如最近 30 天），用户下拉/上拉再加载更多。
3.  **存储空间**: 监听 `wx.setStorage` 错误，若满则提示用户清理。

## 8. 开发优先级
1.  **P0**: 基础数据服务 (`StorageService`, `FileService`)。
2.  **P0**: 创建和编辑笔记页 (核心写入入口，先做这个才能产生数据)。
3.  **P0**: 首页 (核心浏览入口，双向 Swiper)。
4.  **P1**: 个人页 (统计展示)。
5.  **P2**: 自定义 TabBar 和 动画细节打磨。

## 9. 开发任务清单 (Todo List)
- [ ] **项目初始化**：清理默认文件，建立目录结构 (`components`, `services`, `styles` 等)。
- [ ] **基础服务层 (Mock版)**：创建 `StorageService` 并返回模拟数据，用于驱动 UI 开发。
- [ ] **全局样式配置**：设置 `variables.wxss` (品牌色、圆角、阴影) 和 `common.wxss`。
- [ ] **开发首页 (Home)**：实现双向 Swiper 交互、日期指示器和卡片 UI (使用 Mock 数据)。
- [ ] **开发编辑页 (Editor)**：实现 "Inset Grouped" 表单 UI、图片选择交互、标签逻辑和保存逻辑。
- [ ] **开发个人页 (Profile)**：实现统计卡片和照片墙布局。
- [ ] **自定义 TabBar**：实现高透磨砂背景和中间悬浮按钮。
- [ ] **服务层接入真实逻辑**：实现 `FileService` 图片持久化和 `StorageService` 本地存储 (替换 Mock)。
- [ ] **整体联调与细节打磨**：检查动画流畅度、空状态、异常处理。
