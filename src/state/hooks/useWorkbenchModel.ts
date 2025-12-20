/**
 * state/hooks/useWorkbenchModel.ts
 * ----------------
 * Build a stable "view-model" for Workbench UI.
 *
 * Step4C:
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to ReactFlow view model).
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Viewport } from "reactflow";
import type { FsMeta as LegacyFsMeta } from "../../_legacy/v0_fsgraph_mvp/services/fsGraph";

import { codeGraphToFlow } from "../../features/canvas/adapters/codeGraphToFlow";
import type { Vec2 } from "../../entities/graph/types";

import { useAppStore } from "../store";

const FALLBACK_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export type FocusRequest = { nodeId: string; nonce: number };

export function useWorkbenchModel() {
  const {
    panels,
    project,
    selectedInfo,
    fsIndex,
    fsExpanded,
    fsSelectedId,
    activeFilePath,
    activeViewId,
    viewport,
    focusNodeId,
    focusNonce,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    createNoteNodeAt,
    setActiveView,
    updateActiveViewViewport,
    toggleFsExpanded,
    selectFsEntry,
    openFile,
  } = useAppStore(
    useShallow((s) => {
      const p = s.getActiveProject();
      const v = s.getActiveView();
      const idx = p ? s.getFsIndexForProject(p.id) : null;
      const fsSelected = p ? s.fsSelectedIdByProjectId[p.id] ?? null : null;

      const fsNode = idx && fsSelected ? idx.nodes[fsSelected] : null;

      // Inspector in Step4C only shows FS selection (Canvas selection will be added later).
      const info: LegacyFsMeta | null = fsNode
        ? {
            id: fsNode.id,
            kind: fsNode.kind,
            name: fsNode.name,
            path: fsNode.path,
            ...(fsNode.parentId ? { parentId: fsNode.parentId } : {}),
          }
        : null;

      return {
        panels: s.panels,
        project: p,
        selectedInfo: info,

        fsIndex: idx,
        fsExpanded: p ? s.fsExpandedByProjectId[p.id] ?? {} : {},
        fsSelectedId: fsSelected,
        activeFilePath: s.activeFilePath,

        activeViewId: v?.id ?? "main",
        viewport: v?.viewport ?? FALLBACK_VIEWPORT,

        focusNodeId: p?.focusNodeId,
        focusNonce: p?.focusNonce ?? 0,

        onNodesChange: s.onNodesChange,
        onEdgesChange: s.onEdgesChange,
        onConnect: s.onConnect,
        onSelectionChange: s.onSelectionChange,
        createNoteNodeAt: s.createNoteNodeAt,
        setActiveView: s.setActiveView,
        updateActiveViewViewport: s.updateActiveViewViewport,

        toggleFsExpanded: (dirId: string) => {
          if (!p) return;
          s.toggleFsExpanded(p.id, dirId);
        },
        selectFsEntry: (entryId: string) => {
          if (!p) return;
          s.selectFsEntry(p.id, entryId);
        },
        openFile: s.openFile,
      };
    })
  );

  const focusRequest: FocusRequest | null = useMemo(() => {
    if (!focusNodeId) return null;
    return { nodeId: focusNodeId, nonce: focusNonce };
  }, [focusNodeId, focusNonce]);

  const canvasVM = useMemo(() => {
    if (!project) return { nodes: [], edges: [] };
    return codeGraphToFlow(project.graph);
  }, [project]);

  const handleCreateNote = useMemo(() => {
    return (pos: Vec2) => createNoteNodeAt(pos);
  }, [createNoteNodeAt]);

  return {
    panels,
    project,
    selectedInfo,

    fsIndex,
    fsExpanded,
    fsSelectedId,
    activeFilePath,

    canvasNodes: canvasVM.nodes,
    canvasEdges: canvasVM.edges,

    activeViewId,
    viewport,
    focusRequest,

    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    onCreateNoteNodeAt: handleCreateNote,

    setActiveView,
    updateActiveViewViewport,
    toggleFsExpanded,
    selectFsEntry,
    openFile,
  };
}
