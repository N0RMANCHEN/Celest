/**
 * shell/Workspace.tsx
 * ----------------
 * Phase 1 workbench.
 *
 * NOTE:
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to ReactFlow view-model).
 */

import FlowCanvas from "../features/canvas/FlowCanvas";
import BottomToolbar from "../features/canvas/BottomToolbar";
import InspectorPanel from "../features/inspector/InspectorPanel";
import TerminalPanel from "../features/terminal/TerminalPanel";

import { useWorkbenchModel } from "../state/hooks/useWorkbenchModel";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { useAppStore } from "../state/store";
import { useEffect, useRef } from "react";

import LeftSidebar from "./workbench/LeftSidebar";

export default function Workspace() {
  const vm = useWorkbenchModel();
  const terminalLog = useAppStore((s) => s.terminalLog);
  const placeholderNodesRef = useRef<Set<string>>(new Set());

  if (!vm.project) return null;

  const handleCanvasError = (error: Error, errorInfo: React.ErrorInfo) => {
    terminalLog(
      "error",
      `Canvas error: ${error.message}. Check console for details.`
    );
    console.error("[Workspace] Canvas error:", error, errorInfo);
  };

  // Detect placeholder nodes and log to terminal
  useEffect(() => {
    const placeholderNodes = vm.canvasNodes.filter(
      (n) => n.data.title?.startsWith("[Placeholder:")
    );
    const newPlaceholderIds = new Set(
      placeholderNodes.map((n) => n.id)
    );
    const previousIds = placeholderNodesRef.current;

    // Log newly detected placeholder nodes
    for (const node of placeholderNodes) {
      if (!previousIds.has(node.id)) {
        terminalLog(
          "warn",
          `Node conversion failed for "${node.id}", placeholder created. Check console for details.`
        );
      }
    }

    placeholderNodesRef.current = newPlaceholderIds;
  }, [vm.canvasNodes, terminalLog]);

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
              <FlowCanvas
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
