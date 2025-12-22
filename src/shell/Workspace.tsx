/**
 * shell/Workspace.tsx
 * ----------------
 * Phase 1 workbench.
 *
 * NOTE:
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to custom Canvas view-model).
 */

import { Canvas } from "../features/canvas/Canvas";
import BottomToolbar from "../features/canvas/BottomToolbar";
import InspectorPanel from "../features/inspector/InspectorPanel";
import TerminalPanel from "../features/terminal/TerminalPanel";

import { useWorkbenchModel } from "../state/hooks/useWorkbenchModel";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { logger } from "../shared/utils/logger";
import { useAppStore } from "../state/store";
import { HorizontalPane, VerticalPane } from "../layout/ResizablePane";

import LeftSidebar from "./workbench/LeftSidebar";

export default function Workspace() {
  const vm = useWorkbenchModel();
  const terminalLog = useAppStore((s) => s.terminalLog);

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const saveBadge = (() => {
    const ui = vm.saveUi;
    if (!ui) return null;

    let text = "已保存";
    let bg = "rgba(16, 185, 129, 0.14)"; // green
    let color = "#065f46";

    if (ui.status === "saving") {
      text = "保存中…";
      bg = "rgba(59, 130, 246, 0.14)"; // blue
      color = "#1d4ed8";
    } else if (ui.status === "error") {
      text = `保存失败：${ui.lastError ?? "未知错误"}`;
      bg = "rgba(248, 113, 113, 0.16)"; // red
      color = "#b91c1c";
    } else if (ui.dirty) {
      text = "有未保存的更改";
      bg = "rgba(234, 179, 8, 0.16)"; // amber
      color = "#92400e";
    } else if (ui.lastSavedAt) {
      text = `已保存 ${formatTime(ui.lastSavedAt)}`;
    }

    return (
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          padding: "6px 10px",
          borderRadius: 8,
          background: bg,
          color,
          fontSize: 12,
          lineHeight: 1.4,
          border: "1px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(4px)",
          zIndex: 60,
          maxWidth: 240,
        }}
      >
        {text}
      </div>
    );
  })();

  if (!vm.project) return null;

  const handleCanvasError = (error: Error, errorInfo: React.ErrorInfo) => {
    terminalLog(
      "error",
      `Canvas error: ${error.message}. Check console for details.`
    );
    logger.error("[Workspace] Canvas error:", error, errorInfo);
  };

  // 左侧面板
  const leftPanel = vm.panels.left ? (
    <LeftSidebar
      project={vm.project}
      onSwitchView={(id) => vm.setActiveView(id)}
      fsIndex={vm.fsIndex}
      expanded={vm.fsExpanded}
      selectedId={vm.fsSelectedId}
      onToggleExpanded={(id) => vm.toggleFsExpanded(id)}
      onSelect={(id) => vm.selectFsEntry(id)}
      onOpenFile={(path) => vm.openFile(path)}
    />
  ) : null;

  // 右侧面板
  const rightPanel = vm.panels.inspector ? (
    <InspectorPanel
      selectedNode={vm.selectedGraphNode}
      selectedFsEntry={vm.selectedInfo}
      saveUi={vm.saveUi}
      onChangeTitle={vm.onUpdateNodeTitle}
      onChangeNoteText={vm.onUpdateNoteText}
      onChangeFilePath={vm.onUpdateFilePath}
    />
  ) : null;

  // 中心区域（Canvas + Terminal）
  const centerContent = (
    <div className="workbench__center">
      {vm.panels.terminal ? (
        <VerticalPane
          top={
            <div className="workbench__canvas" style={{ position: "relative" }}>
              {saveBadge}
              <ErrorBoundary context="Canvas" onError={handleCanvasError}>
                <Canvas
                  nodes={vm.canvasNodes}
                  edges={vm.canvasEdges}
                  onNodesChange={vm.onNodesChange}
                  onEdgesChange={vm.onEdgesChange}
                  onConnect={vm.onConnect}
                  onSelectionChange={vm.onSelectionChange}
                  onCreateNoteNodeAt={vm.onCreateNoteNodeAt}
                  activeViewId={vm.activeViewId}
                  viewport={vm.viewport}
                  onViewportChange={vm.updateActiveViewViewport}
                  focusRequest={vm.focusRequest}
                />
              </ErrorBoundary>
              <BottomToolbar />
            </div>
          }
          bottom={<TerminalPanel />}
          defaultTopHeight={500}
          minTopHeight={200}
          maxTopHeight={2000}
          storageKey="celest-terminal-height"
        />
      ) : (
        <div className="workbench__canvas" style={{ position: "relative" }}>
          {saveBadge}
          <ErrorBoundary context="Canvas" onError={handleCanvasError}>
            <Canvas
              nodes={vm.canvasNodes}
              edges={vm.canvasEdges}
              onNodesChange={vm.onNodesChange}
              onEdgesChange={vm.onEdgesChange}
              onConnect={vm.onConnect}
              onSelectionChange={vm.onSelectionChange}
              onCreateNoteNodeAt={vm.onCreateNoteNodeAt}
              activeViewId={vm.activeViewId}
              viewport={vm.viewport}
              onViewportChange={vm.updateActiveViewViewport}
              focusRequest={vm.focusRequest}
            />
          </ErrorBoundary>
          <BottomToolbar />
        </div>
      )}
    </div>
  );

  return (
    <div className="workbench">
      {/* 三栏布局：左侧 | 中心 | 右侧 */}
      {leftPanel && rightPanel ? (
        <HorizontalPane
          left={leftPanel}
          right={
            <HorizontalPane
              left={centerContent}
              right={rightPanel}
              mode="right-fixed"
              defaultRightWidth={320}
              minRightWidth={240}
              maxRightWidth={600}
              minLeftWidth={600}
              storageKey="celest-right-panel-width"
            />
          }
          mode="left-fixed"
          defaultLeftWidth={280}
          minLeftWidth={200}
          maxLeftWidth={500}
          storageKey="celest-left-panel-width"
        />
      ) : leftPanel ? (
        <HorizontalPane
          left={leftPanel}
          right={centerContent}
          mode="left-fixed"
          defaultLeftWidth={280}
          minLeftWidth={200}
          maxLeftWidth={500}
          storageKey="celest-left-panel-width"
        />
      ) : rightPanel ? (
        <HorizontalPane
          left={centerContent}
          right={rightPanel}
          mode="right-fixed"
          defaultRightWidth={320}
          minRightWidth={240}
          maxRightWidth={600}
          minLeftWidth={600}
          storageKey="celest-right-panel-width"
        />
      ) : (
        centerContent
      )}
    </div>
  );
}
