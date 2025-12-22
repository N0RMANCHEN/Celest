# 严重 Bug 修复报告

## Bug 1: 拖动节点导致画布飞速移动（严重）

### 问题描述

用户报告：
- 按住节点拖动时，整个画布位置会飞速移动
- 通常在双击创建节点后触发
- 触发后双指和滚轮平移功能失效

### 根本原因分析

#### 原因 1：状态污染（最可能）

双击创建节点后，可能存在以下状态污染：
1. `isBoxSelectingRef.current = true` 没有被清除
2. 某个交互状态残留，导致多个监听器同时活跃
3. 拖动和平移监听器同时响应鼠标事件

#### 原因 2：事件冒泡冲突

Handle 的 mouseDown 事件冒泡到节点，触发了节点拖动：
- Handle 点击 → 开始连线
- 事件冒泡到节点 → 也开始拖动
- 结果：同时在连线和拖动，状态混乱

#### 原因 3：多个全局监听器冲突

```typescript
// useCanvasDrag.ts
window.addEventListener("mousemove", handleDragMove);

// useCanvasPanZoom.ts  
window.addEventListener("mousemove", handlePanMove);

// useCanvasSelection.ts
window.addEventListener("mousemove", updateBoxSelection);
```

如果多个状态同时为 true，这些监听器会同时触发！

### 解决方案

