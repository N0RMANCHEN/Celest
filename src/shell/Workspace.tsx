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
import { useAppStore } from "../state/store";
import { HorizontalPane, VerticalPane } from "../layout/ResizablePane";

import LeftSidebar from "./workbench/LeftSidebar";

function SaveIndicator({
  ui,
}: {
  ui: ReturnType<typeof useWorkbenchModel>["saveUi"];
}) {
  if (!ui) return null;
  let text = "未保存";
  if (ui.status === "saving") text = "保存中…";
  else if (ui.status === "error")
    text = ui.lastError ? `保存失败: ${ui.lastError}` : "保存失败";
  else if (ui.lastSavedAt)
    text = `已保存 ${new Date(ui.lastSavedAt).toLocaleTimeString()}`;

  return (
    <div
      className="save-indicator"
      aria-live="polite"
      style={{
        fontSize: 12,
        color: "var(--text)",
        padding: "6px 10px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.9)",
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      {text}
    </div>
  );
}

export default function Workspace() {
  const vm = useWorkbenchModel();
  const terminalLog = useAppStore((s) => s.terminalLog);

  if (!vm.project) return null;

  const handleCanvasError = (error: Error, errorInfo: React.ErrorInfo) => {
    terminalLog(
      "error",
      `Canvas error: ${error.message}. Check console for details.`
    );
    console.error("[Workspace] Canvas error:", error, errorInfo);
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
      selectedNode={vm.inspectorNodeViewModel}
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
              <ErrorBoundary onError={handleCanvasError}>
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
              <div style={{ position: "absolute", right: 16, bottom: 16 }}>
                <SaveIndicator ui={vm.saveUi} />
              </div>
            </div>
          }
          bottom={
            <div className="terminal__wrap">
              <TerminalPanel />
            </div>
          }
          defaultTopHeight={500}
          minTopHeight={200}
          maxTopHeight={2000}
          storageKey="celest-terminal-height"
        />
      ) : (
        <div className="workbench__canvas" style={{ position: "relative" }}>
          <ErrorBoundary onError={handleCanvasError}>
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
          <div style={{ position: "absolute", right: 16, bottom: 16 }}>
            <SaveIndicator ui={vm.saveUi} />
          </div>
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
