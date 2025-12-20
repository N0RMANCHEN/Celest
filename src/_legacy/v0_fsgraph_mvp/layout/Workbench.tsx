/**
 * Workbench.tsx
 * ----------------
 * 修复：
 *  - useAppStore selector 返回新对象导致 getSnapshot 警告/潜在死循环
 *  - selector 内不 new 对象；focusRequest 在组件内 useMemo 构造
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import FlowCanvas from "../canvas/FlowCanvas";
import LeftSidebar from "./LeftSidebar";
import BottomToolbar from "./BottomToolbar";
import TerminalPanel from "./TerminalPanel";
import Inspector from "./Inspector";
import { useAppStore } from "../state/store";

const FALLBACK_VIEWPORT = { x: 0, y: 0, zoom: 1 };

export default function Workbench() {
  const {
    panels,
    project,
    selectedInfo,
    activeViewId,
    viewport,
    focusNodeId,
    focusNonce,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    setActiveView,
    updateActiveViewViewport,
  } = useAppStore(
    useShallow((s) => {
      const p = s.getActiveProject();
      const v = s.getActiveView();

      const first = p?.selectedIds?.[0];
      const info = p && first ? p.meta[first] ?? null : null;

      return {
        panels: s.panels,
        project: p,
        selectedInfo: info,

        activeViewId: v?.id ?? "main",
        viewport: v?.viewport ?? FALLBACK_VIEWPORT,

        // ✅ 不在 selector 里 new focusRequest
        focusNodeId: p?.focusNodeId,
        focusNonce: p?.focusNonce ?? 0,

        onNodesChange: s.onNodesChange,
        onEdgesChange: s.onEdgesChange,
        onConnect: s.onConnect,
        onSelectionChange: s.onSelectionChange,
        setActiveView: s.setActiveView,
        updateActiveViewViewport: s.updateActiveViewViewport,
      };
    })
  );

  const focusRequest = useMemo(() => {
    if (!focusNodeId) return null;
    return { nodeId: focusNodeId, nonce: focusNonce };
  }, [focusNodeId, focusNonce]);

  if (!project) return null;

  return (
    <div className="workbench">
      {panels.left ? (
        <div className="workbench__left">
          <LeftSidebar
            projectName={project.name}
            views={project.views}
            activeViewId={project.activeViewId}
            onSwitchView={(id) => setActiveView(id)}
          />
        </div>
      ) : null}

      <div className="workbench__center">
        <div className="centerStack">
          <div className="centerStack__canvas">
            <FlowCanvas
              nodes={project.nodes}
              edges={project.edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              activeViewId={activeViewId}
              viewport={viewport}
              onViewportChange={updateActiveViewViewport}
              focusRequest={focusRequest}
            />
          </div>

          {panels.terminal ? (
            <div className="centerStack__terminal">
              <TerminalPanel />
            </div>
          ) : null}

          <BottomToolbar />
        </div>
      </div>

      {panels.inspector ? (
        <div className="workbench__right">
          <Inspector selectedInfo={selectedInfo} onClose={() => {}} />
        </div>
      ) : null}
    </div>
  );
}
