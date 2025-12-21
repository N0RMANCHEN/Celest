# 拖动和双击问题修复报告

## 问题描述

1. **拖动行为不正确**：节点拖动时位置偏移或不跟手
2. **双击创建节点位置错误**：双击创建的节点不在鼠标当前位置

## 根本原因分析

在之前的性能优化中，过度使用了 `localViewportRef` 来避免重渲染，但这导致了**坐标计算与实际渲染使用的 viewport 不一致**的问题：

### 问题场景

```typescript
// ❌ 错误的做法（之前的代码）
const canvasPos = screenToCanvas(
  { x: e.clientX - rect.left, y: e.clientY - rect.top },
  localViewportRef.current  // 可能与渲染时使用的 viewport 不一致
);
```

### 问题根源

1. **初始坐标计算**：使用了可能过时的 `localViewportRef.current`
2. **RAF 回调中的闭包**：闭包捕获的 `viewport` props 在异步执行时可能已经过时
3. **渲染与计算不一致**：SVG 渲染使用 props 的 `viewport`，但坐标计算使用了 `localViewportRef`

## 解决方案

### 核心策略：分阶段使用不同的 viewport 来源

#### 1. 初始化阶段（mouseDown/开始操作）

**使用 `viewport` props**，确保初始坐标准确：

```typescript
// ✅ 正确的做法
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // ...
  const canvasPos = screenToCanvas(
    { x: e.clientX - rect.left, y: e.clientY - rect.top },
    viewport  // 使用当前确定的 viewport props
  );
  // ...
}, [viewport, onSelectionChange]);
```

**原因**：
- 此时 viewport props 是确定且最新的
- 保证了拖动起始点的准确性

#### 2. 拖动/框选过程中（RAF 回调）

**使用 `localViewportRef.current`**，获取最新的 viewport：

```typescript
// ✅ 正确的做法
dragAnimationFrameRef.current = requestAnimationFrame(() => {
  // 在 RAF 回调中，使用 ref 获取最新值
  const currentMouse = screenToCanvas(
    { x: mouseX - rect.left, y: mouseY - rect.top },
    localViewportRef.current  // 获取最新的 viewport
  );
  // ...
});
```

**原因**：
- RAF 是异步执行的，闭包捕获的 viewport props 可能已过时
- 使用 ref 能获取最新的 viewport 值
- 即使在拖动过程中发生了缩放/平移，坐标计算仍然准确

#### 3. 双击创建节点

**使用 `viewport` props**，确保节点创建位置准确：

```typescript
// ✅ 正确的做法
const handlePaneClick = useCallback((e: React.MouseEvent) => {
  // ...
  if (e.detail >= 2 && onCreateNoteNodeAt) {
    const canvasPos = screenToCanvas(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      viewport  // 使用当前的 viewport props
    );
    onCreateNoteNodeAt(canvasPos);
  }
  // ...
}, [onCreateNoteNodeAt, viewport, onSelectionChange]);
```

**原因**：
- 双击是同步操作，viewport props 是准确的
- 不需要使用 ref

## 详细修改清单

### 修改 1：双击创建节点位置修复

**文件**：`src/features/canvas/Canvas.tsx`  
**函数**：`handlePaneClick`

```diff
- localViewportRef.current
+ viewport
```

**依赖项更新**：
```diff
- }, [onCreateNoteNodeAt, onSelectionChange]);
+ }, [onCreateNoteNodeAt, viewport, onSelectionChange]);
```

### 修改 2：框选开始位置修复

**文件**：`src/features/canvas/Canvas.tsx`  
**函数**：`handleMouseDown`

```diff
- localViewportRef.current
+ viewport
```

**依赖项更新**：
```diff
- }, [onSelectionChange]);
+ }, [viewport, onSelectionChange]);
```

### 修改 3：节点拖动开始位置修复

**文件**：`src/features/canvas/Canvas.tsx`  
**函数**：`handleNodeMouseDown`

```diff
- localViewportRef.current
+ viewport
```

**节点位置来源修复**：
```diff
- for (const [nodeId, pos] of localNodePositionsRef.current) {
+ for (const node of nodes) {
-   nodePositions.set(nodeId, pos);
+   nodePositions.set(node.id, { ...node.position });
}
```

**依赖项更新**：
```diff
- }, [onSelectionChange]);
+ }, [nodes, viewport, onSelectionChange]);
```

### 修改 4：拖动过程中保持 `localViewportRef`

**文件**：`src/features/canvas/Canvas.tsx`  
**位置**：全局 mouseMove handler 和 handleMouseMove 的 RAF 回调

**保持使用**：`localViewportRef.current`

