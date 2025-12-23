/**
 * features/canvas/utils/handlePosition.ts
 * ----------------
 * 计算 handle 位置的工具函数
 */

import type { CanvasViewport } from "../../../entities/canvas/canvasEvents";
import { screenToCanvas } from "../core/ViewportManager";

/**
 * 计算 handle 的中心点（canvas 坐标）
 */
export function getHandleCanvasPosition(
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewport: CanvasViewport,
  nodeId: string,
  handleId: string
): { x: number; y: number } | null {
  const svgEl = svgRef.current;
  if (!svgEl) return null;

  const svgRect = svgEl.getBoundingClientRect();
  // 选择器：匹配当前 nodeId 和 handleId 的 handle 元素
  // 未来有多个端口时，依靠 data-handle-id 精确匹配
  const selector = `.canvas-handle[data-node-id="${nodeId}"][data-handle-id="${handleId}"]`;
  const handleEl = svgEl.querySelector(selector) as HTMLElement | null;
  if (!handleEl) return null;

  const rect = handleEl.getBoundingClientRect();
  const centerScreen = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  // 转换为相对 svg 的坐标，再转换为 canvas 坐标
  const relativeToSvg = {
    x: centerScreen.x - svgRect.left,
    y: centerScreen.y - svgRect.top,
  };

  return screenToCanvas(relativeToSvg, viewport);
}

