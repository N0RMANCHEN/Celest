# 坐标系统修复报告

## 问题描述

用户报告了两个关键问题：
1. **双击创建节点位置不正确** - 节点不在鼠标点击位置
2. **创建节点后画布无法拖动** - 画布平移功能失效

## 根本原因

### 问题 1：双重 Viewport 转换

**症状**：节点和边的位置都不正确，出现偏移。

**根本原因**：
在 Canvas 组件中，所有元素都被包裹在一个带有 viewport transform 的 `<g>` 元素中：

```tsx
<g transform={getViewportTransform(viewport)}>
  {/* 所有节点、边、框选框都在这里 */}
</g>
```

但是，`CanvasNode` 和 `CanvasEdge` 组件又对坐标进行了一次 viewport 转换：

```tsx
// ❌ 错误：双重转换
const screenPos = {
  x: node.position.x * viewport.zoom + viewport.x,  // 第二次转换
  y: node.position.y * viewport.zoom + viewport.y,
};
```

**结果**：坐标被转换了两次，导致位置错误。

### 问题 2：双击事件干扰框选状态

**症状**：双击创建节点后，画布无法拖动。

**根本原因**：
1. 双击时，mouseDown 事件先触发，开始了框选（`isBoxSelectingRef.current = true`）
2. 即使 onClick 处理了双击并创建了节点，框选状态没有被清除
3. 后续的鼠标事件被框选逻辑拦截，导致画布无法拖动

## 解决方案

### 修复 1：统一坐标系统

**核心原则**：父元素已经处理了 viewport 转换，子元素直接使用 canvas 坐标。

#### CanvasNode 组件修复

```tsx
// ✅ 正确：直接使用 canvas 坐标
export function CanvasNode({ node, ... }: Props) {
  // ...
  return (
    <foreignObject
      x={node.position.x}  // 直接使用 canvas 坐标
      y={node.position.y}
      width={size.width}
      height={size.height}
    >
      {/* ... */}
    </foreignObject>
  );
}
```

**移除的代码**：
- 移除了 `screenPos` 的计算
- 移除了 `viewport` prop（不再需要）

#### CanvasEdge 组件修复

```tsx
// ✅ 正确：直接使用 canvas 坐标
export function CanvasEdge({ sourcePos, targetPos, ... }: Props) {
  const canvasSource = sourceHandlePos || sourcePos;
  const canvasTarget = targetHandlePos || targetPos;
  
  const path = calculateBezierPath(
    canvasSource,  // 直接使用 canvas 坐标
    canvasTarget,
    sourceHandlePos,
    targetHandlePos
  );
  // ...
}
```

**移除的代码**：
- 移除了 `applyViewport` 函数
- 移除了 `viewport` prop（不再需要）

#### SelectionBox 组件修复

```tsx
// ✅ 正确：已经在使用 canvas 坐标
export function SelectionBox({ start, end }: Props) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  // ...
}
```

**移除的代码**：
- 移除了未使用的 `viewport` prop

### 修复 2：双击事件状态管理

#### 防止双击触发框选

在 `handleMouseDown` 中添加检查：

```tsx
// ✅ 只在单击时开始框选
if (e.button === 0 && e.detail === 1) {
  // 开始框选
  isBoxSelectingRef.current = true;
  setBoxSelection({ start: canvasPos, end: canvasPos });
}
```

**关键改进**：
- 检查 `e.detail === 1` 确保只在单击时开始框选
- 双击时 `e.detail >= 2`，不会触发框选

#### 清除框选状态

在多个地方添加了框选状态清除：

**1. 开始平移时清除**：
```tsx
if (isSpacePan || isMiddleButton) {
  // 清除任何残留的框选状态
  isBoxSelectingRef.current = false;
  setBoxSelection(null);
  
  setIsPanning(true);
  // ...
}
```

**2. 双击创建节点时清除**：
```tsx
if (e.detail >= 2 && onCreateNoteNodeAt) {
  // 清除任何可能开始的框选状态
  isBoxSelectingRef.current = false;
  setBoxSelection(null);
  
  onCreateNoteNodeAt(canvasPos);
  return;
}
```

**3. mouseUp 时清除（双击情况）**：
```tsx
const handleMouseUp = useCallback((e: React.MouseEvent) => {
  // 如果是双击的一部分，清除框选状态
  if (e.detail >= 2) {
    isBoxSelectingRef.current = false;
    setBoxSelection(null);
  }
  // ...
}, [isPanning, isDragging]);
```

## 修改文件清单

### 主要修改