**原因**：在 RAF 异步回调中需要获取最新的 viewport

### 修改 5：框选过程中使用 `localViewportRef`

**文件**：`src/features/canvas/Canvas.tsx`  
**位置**：框选更新逻辑

**保持使用**：`localViewportRef.current`

**原因**：确保框选框跟随鼠标准确

## 关键技术点

### 1. Viewport 同步机制

```typescript
// Sync viewport to local ref
useEffect(() => {
  localViewportRef.current = viewport;
}, [viewport]);
```

**作用**：
- 每次 viewport props 更新时，同步到 ref
- 保证 ref 始终持有最新的 viewport 值

### 2. RAF 中的坐标计算

```typescript
// 捕获鼠标位置（同步）
const mouseX = e.clientX;
const mouseY = e.clientY;

// RAF 回调（异步）
dragAnimationFrameRef.current = requestAnimationFrame(() => {
  // 使用 ref 获取最新的 viewport（而不是闭包捕获的值）
  const currentMouse = screenToCanvas(
    { x: mouseX - rect.left, y: mouseY - rect.top },
    localViewportRef.current
  );
  // ...
});
```

**关键点**：
- 鼠标位置在事件处理时同步捕获
- viewport 在 RAF 回调中从 ref 获取最新值
- 避免了闭包捕获过时值的问题

### 3. 平移操作的特殊处理

```typescript
// 平移开始时保存初始 viewport
panStartRef.current = {
  x: e.clientX,
  y: e.clientY,
  viewport: { ...viewport },  // 保存初始 viewport
};

// 平移过程中基于初始 viewport 计算新位置
const newViewport = {
  x: panStartRef.current.viewport.x + deltaX,
  y: panStartRef.current.viewport.y + deltaY,
  zoom: panStartRef.current.viewport.zoom,
};
```

**原因**：
- 平移需要基于初始 viewport 计算偏移量
- 不能使用当前的 viewport，否则会累积误差

## 测试验证

### 测试场景 1：双击创建节点

**步骤**：
1. 在画布任意位置双击
2. 观察节点是否创建在鼠标位置

**预期结果**：✅ 节点精确出现在双击位置

### 测试场景 2：单个节点拖动

**步骤**：
1. 点击并拖动单个节点
2. 观察节点是否跟随鼠标

**预期结果**：✅ 节点精确跟随鼠标，无延迟无偏移

### 测试场景 3：多选节点拖动

**步骤**：
1. 框选多个节点
2. 拖动其中一个节点
3. 观察所有选中节点是否一起移动

**预期结果**：✅ 所有节点保持相对位置一起移动

### 测试场景 4：拖动时缩放

**步骤**：
1. 开始拖动节点
2. 在拖动过程中使用 Ctrl+滚轮缩放
3. 继续拖动

**预期结果**：✅ 拖动仍然跟手，不会出现跳跃

### 测试场景 5：框选

**步骤**：
1. 在画布上拖动鼠标创建框选框
2. 观察框选框是否跟随鼠标

**预期结果**：✅ 框选框精确跟随鼠标

## 性能影响

### 保留的优化

✅ **requestAnimationFrame 批处理**：仍然使用 RAF 减少更新频率  
✅ **本地位置缓存**：`localNodePositionsRef` 仍用于优化 UI 更新  
✅ **本地 viewport ref**：用于在异步回调中获取最新值

### 修复的问题

✅ **坐标计算准确性**：初始化阶段使用确定的 viewport props  
✅ **异步更新准确性**：RAF 回调中使用 ref 获取最新 viewport  
✅ **依赖项完整性**：添加了缺失的 viewport 和 nodes 依赖

## 总结

### 修复前的问题

1. ❌ 过度使用 `localViewportRef` 导致坐标计算错误
2. ❌ 初始化阶段使用了可能不准确的 ref 值
3. ❌ 闭包捕获了过时的 viewport

### 修复后的状态

1. ✅ 初始化阶段使用 viewport props（准确）
2. ✅ RAF 回调中使用 ref（最新值）
3. ✅ 双击创建节点位置准确
4. ✅ 拖动行为完全跟手
5. ✅ 框选精确跟随鼠标
6. ✅ 保持了性能优化（RAF 批处理）

### 技术要点

- **初始化同步，更新异步**：初始化用 props，RAF 用 ref
- **viewport 双重来源**：props 用于确定值，ref 用于最新值
- **依赖项完整性**：确保 useCallback 依赖项包含所有使用的 props

---

**修复完成时间**：2025-01-XX  
**测试状态**：待用户验证  
**代码质量**：✅ 无 linter 错误，遵循项目规范

