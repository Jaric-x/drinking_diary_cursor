# 首页卡片堆叠与滑动动效实现文档

## 📋 实现概述

基于demo代码（`ui_demo/App.tsx`）的"Discard & Promote"交互模型，在微信小程序中实现了iOS风格的卡片堆叠视觉效果和左右滑动翻页动画。

---

## 🎨 视觉效果规范

### 1. **堆叠视觉形态**

当某个日期下有多条记录时，卡片自动形成纵深堆叠：

| 位置 | Transform | Scale | Rotate | Opacity | Z-Index | 交互 |
|------|-----------|-------|--------|---------|---------|------|
| **当前卡片** (offset=0) | `translateX(0)` | `1.0` | `0deg` | `1.0` | `30` | ✅ 可点击 |
| **第二张** (offset=1) | `translateX(40rpx)` | `0.95` | `3deg` | `1.0` | `20` | ❌ 不可点击 |
| **第三张** (offset=2) | `translateX(70rpx)` | `0.9` | `6deg` | `0.5` | `10` | ❌ 不可点击 |
| **更多卡片** (offset>2) | `translateX(80rpx)` | `0.85` | `0deg` | `0` | `0` | ❌ 隐藏 |
| **已丢弃** (offset<0) | `translateX(-240%)` | `0.9` | `-10deg` | `0` | `40` | ❌ 已飞出 |

**设计意图：**
- 右侧露出边缘，暗示"后面还有内容"
- 轻微旋转制造生活气息和凌乱感
- 深度虚化，避免视觉过载

### 2. **动画曲线**

- **时长**: `500ms`
- **缓动函数**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **特点**: 轻快且带有粘性，符合iOS动效风格

---

## 🔧 技术实现

### **核心代码文件**

#### 1. **pages/index/index.wxml**

```xml
<!-- 卡片堆叠容器（支持水平手势） -->
<view 
  class="card-stack-container"
  data-group-index="{{groupIndex}}"
  bindtouchstart="onTouchStart"
  bindtouchmove="onTouchMove"
  bindtouchend="onTouchEnd"
>
  <block wx:for="{{group.logs}}" wx:key="id">
    <!-- 根据offset动态应用类名 -->
    <view 
      class="diary-card-wrapper diary-card-wrapper--offset-{{logIndex - (activeLogIndices[groupIndex] || 0)}}"
      data-offset="{{logIndex - (activeLogIndices[groupIndex] || 0)}}"
      bindtap="onCardTap"
    >
      <view class="diary-card">
        <!-- 卡片内容 -->
      </view>
    </view>
  </block>
</view>
```

**关键点：**
- 使用 `offset = logIndex - activeIndex` 计算卡片相对位置
- 通过 `class="diary-card-wrapper--offset-{{offset}}"` 动态应用样式
- 绑定三个手势事件：`touchstart`, `touchmove`, `touchend`

#### 2. **pages/index/index.js**

```javascript
data: {
  activeLogIndices: {},  // 每个日期组的当前卡片索引
  touchStartX: 0,        // 手势起始X坐标
  isDragging: false      // 是否正在拖动
},

// 手势处理
onTouchStart(e) {
  this.setData({
    touchStartX: e.touches[0].clientX,
    isDragging: false
  });
},

onTouchMove(e) {
  const distance = Math.abs(e.touches[0].clientX - this.data.touchStartX);
  if (distance > 10) {
    this.setData({ isDragging: true });
  }
},

onTouchEnd(e) {
  const distance = this.data.touchStartX - e.changedTouches[0].clientX;
  const minSwipeDistance = 50; // 最小滑动距离
  
  if (distance > minSwipeDistance) {
    // 左滑：查看下一张
    this.setData({
      [`activeLogIndices.${groupIndex}`]: currentIndex + 1
    });
  } else if (distance < -minSwipeDistance) {
    // 右滑：查看上一张
    this.setData({
      [`activeLogIndices.${groupIndex}`]: currentIndex - 1
    });
  }
}
```