#### 修复 1：CanvasNode 中阻止 handle 事件冒泡

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  // 如果点击的是 handle，不触发节点拖动
  const target = e.target as HTMLElement;
  if (target.closest(".canvas-handle")) {
    return;  // ← 直接返回，不继续处理
  }
  
  e.preventDefault();
  e.stopPropagation();
  if (onNodeMouseDown) {
    onNodeMouseDown(node.id, e);
  }
};
```

**效果**：
- ✅ 点击 handle 时不会触发节点拖动
- ✅ 只触发连线逻辑

#### 修复 2：Canvas mouseUp 双击时清除所有状态

```typescript
const handleMouseUp = useCallback((e: React.MouseEvent) => {
  // If this is part of a double-click, clear all interaction states
  if (e.detail >= 2) {
    clearBoxSelection();
    // 确保清除所有交互状态，防止状态污染
    if (state.isPanning) {
      handlePanEnd();
    }
    if (state.isDragging) {
      handleDragEnd();
    }
    if (connectionState.isConnecting) {
      handleConnectionCancel();
    }
    return;  // ← 直接返回，不继续处理
  }
  // ...
});
```

**效果**：
- ✅ 双击时强制清除所有交互状态
- ✅ 防止状态泄漏到后续操作

#### 修复 3：Canvas mouseDown 添加互斥检查

```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // ...
  
  // 防止多个交互状态冲突
  if (state.isDragging || state.isPanning || connectionState.isConnecting) {
    console.warn("[Canvas] Interaction conflict detected, ignoring mouseDown");
    return;
  }
  
  // ...
});
```

**效果**：
- ✅ 如果已经在交互中，拒绝新的交互
- ✅ 防止状态冲突

#### 修复 4：useCanvasDrag 添加重复启动检查

```typescript
const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
  // ...
  
  // 防止与其他交互冲突
  if (isDragging) {
    console.warn("[useCanvasDrag] Already dragging, ignoring new drag start");
    return;
  }
  
  // ...
});
```

**效果**：
- ✅ 防止重复启动拖动
- ✅ 避免状态覆盖

#### 修复 5：useCanvasPanZoom 添加重复启动检查

```typescript
const startPan = useCallback((e: React.MouseEvent) => {
  // 防止重复启动
  if (isPanning) {
    console.warn("[useCanvasPanZoom] Already panning, ignoring");
    return;
  }
  
  setIsPanning(true);
  // ...
});
```

**效果**：
- ✅ 防止重复启动平移
- ✅ 避免状态覆盖

## Bug 2: 缩放中心点问题

### 问题描述

用户报告：
- 缩放目前是沿着画布中心缩放
- 期望沿着鼠标位置中心缩放

### 分析结果

**代码已经实现了以鼠标为中心缩放**（见 useCanvasPanZoom.ts 第 156-163 行）：

```typescript
// Zoom towards mouse position (Figma behavior)
const scale = newZoom / currentViewport.zoom;
const newViewport: CanvasViewport = {
  x: mouseX - (mouseX - currentViewport.x) * scale,
  y: mouseY - (mouseY - currentViewport.y) * scale,
  zoom: newZoom,
  z: newZoom,
};
```

### 验证公式

这是标准的"以点为中心缩放"公式：

**原理**：
1. 鼠标在屏幕上的位置：`(mouseX, mouseY)`
2. 鼠标对应的 canvas 坐标在缩放前后应该保持不变
3. 缩放前：`canvasX = (mouseX - viewport.x) / zoom`
4. 缩放后：`canvasX = (mouseX - newViewport.x) / newZoom`
5. 令两者相等，解得：`newViewport.x = mouseX - (mouseX - viewport.x) * (newZoom / zoom)`

**结论**：✅ 公式正确，已经实现了以鼠标为中心缩放

### 可能的问题

如果用户感觉是"沿画布中心缩放"，可能是因为：
1. 缩放倍率太小，视觉上不明显
2. 鼠标位置获取不正确
3. viewport 更新有延迟

### 优化建议

增加缩放灵敏度（可选）：

```typescript
const PINCH_DELTA_MULTIPLIER = 0.02;  // 从 0.012 增加到 0.02
const PINCH_BASE = 1.15;  // 从 1.12 增加到 1.15
```

## 测试清单

### Bug 1 测试

- [ ] 双击创建节点
- [ ] 立即拖动新创建的节点
- [ ] 观察画布是否异常移动
- [ ] 释放后测试双指平移是否正常
- [ ] 测试滚轮平移是否正常

### Bug 2 测试

- [ ] 将鼠标放在画布左上角
- [ ] Ctrl+滚轮缩放
- [ ] 观察：画布应该向左上角移动（鼠标位置保持不变）
- [ ] 将鼠标放在画布右下角
- [ ] Ctrl+滚轮缩放
- [ ] 观察：画布应该向右下角移动（鼠标位置保持不变）

### 交互互斥测试

- [ ] 拖动节点时尝试开始框选 → 应该被阻止
- [ ] 平移画布时尝试拖动节点 → 应该被阻止
- [ ] 连线时尝试拖动节点 → 应该被阻止

## 修改文件清单

1. **src/features/canvas/components/CanvasNode.tsx**
   - 添加 handle 点击检测，防止触发节点拖动

2. **src/features/canvas/Canvas.tsx**
   - mouseUp 时双击清除所有状态
   - mouseDown 时添加互斥检查

3. **src/features/canvas/hooks/useCanvasDrag.ts**
   - 添加重复启动检查

4. **src/features/canvas/hooks/useCanvasPanZoom.ts**
   - 添加重复启动检查

## 技术改进

### 防御性编程

1. **互斥检查**：多处添加状态冲突检测
2. **完整清理**：双击时强制清除所有状态
3. **事件隔离**：handle 事件不冒泡到节点
4. **日志输出**：冲突时输出警告，便于调试

### 状态管理原则

```
原则 1：同一时间只能有一个交互状态为 true
  - isDragging
  - isPanning  
  - isBoxSelecting
  - isConnecting

原则 2：任何新交互开始前，检查其他状态
原则 3：双击等特殊操作，强制清除所有状态
原则 4：事件处理早期返回，避免级联触发
```

## 预期效果

### Bug 1 修复后

- ✅ 双击创建节点后，所有状态正确清除
- ✅ 拖动节点时不会触发平移
- ✅ 点击 handle 时不会触发节点拖动
- ✅ 多个交互不会同时激活
- ✅ 双指平移和滚轮平移始终可用

### Bug 2 说明

- ✅ 缩放已经是以鼠标为中心
- ✅ 公式正确，符合 Figma 行为
- ✅ 缩放时鼠标下的点保持不动

如果用户仍然感觉是"画布中心缩放"，可能需要：
- 增加缩放灵敏度（让效果更明显）
- 检查是否有其他因素影响（如浏览器缩放）

---

**修复时间**：2025-01-XX  
**优先级**：P0（严重 bug）  
**测试状态**：待验证

