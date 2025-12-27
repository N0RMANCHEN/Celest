/**
 * features/canvas/core/UndoHistory.ts
 * ----------------
 * Canvas 撤销历史记录管理
 */

import type { CodeGraphNode, CodeGraphEdge } from "../../../entities/graph/types";

export type GraphSnapshot = {
  nodes: Record<string, CodeGraphNode>;
  edges: Record<string, CodeGraphEdge>;
};

export class UndoHistory {
  private history: GraphSnapshot[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;

  /**
   * 保存当前状态到历史记录
   * @param skipIfUnchanged 如果为 true，且新状态与最后一个状态相同，则跳过保存
   */
  saveSnapshot(
    nodes: Record<string, CodeGraphNode>,
    edges: Record<string, CodeGraphEdge>,
    skipIfUnchanged: boolean = true
  ): void {
    // 深拷贝当前状态
    const snapshot: GraphSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // 如果当前不在历史记录的末尾，删除后面的记录（分支历史）
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 如果启用 skipIfUnchanged，且历史记录不为空，检查是否与当前索引指向的状态相同
    // 注意：这里检查的是 currentIndex 指向的状态，而不是最后一个状态
    // 因为如果用户 undo 后，currentIndex 可能不是指向最后一个状态
    if (skipIfUnchanged && this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      const currentSnapshot = this.history[this.currentIndex];
      const nodesEqual = JSON.stringify(currentSnapshot.nodes) === JSON.stringify(snapshot.nodes);
      const edgesEqual = JSON.stringify(currentSnapshot.edges) === JSON.stringify(snapshot.edges);
      if (nodesEqual && edgesEqual) {
        return; // 状态未改变，不保存
      }
    }

    this.history.push(snapshot);
    this.currentIndex = this.history.length - 1;

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

  }

  /**
   * 撤销到上一个状态
   */
  undo(): GraphSnapshot | null {
    if (this.currentIndex <= 0) {
      return null; // 没有可撤销的状态
    }

    this.currentIndex--;
    return this.history[this.currentIndex];
  }

  /**
   * 重做到下一个状态
   */
  redo(): GraphSnapshot | null {
    if (this.currentIndex >= this.history.length - 1) {
      return null; // 没有可重做的状态
    }

    this.currentIndex++;
    return this.history[this.currentIndex];
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 清除历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 获取当前状态索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}

// 全局撤销历史实例（每个项目一个）
const undoHistoryMap = new Map<string, UndoHistory>();

/**
 * 获取或创建项目的撤销历史
 */
export function getUndoHistory(projectId: string): UndoHistory {
  if (!undoHistoryMap.has(projectId)) {
    undoHistoryMap.set(projectId, new UndoHistory());
  }
  return undoHistoryMap.get(projectId)!;
}

/**
 * 清除项目的撤销历史
 */
export function clearUndoHistory(projectId: string): void {
  undoHistoryMap.delete(projectId);
}