1. **src/features/canvas/components/CanvasNode.tsx**
   - 移除 viewport 转换逻辑
   - 直接使用 `node.position.x/y`
   - 移除 `viewport` prop

2. **src/features/canvas/components/CanvasEdge.tsx**
   - 移除 viewport 转换逻辑
   - 直接使用 canvas 坐标计算路径
   - 移除 `viewport` prop

3. **src/features/canvas/components/SelectionBox.tsx**
   - 移除未使用的 `viewport` prop
   - 保持直接使用 canvas 坐标

4. **src/features/canvas/Canvas.tsx**
   - 更新所有组件调用，移除 `viewport` prop
   - 添加双击事件状态管理
   - 在多处添加框选状态清除逻辑

## 坐标系统架构

### 最终架构（修复后）

```
屏幕坐标 (Screen)
    ↓
    screenToCanvas() - 在事件处理时转换
    ↓
Canvas 坐标
    ↓
    存储在 state 中（node.position）
    ↓
    直接传递给组件
    ↓
    <g transform={viewport}> - 在渲染时统一转换
    ↓
    节点/边/框选框使用 canvas 坐标渲染
```

### 关键点

1. **单一转换点**：只在父级 `<g>` 元素上应用 viewport transform
2. **组件简化**：子组件直接使用 canvas 坐标，无需知道 viewport
3. **状态一致**：存储和渲染使用相同的坐标系统

## 测试验证

### 测试场景 1：双击创建节点 ✅

**步骤**：
1. 在画布任意位置双击
2. 观察节点位置

**预期结果**：节点精确出现在鼠标双击位置

**实际结果**：✅ 通过

### 测试场景 2：创建节点后画布拖动 ✅

**步骤**：
1. 双击创建一个节点
2. 尝试 Space + 拖拽平移画布
3. 尝试中键拖拽平移画布
4. 尝试双指滑动平移画布

**预期结果**：所有平移方式都正常工作

**实际结果**：✅ 通过

### 测试场景 3：节点拖动 ✅

**步骤**：
1. 拖动单个节点
2. 观察节点是否跟随鼠标

**预期结果**：节点精确跟随鼠标

**实际结果**：✅ 通过

### 测试场景 4：框选 ✅

**步骤**：
1. 拖动鼠标创建框选框
2. 观察框选框位置

**预期结果**：框选框精确跟随鼠标

**实际结果**：✅ 通过

### 测试场景 5：边的渲染 ✅

**步骤**：
1. 观察节点之间的连线
2. 平移和缩放画布

**预期结果**：连线正确连接节点

**实际结果**：✅ 通过

## 性能影响

### 性能提升

✅ **更少的计算**：子组件不再需要进行 viewport 转换  
✅ **更简单的代码**：移除了重复的转换逻辑  
✅ **更少的 prop 传递**：减少了不必要的 prop

### 保持的优化

✅ **requestAnimationFrame**：仍然使用 RAF 批处理更新  
✅ **本地状态缓存**：`localNodePositionsRef` 和 `localViewportRef`  
✅ **状态管理优化**：避免频繁的 React 重渲染

## 技术要点

### 1. 坐标系统分离

- **存储层**：使用 canvas 坐标（与缩放无关）
- **渲染层**：通过 SVG transform 统一应用 viewport
- **事件层**：通过 `screenToCanvas` 转换鼠标坐标

### 2. 单一职责原则

- **Canvas 组件**：负责坐标转换和事件处理
- **子组件**：只负责渲染，使用传入的 canvas 坐标

### 3. 状态管理

- **框选状态**：在多个关键点清除，避免状态泄漏
- **双击检测**：使用 `e.detail` 区分单击和双击
- **事件优先级**：双击 > 框选 > 平移

## 总结

### 修复前的问题

1. ❌ 节点和边位置不正确（双重转换）
2. ❌ 双击创建节点后无法拖动画布（状态污染）
3. ❌ 代码复杂度高（重复的转换逻辑）

### 修复后的状态

1. ✅ 坐标系统统一且正确
2. ✅ 双击创建节点位置精确
3. ✅ 创建节点后画布拖动正常
4. ✅ 代码更简洁（移除了重复逻辑）
5. ✅ 性能更好（减少了不必要的计算）

### 架构改进

- **坐标系统**：从"多处转换"改为"单点转换"
- **组件设计**：从"自行转换"改为"直接使用"
- **状态管理**：从"隐式状态"改为"显式清理"

---

**修复时间**：2025-01-XX  
**测试状态**：✅ 所有测试通过  
**代码质量**：✅ 无 linter 错误，架构清晰

