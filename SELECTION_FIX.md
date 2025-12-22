# 选择交互逻辑修复

## 修复内容

### 问题描述

1. **Shift+框选不支持累加**：框选总是清除之前的选择，即使按下 Shift 键
2. **框选与 Shift+点击行为不一致**：Shift+点击支持累加，但框选不支持

### 解决方案

#### 1. 追踪框选时的 Shift 状态

添加 `boxSelectionShiftKeyRef` 来记录框选开始时的 Shift 键状态：

```typescript
const boxSelectionShiftKeyRef = useRef(false);
```

#### 2. 在开始框选时记录 Shift 状态

```typescript
const startBoxSelection = useCallback((e: React.MouseEvent) => {
  // 记录 shiftKey 状态，用于完成框选时判断
  boxSelectionShiftKeyRef.current = e.shiftKey;
  
  // Figma 行为：不按 Shift 时清除之前的选择，按 Shift 时保留
  if (!e.shiftKey) {
    handlePaneClick();
  }
  
  // 开始框选...
}, [...]);
```

#### 3. 在完成框选时根据 Shift 状态合并选择

```typescript
const finishBoxSelection = useCallback(() => {
  // ... 计算框选的节点 ...
  
  // Figma 行为：Shift 框选时，与现有选择合并（取并集）
  let finalSelection: Set<string>;
  if (boxSelectionShiftKeyRef.current) {
    // Shift 框选：累加到现有选择
    finalSelection = new Set([...selectedIdsRef.current, ...boxSelected]);
  } else {
    // 普通框选：只选中框选的节点
    finalSelection = boxSelected;
  }
  
  // 更新选择状态...
}, [...]);
```

## Figma 选择行为对齐

### 单击选择

- ✅ **单击节点**：选中该节点，清除其他选择
- ✅ **Shift+单击未选中节点**：添加到选择集合
- ✅ **Shift+单击已选中节点**：从选择集合中移除

### 框选

- ✅ **普通框选**：选中框选范围内的节点，清除之前的选择
- ✅ **Shift+框选**：框选范围内的节点累加到现有选择
- ✅ **部分重叠**：节点部分在框选范围内即被选中

### 组合场景

1. **先单击选中节点 A，再 Shift+框选节点 B、C**
   - 结果：A、B、C 都被选中 ✅

2. **先框选节点 A、B，再 Shift+点击节点 C**
   - 结果：A、B、C 都被选中 ✅

3. **先框选节点 A、B，再 Shift+点击节点 A**
   - 结果：只有 B 被选中（A 被移除）✅

4. **先单击选中节点 A，再普通框选节点 B、C**
   - 结果：只有 B、C 被选中（A 被清除）✅

## 测试清单

### 基础选择

- [ ] 单击节点：只选中该节点
- [ ] 单击空白：清除所有选择
- [ ] 单击边：选中该边

### Shift+点击

- [ ] Shift+点击未选中节点：添加到选择
- [ ] Shift+点击已选中节点：从选择中移除
- [ ] Shift+点击切换多次：正确 toggle

### 框选

- [ ] 普通框选：只选中框内节点
- [ ] 框选后单击节点：清除框选，只选中点击的节点
- [ ] 框选部分重叠节点：被选中

### Shift+框选

- [ ] Shift+框选：累加到现有选择
- [ ] 先单击后 Shift+框选：两者合并
- [ ] 先框选后 Shift+框选：两次框选合并
- [ ] Shift+框选重复节点：不重复添加

### 混合场景

- [ ] 先单击 A，Shift+点击 B，Shift+框选 C、D：A、B、C、D 都选中
- [ ] 先框选 A、B，Shift+点击 A：A 被移除，只剩 B
- [ ] 先单击 A，普通框选 B、C：A 被清除，只剩 B、C

## 技术实现

### 关键改进点

1. **状态追踪**
   - 使用 `boxSelectionShiftKeyRef` 记录框选开始时的 Shift 状态
   - 解决了 mousedown 和 mouseup 之间 Shift 状态可能变化的问题

2. **选择合并逻辑**
   - Shift 框选：`new Set([...current, ...boxSelected])`（并集）
   - 普通框选：直接使用 `boxSelected`（替换）

3. **清除时机**
   - 普通框选开始：立即清除之前的选择
   - Shift 框选开始：保留之前的选择

## 文件变更

- `src/features/canvas/hooks/useCanvasSelection.ts`
  - 添加 `boxSelectionShiftKeyRef`
  - 修改 `startBoxSelection`：根据 shiftKey 决定是否清除
  - 修改 `finishBoxSelection`：根据 shiftKey 决定合并或替换

## 性能影响

无性能影响：
- 只增加了一个 boolean ref
- 逻辑复杂度未增加
- 不影响 RAF 优化

---

**修复时间**：2025-01-XX  
**测试状态**：待验证  
**符合规范**：✅ Figma 选择行为

