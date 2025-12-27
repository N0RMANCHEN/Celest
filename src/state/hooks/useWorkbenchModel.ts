/**
 * state/hooks/useWorkbenchModel.ts
 * ----------------
 * Build a stable "view-model" for Workbench UI.
 *
 * P1-5: Refactored to use selectors for derived state.
 * - Left Tree uses FsIndexSnapshot.
 * - Canvas uses CodeGraphModel (converted to custom Canvas view model).
 *
 * P0-1.5: Custom Canvas implementation (replaced ReactFlow).
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
import { selectInspectorNodeViewModel } from "../selectors/inspectorSelectors";

const FALLBACK_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1, z: 1 };

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
  const inspectorNodeViewModel = useAppStore(
    useShallow((s) => selectInspectorNodeViewModel(s))
  );
  
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
  
  // P0-1.5: Use custom Canvas implementation
  // CRITICAL: selectCanvasViewModel returns a stable object reference when content is unchanged.
  // We don't need useShallow here because the selector itself handles reference stability.
  const canvasVM = useAppStore(selectCanvasViewModel);
  const canvasNodes = canvasVM.nodes;
  const canvasEdges = canvasVM.edges;

  const {
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    createNoteNodeAt,
    copySelectionToClipboard,
    cutSelectionToClipboard,
    pasteClipboardAt,
    duplicateNodesForDrag,
    updateNodeTitle,
    updateNoteText,
    updateFilePath,
    setActiveView,
    updateActiveViewViewport,
    toggleFsExpanded,
    selectFsEntry,
    openFile,
    undoCanvas,
    redoCanvas,
  } = useAppStore(
    useShallow((s) => ({
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      onSelectionChange: s.onSelectionChange,
      createNoteNodeAt: s.createNoteNodeAt,
      copySelectionToClipboard: s.copySelectionToClipboard,
      cutSelectionToClipboard: s.cutSelectionToClipboard,
      pasteClipboardAt: s.pasteClipboardAt,
      duplicateNodesForDrag: s.duplicateNodesForDrag,
      updateNodeTitle: s.updateNodeTitle,
      updateNoteText: s.updateNoteText,
      updateFilePath: s.updateFilePath,
      setActiveView: s.setActiveView,
      updateActiveViewViewport: s.updateActiveViewViewport,
      toggleFsExpanded: s.toggleFsExpanded,
      selectFsEntry: s.selectFsEntry,
      openFile: s.openFile,
      undoCanvas: s.undoCanvas,
      redoCanvas: s.redoCanvas,
    }))
  );

  const activeViewId = activeView?.id ?? "main";
  const viewport = activeView
    ? { ...activeView.viewport, z: activeView.viewport.z ?? activeView.viewport.zoom }
    : FALLBACK_VIEWPORT;

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
    inspectorNodeViewModel,

    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    onCreateNoteNodeAt: handleCreateNote,
    onCopySelectionToClipboard: copySelectionToClipboard,
    onCutSelectionToClipboard: cutSelectionToClipboard,
    onPasteClipboardAt: pasteClipboardAt,
    onDuplicateNodesForDrag: duplicateNodesForDrag,
    onUpdateNodeTitle: updateNodeTitle,
    onUpdateNoteText: updateNoteText,
    onUpdateFilePath: updateFilePath,
    onUndoCanvas: undoCanvas,
    onRedoCanvas: redoCanvas,

    setActiveView,
    updateActiveViewViewport,
    toggleFsExpanded: handleToggleFsExpanded,
    selectFsEntry: handleSelectFsEntry,
    openFile,
  };
}
