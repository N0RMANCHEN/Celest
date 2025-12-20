/**
 * state/types.ts
 * ----------------
 * Centralized Zustand slice types for Phase 1.
 *
 * Notes:
 * - Phase 1 still uses FSGraph-based ProjectState (nodes/edges come from scanning the folder).
 * - Step4A adds FsIndexSnapshot (serializable) to decouple Left Tree navigation from Canvas.
 * - Keep slice boundaries explicit so later we can move stable domain types into `src/entities/*`.
 */

import type { Connection, EdgeChange, NodeChange, Viewport } from "reactflow";

import type { FsIndexSnapshot } from "../entities/fsIndex/types";
import type { ProjectState, ViewState } from "../features/project/openProject";
import type { RecentItem } from "../features/project/recentStore";

export type Panels = {
  left: boolean;
  inspector: boolean;
  terminal: boolean;
};

// ---------------- Slices ----------------

export type ShellSlice = {
  panels: Panels;
  togglePanel: (k: keyof Panels) => void;
};

export type ProjectSlice = {
  projects: ProjectState[];
  activeProjectId?: string;
  recents: RecentItem[];

  hydrateRecents: () => Promise<void>;

  goHome: () => void;
  setActiveProject: (id: string) => void;
  closeProject: (id: string) => void;

  openProjectFolder: () => Promise<void>;
  reopenRecent: (key: string) => Promise<void>;

  /** Step5A: manual save hook for /.nodeide assets (CodeGraph + viewports). */
  saveActiveProject: () => Promise<void>;

  getActiveProject: () => ProjectState | null;
};

export type TerminalLevel = "info" | "warn" | "error";

export type TerminalLine = {
  id: string;
  ts: string; // ISO
  level: TerminalLevel;
  message: string;
};

export type TerminalSlice = {
  terminalLines: TerminalLine[];
  terminalLog: (level: TerminalLevel, message: string) => void;
  terminalClear: () => void;
};

export type SaveStatus = "idle" | "saving" | "error";

export type SaveUiState = {
  dirty: boolean;
  status: SaveStatus;
  /** monotonically increasing counter for each mutation that should be persisted */
  seq: number;
  lastSavedAt?: string;
  lastError?: string;
};

export type PersistenceSlice = {
  saveUiByProjectId: Record<string, SaveUiState>;

  initProjectPersistence: (projectId: string) => void;
  removeProjectPersistence: (projectId: string) => void;

  /** Mark active project as dirty and schedule debounced autosave. */
  markActiveProjectDirty: (source: "graph" | "viewport" | "view") => void;

  /** Flush active project persistence immediately. */
  flushActiveProjectSave: (opts: { reason: "manual" | "hotkey" | `autosave:${string}` }) => Promise<void>;

  /** Convenience getter for UI (TopTabs). */
  getActiveSaveUi: () => SaveUiState | null;
};

export type ViewSlice = {
  getActiveView: () => ViewState | null;
  setActiveView: (viewId: string) => void;
  updateActiveViewViewport: (vp: Viewport) => void;
};

export type GraphSlice = {
  selectAndFocusNode: (nodeId: string) => void;

  /** Step4C: quick-create a Note node by double-clicking the canvas. */
  createNoteNodeAt: (pos: { x: number; y: number }) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;
  onSelectionChange: (ids: string[]) => void;
};

/**
 * Step4A:
 * - Store serializable FS Index snapshots per opened project.
 * - UI will start using this in Step4B (Left Tree).
 */
export type FsIndexSlice = {
  fsIndexByProjectId: Record<string, FsIndexSnapshot>;
  setFsIndexSnapshot: (projectId: string, snapshot: FsIndexSnapshot) => void;
  removeFsIndexSnapshot: (projectId: string) => void;
  getFsIndexForProject: (projectId: string) => FsIndexSnapshot | null;
  getActiveFsIndex: () => FsIndexSnapshot | null;

  /** UI state: expanded/collapsed directories in the left tree (per project). */
  fsExpandedByProjectId: Record<string, Record<string, boolean>>;

  /** UI state: selected FS entry id in the left tree (per project). */
  fsSelectedIdByProjectId: Record<string, string | null>;

  toggleFsExpanded: (projectId: string, dirId: string) => void;
  selectFsEntry: (projectId: string, entryId: string) => void;
  clearFsSelection: (projectId: string) => void;

  getActiveFsExpanded: () => Record<string, boolean>;
  getActiveFsSelectedId: () => string | null;
};

/**
 * Phase 1 Step3A-C does not wire editor into UI yet.
 * Keep the slice as a placeholder so other modules can depend on stable names.
 */
// Placeholder slice: keep a stable name without restricting AppState keys.
export type EditorSlice = {
  /**
   * Phase 1 Step4B:
   * Minimal editor state, used when selecting a file from the left tree.
   * Step6 will upgrade this into Monaco buffers + save/load.
   */
  activeFilePath: string | null;
  openFile: (path: string) => void;
  closeFile: () => void;
};

export type AppState =
  ShellSlice &
  ProjectSlice &
  ViewSlice &
  GraphSlice &
  FsIndexSlice &
  EditorSlice &
  TerminalSlice &
  PersistenceSlice;
