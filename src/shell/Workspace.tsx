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

import LeftSidebar from "./workbench/LeftSidebar";

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

  return (
    <div className="workbench">
      {vm.panels.left ? (
        <div className="workbench__left">
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
        </div>
      ) : null}

      <div className="workbench__center">
        <div className="centerStack">
          {/* IMPORTANT: make canvas container relative so the toolbar anchors to canvas */}
          <div className="centerStack__canvas" style={{ position: "relative" }}>
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

            {/* Floating toolbar stays within the canvas area */}
            <BottomToolbar />
          </div>

          {vm.panels.terminal ? (
            <div className="centerStack__terminal">
              <TerminalPanel />
            </div>
          ) : null}
        </div>
      </div>

      {vm.panels.inspector ? (
        <div className="workbench__right">
          <InspectorPanel
            selectedNode={vm.selectedGraphNode}
            selectedFsEntry={vm.selectedInfo}
            saveUi={vm.saveUi}
            onChangeTitle={vm.onUpdateNodeTitle}
            onChangeNoteText={vm.onUpdateNoteText}
            onChangeFilePath={vm.onUpdateFilePath}
          />
        </div>
      ) : null}
    </div>
  );
}
