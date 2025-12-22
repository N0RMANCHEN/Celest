# 连线位置修复报告

## 问题描述

用户报告：
1. 连线成功后的线的位置不对
2. 连线的线和实际 handle 位置有差异，偏下了

## 根本原因

### 坐标系统混乱

**问题代码**（修复前）：

在 `CanvasNode.tsx` 中：
```typescript
onMouseDown={(e) => {
  onConnectionStart(node.id, handleId, "source", {
    x: e.clientX,  // ❌ 屏幕坐标
    y: e.clientY,  // ❌ 屏幕坐标
  });
}}
```

在 `useCanvasConnection.ts` 中：
```typescript
const handleConnectionStart = (screenPosition: { x: number; y: number }) => {
  const canvasPos = screenPointToCanvas(screenPosition);  // 转换为 canvas 坐标
  setConnectionState({
    sourcePosition: canvasPos,  // ← 转换后的坐标
    // ...
  });
};
```

### 为什么会偏移？

1. **Handle 的 DOM 位置**不准确：
   - Handle 使用 `position: absolute; top: 50%; transform: translateY(-50%)`
   - `e.clientX/Y` 是鼠标点击位置，不是 handle 中心点

2. **屏幕坐标转换 canvas 坐标**时的误差：
   - SVG rect 的 bounding box 计算可能有细微偏差
   - 与边的计算方式不一致

3. **边的位置计算**使用的是节点位置 + 尺寸：
   ```typescript
   sourceHandle = {
     x: sourceNode.position.x + sourceSize.width,  // 节点右侧
     y: sourceNode.position.y + sourceSize.height / 2,  // 节点垂直中心
   };
   ```

### 不一致的根源

连线开始位置使用：**DOM 坐标 → 转换 → Canvas 坐标**  
边的渲染位置使用：**节点位置 + 尺寸计算 → Canvas 坐标**

这两种方式的结果不一致！

## 解决方案

### 核心策略：统一使用节点位置计算

直接在 `CanvasNode.tsx` 中计算 handle 的 **canvas 坐标**，与边的计算逻辑完全一致。

#### 修复 1：CanvasNode 直接计算 canvas 坐标

```typescript
onMouseDown={(e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!onConnectionStart) return;
  
  // 计算 handle 在 canvas 坐标系中的位置（与边的计算一致）
  const handleCanvasPos = {
    x: node.position.x + size.width,       // 节点右侧
    y: node.position.y + size.height / 2,  // 节点垂直中心
  };
  
  onConnectionStart(
    node.id,
    spec.ports[1]?.id ?? "out",
    "source",
    handleCanvasPos  // 直接传 canvas 坐标
  );
}}
```

**关键改进**：
- ✅ 不再使用 `e.clientX/Y`（屏幕坐标）
- ✅ 直接计算 canvas 坐标
- ✅ 与边的计算逻辑完全一致：`node.position + size`

#### 修复 2：useCanvasConnection 直接接收 canvas 坐标

```typescript
const handleConnectionStart = useCallback(
  (
    nodeId: string,
    handleId: string,
    handleType: "source" | "target",
    canvasPosition: { x: number; y: number }  // 改为接收 canvas 坐标
  ) => {
    if (handleType !== "source") return;

    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceHandleType: handleType,
      sourcePosition: canvasPosition,  // 直接使用，无需转换
      currentPosition: canvasPosition,
      // ...
    });
  },
  []  // 无需依赖 screenPointToCanvas
);
```

**关键改进**：
- ✅ 移除了坐标转换环节
- ✅ 减少了误差来源
- ✅ 简化了代码逻辑

## 坐标一致性验证

### 连线起点（输出端口）

**CanvasNode 计算**：
```typescript
x: node.position.x + size.width
y: node.position.y + size.height / 2
```

**边渲染时计算**（Canvas.tsx edgePositions）：
```typescript
sourceHandle = {
  x: sourceNode.position.x + sourceSize.width,
  y: sourceNode.position.y + sourceSize.height / 2,
};
```

✅ **完全一致**！

### 连线终点（输入端口）

**边渲染时计算**：
```typescript
targetHandle = {
  x: targetNode.position.x,  // 节点左侧
  y: targetNode.position.y + targetSize.height / 2,  // 节点垂直中心
};
```

**Handle 的 DOM 位置**（CanvasNode）：
- Left handle: `left: -6, top: 50%, transform: translateY(-50%)`
- 实际中心：节点左边缘外 6px，垂直居中

虽然 DOM 位置略有偏移（-6px），但 canvas 坐标使用节点边缘（x: 0），这是正确的，因为：
- 边应该连接到节点边缘
- Handle 的视觉位置（外凸）只是装饰

## 测试验证

### 测试场景 1：创建连线

**步骤**：
1. 从节点 A 的输出端口拖拽
2. 释放到节点 B 的输入端口
3. 观察创建的连线位置

**预期结果**：
- ✅ 连线起点在节点 A 右侧中心
- ✅ 连线终点在节点 B 左侧中心
- ✅ 与 handle 位置完全对齐

### 测试场景 2：拖拽过程中的临时线

**步骤**：
1. 从节点 A 的输出端口开始拖拽
2. 移动鼠标
3. 观察临时连线

**预期结果**：
- ✅ 临时线起点在节点 A 右侧中心
- ✅ 临时线终点跟随鼠标
- ✅ 无偏移

### 测试场景 3：缩放后连线

**步骤**：
1. 创建一些连线
2. 缩放画布（Ctrl+滚轮）
3. 观察连线位置

**预期结果**：
- ✅ 连线始终对齐 handle
- ✅ 缩放不影响对齐

## 修改文件

1. **src/features/canvas/components/CanvasNode.tsx**
   - 修改输出端口的 `onMouseDown` 事件
   - 直接计算 canvas 坐标：`node.position + size`

2. **src/features/canvas/hooks/useCanvasConnection.ts**
   - 修改 `handleConnectionStart` 参数类型
   - 从 `screenPosition` 改为 `canvasPosition`
   - 移除坐标转换逻辑

## 技术改进

### 优势

1. **精确对齐**：连线和 handle 使用相同的计算方式
2. **代码简化**：移除了不必要的坐标转换
3. **性能提升**：减少了计算步骤
4. **易于维护**：坐标计算逻辑统一

### 架构清晰度

```
Handle 位置计算（CanvasNode）
  ↓
直接使用 node.position + size
  ↓
传递 canvas 坐标
  ↓
connectionState.sourcePosition
  ↓
ConnectionLine 渲染
  ↓
与 CanvasEdge 使用相同的坐标
  ↓
完美对齐 ✅
```

---

**修复时间**：2025-01-XX  
**测试状态**：待验证  
**预期效果**：连线位置完全对齐 handle，无偏移

