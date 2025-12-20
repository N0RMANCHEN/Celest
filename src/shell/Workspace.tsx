/**
 * shell/Workspace.tsx
 * ----------------
 * Phase 1 Step3A-C workbench.
 *
 * NOTE (Step4C):
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to ReactFlow view-model).
 */

import FlowCanvas from "../features/canvas/FlowCanvas";
import InspectorPanel from "../features/inspector/InspectorPanel";
import TerminalPanel from "../features/terminal/TerminalPanel";
import BottomToolbar from "../_legacy/v0_fsgraph_mvp/layout/BottomToolbar";

import { useWorkbenchModel } from "../state/hooks/useWorkbenchModel";

import LeftSidebar from "./workbench/LeftSidebar";

export default function Workspace() {
  const vm = useWorkbenchModel();

  if (!vm.project) return null;

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
          <div className="centerStack__canvas">
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
          </div>

          {vm.panels.terminal ? (
            <div className="centerStack__terminal">
              <TerminalPanel />
            </div>
          ) : null}

          <BottomToolbar />
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
