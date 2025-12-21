/**
 * state/hooks/useWorkbenchModel.ts
 * ----------------
 * Build a stable "view-model" for Workbench UI.
 *
 * P1-5: Refactored to use selectors for derived state.
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to ReactFlow view model).
 *
 * P1-1:
 * - state layer must not depend on ReactFlow/@xyflow types.
 */

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import type { CanvasViewport } from "../../entities/canvas/canvasEvents";
import type { Vec2 } from "../../entities/graph/types";

import { useAppStore } from "../store";
import {
  selectActiveFsIndex,
  selectActiveFsExpanded,
  selectActiveFsSelectedId,
  selectSelectedFsInfo,
} from "../selectors/fsIndexSelectors";
import {
  selectSelectedGraphNode,
  selectFocusRequest,
  selectCanvasViewModel,
  type FocusRequest,
} from "../selectors/workbenchSelectors";

const FALLBACK_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export type { FocusRequest };

export function useWorkbenchModel() {
  const panels = useAppStore((s) => s.panels);
  const project = useAppStore((s) => s.getActiveProject());
  const activeView = useAppStore((s) => s.getActiveView());
  const saveUi = useAppStore((s) => s.getActiveSaveUi());
  const activeFilePath = useAppStore((s) => s.activeFilePath);

  // Use selectors for derived state
  const fsIndex = useAppStore(selectActiveFsIndex);
  const fsSelectedId = useAppStore(selectActiveFsSelectedId);
  const selectedGraphNode = useAppStore(selectSelectedGraphNode);
  
  // CRITICAL: Use useShallow for selectors that return objects/arrays to prevent infinite loops.
  // These selectors return new references on every call, causing React to think state changed.
  const fsExpanded = useAppStore(
    useShallow((s) => selectActiveFsExpanded(s))
  );
  
  const selectedInfo = useAppStore(
    useShallow((s) => selectSelectedFsInfo(s))
  );
  
  const focusRequest = useAppStore(
    useShallow((s) => selectFocusRequest(s))
  );
  
  // CRITICAL: selectCanvasViewModel now returns a stable object reference when content is unchanged.
  // We don't need useShallow here because the selector itself handles reference stability.
  // This allows ReactFlow to see position updates during drag while preventing infinite loops.
  const canvasVM = useAppStore(selectCanvasViewModel);
  const canvasNodes = canvasVM.nodes;
  const canvasEdges = canvasVM.edges;

  const {
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    createNoteNodeAt,
    updateNodeTitle,
    updateNoteText,
    updateFilePath,
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
      updateNodeTitle: s.updateNodeTitle,
      updateNoteText: s.updateNoteText,
      updateFilePath: s.updateFilePath,
      setActiveView: s.setActiveView,
      updateActiveViewViewport: s.updateActiveViewViewport,
      toggleFsExpanded: s.toggleFsExpanded,
      selectFsEntry: s.selectFsEntry,
      openFile: s.openFile,
    }))
  );

  const activeViewId = activeView?.id ?? "main";
  const viewport = activeView?.viewport ?? FALLBACK_VIEWPORT;

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
    saveUi,

    canvasNodes,
    canvasEdges,

    activeViewId,
    viewport,
    focusRequest,
    selectedGraphNode,

    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    onCreateNoteNodeAt: handleCreateNote,
    onUpdateNodeTitle: updateNodeTitle,
    onUpdateNoteText: updateNoteText,
    onUpdateFilePath: updateFilePath,

    setActiveView,
    updateActiveViewViewport,
    toggleFsExpanded: handleToggleFsExpanded,
    selectFsEntry: handleSelectFsEntry,
    openFile,
  };
}