**防误触机制：**
- 水平滑动距离 > 50px 才触发切换
- 通过 `isDragging` 标记区分滑动和点击
- 点击事件只响应 `offset === 0` 的当前卡片

#### 3. **pages/index/index.wxss**

```css
/* 卡片包装器 - 绝对定位 */
.diary-card-wrapper {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 600rpx;
  height: 900rpx;
  transform-origin: center center;
  transition: all 500ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

/* 根据offset值应用不同的transform */
.diary-card-wrapper--offset-0 {
  transform: translate(-50%, -50%) translateX(0) scale(1) rotate(0deg);
  opacity: 1;
  z-index: 30;
  pointer-events: auto;
}

.diary-card-wrapper--offset-1 {
  transform: translate(-50%, -50%) translateX(40rpx) scale(0.95) rotate(3deg);
  opacity: 1;
  z-index: 20;
  pointer-events: none;
}

/* ... 其他offset状态 ... */
```

**CSS技巧：**
- 使用 `transform-origin: center center` 确保旋转围绕中心点
- 使用 `will-change: transform, opacity` 优化动画性能
- 通过 `pointer-events` 控制交互区域

---

## 🎯 交互逻辑

### **1. 左右滑动切换卡片**

```
向左滑动（查看下一张）：
  当前卡片 → translateX(-240%) + rotate(-10deg) → 飞出屏幕
  第二张卡片 → 晋升为当前卡片（回正、放大）
  第三张卡片 → 晋升为第二张
  隐藏卡片 → 淡入为第三张

向右滑动（回溯上一张）：
  左侧隐藏区 → 从 -240% 位置飞回屏幕中央
  当前堆叠 → 整体后退一步
```

### **2. 垂直滚动切换日期**

使用 `scroll-view` 的 `snap-to-child` 特性，实现每个日期组占据全屏的垂直滚动效果。

### **3. 点击卡片进入详情**

```javascript
onCardTap(e) {
  // 只有当前卡片（offset === 0）才能点击
  if (e.currentTarget.dataset.offset !== 0) return;
  
  // 如果正在拖动，不响应点击
  if (this.data.isDragging) return;
  
  wx.navigateTo({
    url: `/pages/editor/editor?id=${id}`
  });
}
```

---

## 🚀 性能优化

1. **CSS动画硬件加速**
   - 使用 `transform` 而不是 `left/top`
   - 添加 `will-change` 属性

2. **限制可见卡片数量**
   - 只渲染前3张卡片的完整样式
   - 后续卡片设置 `opacity: 0` 直接隐藏

3. **防抖与节流**
   - 手势结束后 100ms 才重置拖动状态
   - 避免短时间内多次触发

---

## 📱 兼容性说明

- **微信小程序基础库**: ≥ 2.10.0
- **测试机型**: iOS 14+, Android 7.0+
- **已知限制**:
  - 微信小程序不支持 CSS `perspective` 属性的完整3D变换
  - 使用平面 `transform` 模拟纵深效果

---

## 🎨 视觉参考

```
┌─────────────────────────┐
│                         │
│    ┌──────────┐         │  ← 第三张 (scale: 0.9, rotate: 6deg)
│   ┌┼──────────┼┐        │  ← 第二张 (scale: 0.95, rotate: 3deg)
│  ┌┼┼──────────┼┼┐       │  ← 当前卡片 (scale: 1.0)
│  │││  卡片内容  │││       │
│  │││          │││       │
│  └┴┴──────────┴┴┘       │
│                         │
└─────────────────────────┘
```

---

## 🔗 参考资料

- **设计灵感**: Tinder卡片堆叠交互
- **Demo代码**: `ui_demo/App.tsx` 第242-278行
- **动画曲线**: [cubic-bezier.com](https://cubic-bezier.com/#.16,1,.3,1)

---

**实现完成时间**: 2024-12-11  
**开发者**: Cursor AI Assistant

