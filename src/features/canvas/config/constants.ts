export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 100;
export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1, z: 1 };

// 节点样式参数（与 CanvasNode.tsx 中的样式保持一致）
// 这些参数用于计算最小高度，确保与 DOM offsetHeight 测量方式一致
export const NODE_STYLE = {
  // padding: 10px (上下各 10px，共 20px)
  padding: 10,
  // border: 1px (上下各 1px，共 2px)
  // 注意：因为 boxSizing: border-box，所以 offsetHeight 包括 border
  border: 1,
  // 标题样式
  title: {
    fontSize: 13,
    lineHeight: 1.2,
  },
  // 文字内容样式
  subtitle: {
    marginTop: 6,
    lineHeight: 15, // 一行文字高度（与 subtitleStyle 的 lineHeight 保持一致）
    paddingBottom: 10,
  },
} as const;

/**
 * 计算节点的最小高度（与 DOM offsetHeight 测量方式一致）
 * 
 * 因为 boxSizing: border-box，所以 offsetHeight 包括：
 * - padding (上下各 10px = 20px)
 * - border (上下各 1px = 2px)
 * - 内容高度（标题 + 可选的文字内容）
 * 
 * @param hasSubtitle 是否有文字内容（subtitle）
 * @returns 最小高度（像素）
 */
export function calculateMinNodeHeight(hasSubtitle: boolean): number {
  const { padding, border, title, subtitle } = NODE_STYLE;
  
  // padding: 上下各 10px = 20px
  const paddingTotal = padding * 2;
  // border: 上下各 1px = 2px（boxSizing: border-box，包含在 offsetHeight 中）
  const borderTotal = border * 2;
  // 标题高度
  const titleHeight = title.fontSize * title.lineHeight;
  
  if (hasSubtitle) {
    // 有文字：padding + border + 标题 + marginTop + 一行文字 + paddingBottom - 10px（调整值）
    return (
      paddingTotal +
      borderTotal +
      titleHeight +
      subtitle.marginTop +
      subtitle.lineHeight +
      subtitle.paddingBottom -
      10
    );
  } else {
    // 无文字：padding + border + 标题
    // 注意：实际 DOM 测量可能还包括一些额外的空间（比如行高计算、浏览器渲染等）
    // 但为了与 DOM 测量一致，我们使用相同的计算方式
    return paddingTotal + borderTotal + titleHeight;
  }
}

// 导出预计算的最小高度常量（供 fallback 使用）
export const MIN_H_WITH_TEXT = calculateMinNodeHeight(true);
export const MIN_H_NO_TEXT = calculateMinNodeHeight(false);

