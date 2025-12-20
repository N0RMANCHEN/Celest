/**
 * state/hooks/useWorkbenchModel.ts
 * ----------------
 * Build a stable "view-model" for Workbench UI.
 *
 * Step4C:
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to ReactFlow view model).
 */

import { useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Viewport } from "reactflow";
import type { FsMeta as LegacyFsMeta } from "../../_legacy/v0_fsgraph_mvp/services/fsGraph";

import { codeGraphToFlow } from "../../features/canvas/adapters/codeGraphToFlow";
import type { Vec2 } from "../../entities/graph/types";

import { useAppStore } from "../store";

const FALLBACK_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
const EMPTY_OBJ: Record<string, never> = Object.freeze({});

export type FocusRequest = { nodeId: string; nonce: number };

export function useWorkbenchModel() {
  const panels = useAppStore((s) => s.panels);
  const project = useAppStore((s) => s.getActiveProject());
  const activeView = useAppStore((s) => s.getActiveView());
  const fsExpandedByProjectId = useAppStore((s) => s.fsExpandedByProjectId);
  const fsSelectedIdByProjectId = useAppStore((s) => s.fsSelectedIdByProjectId);
  const getFsIndexForProject = useAppStore((s) => s.getFsIndexForProject);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const focusNodeId = project?.focusNodeId ?? null;
  const focusNonce = project?.focusNonce ?? 0;

  const {
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
    useShallow((s) => ({
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      onSelectionChange: s.onSelectionChange,
      createNoteNodeAt: s.createNoteNodeAt,
      setActiveView: s.setActiveView,
      updateActiveViewViewport: s.updateActiveViewViewport,
      toggleFsExpanded: s.toggleFsExpanded,
      selectFsEntry: s.selectFsEntry,
      openFile: s.openFile,
    }))
  );

  const fsIndex = useMemo(() => {
    if (!project) return null;
    return getFsIndexForProject(project.id);
  }, [getFsIndexForProject, project]);

  const fsExpanded = useMemo(() => {
    if (!project) return EMPTY_OBJ;
    return fsExpandedByProjectId[project.id] ?? EMPTY_OBJ;
  }, [fsExpandedByProjectId, project]);

  const fsSelectedId = useMemo(() => {
    if (!project) return null;
    return fsSelectedIdByProjectId[project.id] ?? null;
  }, [fsSelectedIdByProjectId, project]);

  const selectedInfo: LegacyFsMeta | null = useMemo(() => {
    const fsNode = fsIndex && fsSelectedId ? fsIndex.nodes[fsSelectedId] : null;
    if (!fsNode) return null;
    return {
      id: fsNode.id,
      kind: fsNode.kind,
      name: fsNode.name,
      path: fsNode.path,
      ...(fsNode.parentId ? { parentId: fsNode.parentId } : {}),
    };
  }, [fsIndex, fsSelectedId]);

  const activeViewId = activeView?.id ?? "main";
  const viewport = activeView?.viewport ?? FALLBACK_VIEWPORT;

  const focusRequest: FocusRequest | null = useMemo(() => {
    if (!focusNodeId) return null;
    return { nodeId: focusNodeId, nonce: focusNonce };
  }, [focusNodeId, focusNonce]);

  const canvasVM = useMemo(() => {
    if (!project) return { nodes: [], edges: [] };
    return codeGraphToFlow(project.graph);
  }, [project]);

  const handleCreateNote = useCallback(
    (pos: Vec2) => {
      createNoteNodeAt(pos);
    },
    [createNoteNodeAt]
  );

  const handleToggleFsExpanded = useCallback(
    (dirId: string) => {
      if (!project) return;
      toggleFsExpanded(project.id, dirId);
    },
    [project, toggleFsExpanded]
  );

  const handleSelectFsEntry = useCallback(
    (entryId: string) => {
      if (!project) return;
      selectFsEntry(project.id, entryId);
    },
    [project, selectFsEntry]
  );

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
    toggleFsExpanded: handleToggleFsExpanded,
    selectFsEntry: handleSelectFsEntry,
    openFile,
  };
}
