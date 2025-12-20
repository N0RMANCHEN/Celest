/**
 * store.ts
 * ----------------
 * 用途：
 *  - 应用全局状态（AppShell）+ 多项目（Tabs）+ 每项目图数据（ProjectState）
 *  - 支持：
 *    - Open Project Folder（新建一个 Project Tab）
 *    - Close / Switch Project
 *    - Home（项目列表/最近）
 *    - Panels：Left / Inspector / Terminal（主画布以外都可隐藏）
 *    - Views：固定 2 个（Main / View 2），保存 viewport + scopeStack（为未来层级进入预留）
 *    - Tree：展开状态 + 点击文件/文件夹 -> 选中对应 Node 并请求画布 focus
 *    - 文件操作：读取/编辑/保存（MVP：File System Access API）
 *
 * 对外接口：
 *  - export const useAppStore（主 store hook）
 *  - 兼容导出：useGraphStore（旧名字别的文件若还在用，不会直接炸）
 */

import { create } from "zustand";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  Viewport,
} from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import { nanoid } from "nanoid";
import {
  buildFsGraph,
  type FsMeta,
  type NodeData,
  type EdgeData,
} from "../services/fsGraph";

/**
 * 统一的默认 viewport（避免 selector 里临时 new object 导致 externalStore 抖动）
 */
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export type ViewState = {
  id: string;
  name: string;
  scopeStack: string[];
  viewport: Viewport;
};

type FileState = {
  isOpen: boolean;
  loading?: boolean;
  saving?: boolean;
  dirty?: boolean;
  text?: string;
};

export type ProjectState = {
  id: string;
  name: string;

  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];

  handles: Record<string, FileSystemHandle>;
  meta: Record<string, FsMeta>;
  fileState: Record<string, FileState>;

  selectedIds: string[];

  rootDirId?: string;

  views: ViewState[];
  activeViewId: string;

  treeExpanded: Record<string, boolean>;

  focusNonce: number;
  focusNodeId?: string;
};

type RecentItem = {
  key: string;
  name: string;
  hint: string;
};

export type Panels = {
  left: boolean;
  inspector: boolean;
  terminal: boolean;
};

export type Store = {
  projects: ProjectState[];
  activeProjectId?: string;
  recents: RecentItem[];
  panels: Panels;

  goHome: () => void;
  setActiveProject: (id: string) => void;
  closeProject: (id: string) => void;

  openProjectFolder: () => Promise<void>;
  reopenRecent: (key: string) => Promise<void>;

  togglePanel: (k: keyof Panels) => void;

  getActiveProject: () => ProjectState | null;
  getActiveView: () => ViewState | null;

  setActiveView: (viewId: string) => void;
  updateActiveViewViewport: (vp: Viewport) => void;

  toggleTreeExpanded: (dirId: string) => void;
  selectAndFocusNode: (nodeId: string) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;
  onSelectionChange: (ids: string[]) => void;

  toggleFileOpen: (id: string) => Promise<void>;
  setFileText: (id: string, text: string) => void;
  saveFile: (id: string) => Promise<void>;

  openFolder: () => Promise<void>;
  createFolderUnderSelectedDir: (name?: string) => Promise<void>;
  createFileUnderSelectedDir: (name?: string) => Promise<void>;
  groupSelection: () => void;
};

function createDefaultViews(): { views: ViewState[]; activeViewId: string } {
  const main: ViewState = {
    id: "main",
    name: "Main",
    scopeStack: [],
    viewport: DEFAULT_VIEWPORT,
  };
  const v2: ViewState = {
    id: "view2",
    name: "View 2",
    scopeStack: [],
    viewport: { x: 120, y: 80, zoom: 0.9 },
  };
  return { views: [main, v2], activeViewId: main.id };
}

function ensureRecentUnique(list: RecentItem[], item: RecentItem) {
  const next = [item, ...list.filter((x) => x.key !== item.key)];
  return next.slice(0, 12);
}

function pickOneSelectedDir(meta: Record<string, FsMeta>, ids: string[]) {
  return ids.find((x) => meta[x]?.kind === "dir");
}

function updateActiveProject(
  s: Store,
  updater: (p: ProjectState) => ProjectState
): Store {
  const pid = s.activeProjectId;
  if (!pid) return s;
  const projects = s.projects.map((p) => (p.id === pid ? updater(p) : p));
  return { ...s, projects };
}

function arrayEq(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ✅ 只接受“有效字符串 handleId”；否则返回 undefined（表示不写入 edge）
function sanitizeHandleId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}

export const useAppStore = create<Store>((set, get) => ({
  projects: [],
  activeProjectId: undefined,
  recents: [],
  panels: { left: true, inspector: true, terminal: false },

  goHome: () => set({ activeProjectId: undefined }),

  setActiveProject: (id) => set({ activeProjectId: id }),

  closeProject: (id) => {
    const { projects, activeProjectId } = get();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx < 0) return;

    const next = projects.filter((p) => p.id !== id);

    let nextActive: string | undefined = activeProjectId;
    if (activeProjectId === id) {
      const left = projects[idx - 1]?.id;
      const right = projects[idx + 1]?.id;
      nextActive = left ?? right ?? undefined;
    }

    set({ projects: next, activeProjectId: nextActive });
  },

  openProjectFolder: async () => {
    if (!window.showDirectoryPicker) {
      alert("浏览器不支持 File System Access API（建议 Chrome/Edge）。");
      return;
    }

    const dir = await window.showDirectoryPicker({ mode: "readwrite" });
    const result = await buildFsGraph(dir, dir.name ?? "Project");
    const rootId = Object.values(result.meta).find((m) => !m.parentId)?.id;

    const id = nanoid();
    const { views, activeViewId } = createDefaultViews();

    const project: ProjectState = {
      id,
      name: dir.name ?? "Project",

      nodes: result.nodes,
      edges: result.edges,
      handles: result.handles,
      meta: result.meta,
      fileState: {},

      selectedIds: [],
      rootDirId: rootId,

      views,
      activeViewId,

      treeExpanded: {},

      focusNonce: 0,
      focusNodeId: undefined,
    };

    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: id,
      recents: ensureRecentUnique(s.recents, {
        key: `local:${project.name}`,
        name: project.name,
        hint: "Local folder (reopen is placeholder)",
      }),
    }));
  },

  reopenRecent: async (key) => {
    void key;
    await get().openProjectFolder();
  },

  togglePanel: (k) =>
    set((s) => ({
      panels: { ...s.panels, [k]: !s.panels[k] },
    })),

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) ?? null;
  },

  getActiveView: () => {
    const p = get().getActiveProject();
    if (!p) return null;
    return p.views.find((v) => v.id === p.activeViewId) ?? null;
  },

  setActiveView: (viewId) => {
    set((s) =>
      updateActiveProject(s, (p) => {
        if (!p.views.some((v) => v.id === viewId)) return p;
        if (p.activeViewId === viewId) return p;
        return { ...p, activeViewId: viewId };
      })
    );
  },

  updateActiveViewViewport: (vp) => {
    set((s) =>
      updateActiveProject(s, (p) => {
        const cur = p.views.find((v) => v.id === p.activeViewId);
        if (!cur) return p;

        if (
          cur.viewport.x === vp.x &&
          cur.viewport.y === vp.y &&
          cur.viewport.zoom === vp.zoom
        )
          return p;

        const views = p.views.map((v) =>
          v.id === p.activeViewId ? { ...v, viewport: vp } : v
        );
        return { ...p, views };
      })
    );
  },

  toggleTreeExpanded: (dirId) => {
    set((s) =>
      updateActiveProject(s, (p) => {
        const cur = p.treeExpanded[dirId];
        const next = !(cur ?? true);
        return {
          ...p,
          treeExpanded: { ...p.treeExpanded, [dirId]: next },
        };
      })
    );
  },

  selectAndFocusNode: (nodeId) => {
    set((s) =>
      updateActiveProject(s, (p) => ({
        ...p,
        selectedIds: [nodeId],
        focusNonce: p.focusNonce + 1,
        focusNodeId: nodeId,
      }))
    );
  },

  onNodesChange: (changes) => {
    set((s) =>
      updateActiveProject(s, (p) => ({
        ...p,
        nodes: applyNodeChanges(changes, p.nodes) as Node<NodeData>[],
      }))
    );
  },

  onEdgesChange: (changes) => {
    set((s) =>
      updateActiveProject(s, (p) => ({
        ...p,
        edges: applyEdgeChanges(changes, p.edges) as Edge<EdgeData>[],
      }))
    );
  },

  // ✅ 关键修复：不再把 undefined/null handle 写进 edge（#008 根因之一）
  onConnect: (c) => {
    set((s) =>
      updateActiveProject(s, (p) => {
        if (!c.source || !c.target) return p;

        const sNode = p.nodes.find((n) => n.id === c.source);
        const tNode = p.nodes.find((n) => n.id === c.target);
        if (!sNode || !tNode) return p;

        // 禁止 groupNode 连线（没 handles）
        if (sNode.type === "groupNode" || tNode.type === "groupNode") return p;

        const sh = sanitizeHandleId(c.sourceHandle);
        const th = sanitizeHandleId(c.targetHandle);

        const edge: Edge<EdgeData> = {
          id: `e_${nanoid()}`,
          source: c.source,
          target: c.target,
          ...(sh ? { sourceHandle: sh } : {}),
          ...(th ? { targetHandle: th } : {}),
          type: "smoothstep",
          data: { edgeKind: "flow" },
        };

        return {
          ...p,
          edges: addEdge(edge, p.edges) as Edge<EdgeData>[],
        };
      })
    );
  },

  onSelectionChange: (ids) => {
    set((s) =>
      updateActiveProject(s, (p) => {
        const next = Array.from(new Set(ids)).sort();
        if (arrayEq(p.selectedIds, next)) return p;
        return { ...p, selectedIds: next };
      })
    );
  },

  toggleFileOpen: async (id) => {
    const p = get().getActiveProject();
    if (!p) return;
    if (p.meta[id]?.kind !== "file") return;

    const cur = p.fileState[id]?.isOpen ?? false;
    const nextOpen = !cur;

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        fileState: {
          ...pp.fileState,
          [id]: { ...(pp.fileState[id] ?? {}), isOpen: nextOpen },
        },
      }))
    );

    const latest = get().getActiveProject();
    if (!latest) return;
    if (!nextOpen) return;
    if (latest.fileState[id]?.text != null) return;

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        fileState: {
          ...pp.fileState,
          [id]: { ...(pp.fileState[id] ?? {}), loading: true },
        },
      }))
    );

    try {
      const h = latest.handles[id] as FileSystemFileHandle;
      const f = await h.getFile();
      const text = await f.text();

      set((s) =>
        updateActiveProject(s, (pp) => ({
          ...pp,
          fileState: {
            ...pp.fileState,
            [id]: {
              ...(pp.fileState[id] ?? {}),
              loading: false,
              text,
              dirty: false,
            },
          },
        }))
      );
    } catch (e) {
      console.error(e);
      set((s) =>
        updateActiveProject(s, (pp) => ({
          ...pp,
          fileState: {
            ...pp.fileState,
            [id]: { ...(pp.fileState[id] ?? {}), loading: false },
          },
        }))
      );
      alert("读取文件失败（可能没有权限或文件不可读）。");
    }
  },

  setFileText: (id, text) => {
    set((s) =>
      updateActiveProject(s, (p) => ({
        ...p,
        fileState: {
          ...p.fileState,
          [id]: {
            ...(p.fileState[id] ?? { isOpen: true }),
            text,
            dirty: true,
          },
        },
      }))
    );
  },

  saveFile: async (id) => {
    const p = get().getActiveProject();
    if (!p) return;
    if (p.meta[id]?.kind !== "file") return;

    const text = p.fileState[id]?.text ?? "";

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        fileState: {
          ...pp.fileState,
          [id]: { ...(pp.fileState[id] ?? {}), saving: true },
        },
      }))
    );

    try {
      const h = p.handles[id] as FileSystemFileHandle;
      const writable = await h.createWritable();
      await writable.write(text);
      await writable.close();

      set((s) =>
        updateActiveProject(s, (pp) => ({
          ...pp,
          fileState: {
            ...pp.fileState,
            [id]: {
              ...(pp.fileState[id] ?? {}),
              saving: false,
              dirty: false,
            },
          },
        }))
      );
    } catch (e) {
      console.error(e);
      set((s) =>
        updateActiveProject(s, (pp) => ({
          ...pp,
          fileState: {
            ...pp.fileState,
            [id]: { ...(pp.fileState[id] ?? {}), saving: false },
          },
        }))
      );
      alert("保存失败：请确认是以 readwrite 权限打开文件夹。");
    }
  },

  openFolder: async () => {
    await get().openProjectFolder();
  },

  createFolderUnderSelectedDir: async (name) => {
    const p = get().getActiveProject();
    if (!p) return;

    const dirId = pickOneSelectedDir(p.meta, p.selectedIds);
    if (!dirId) return alert("先选中一个目录节点，再新建文件夹。");

    const dir = p.handles[dirId] as FileSystemDirectoryHandle;
    const folderName = (name ?? prompt("Folder name?"))?.trim();
    if (!folderName) return;

    const newDir = await dir.getDirectoryHandle(folderName, { create: true });
    const id = nanoid();

    const parentPath = p.meta[dirId]?.path ?? p.name;
    const newPath = `${parentPath}/${folderName}`;

    const parentNode = p.nodes.find((n) => n.id === dirId);
    const pos = parentNode
      ? { x: parentNode.position.x + 280, y: parentNode.position.y + 120 }
      : { x: 0, y: 0 };

    const newNode: Node<NodeData> = {
      id,
      type: "dirNode",
      position: pos,
      data: { title: `📁 ${folderName}`, kind: "dir", path: newPath },
    };

    const newEdge: Edge<EdgeData> = {
      id: `e_${dirId}_${id}`,
      source: dirId,
      target: id,
      type: "smoothstep",
      deletable: false,
      data: { locked: true, edgeKind: "fs" },
    };

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        nodes: [...pp.nodes, newNode],
        edges: [...pp.edges, newEdge],
        handles: { ...pp.handles, [id]: newDir },
        meta: {
          ...pp.meta,
          [id]: {
            id,
            kind: "dir",
            name: folderName,
            path: newPath,
            parentId: dirId,
          },
        },
      }))
    );
  },

  createFileUnderSelectedDir: async (name) => {
    const p = get().getActiveProject();
    if (!p) return;

    const dirId = pickOneSelectedDir(p.meta, p.selectedIds);
    if (!dirId) return alert("先选中一个目录节点，再新建文件。");

    const dir = p.handles[dirId] as FileSystemDirectoryHandle;
    const fileName = (name ?? prompt("File name? (e.g. hello.ts)"))?.trim();
    if (!fileName) return;

    const newFile = await dir.getFileHandle(fileName, { create: true });

    const init = `// ${fileName}\n\nexport const hello = () => "hello";\n`;
    const writable = await newFile.createWritable();
    await writable.write(init);
    await writable.close();

    const id = nanoid();
    const parentPath = p.meta[dirId]?.path ?? p.name;
    const newPath = `${parentPath}/${fileName}`;

    const parentNode = p.nodes.find((n) => n.id === dirId);
    const pos = parentNode
      ? { x: parentNode.position.x + 280, y: parentNode.position.y + 180 }
      : { x: 0, y: 0 };

    const newNode: Node<NodeData> = {
      id,
      type: "fileNode",
      position: pos,
      data: { title: `📄 ${fileName}`, kind: "file", path: newPath },
    };

    const newEdge: Edge<EdgeData> = {
      id: `e_${dirId}_${id}`,
      source: dirId,
      target: id,
      type: "smoothstep",
      deletable: false,
      data: { locked: true, edgeKind: "fs" },
    };

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        nodes: [...pp.nodes, newNode],
        edges: [...pp.edges, newEdge],
        handles: { ...pp.handles, [id]: newFile },
        meta: {
          ...pp.meta,
          [id]: {
            id,
            kind: "file",
            name: fileName,
            path: newPath,
            parentId: dirId,
          },
        },
        fileState: {
          ...pp.fileState,
          [id]: { isOpen: true, text: init, dirty: false },
        },
      }))
    );
  },

  groupSelection: () => {
    const p = get().getActiveProject();
    if (!p) return;

    const sel = p.nodes.filter(
      (n) => p.selectedIds.includes(n.id) && n.type !== "groupNode"
    );
    if (sel.length < 2) return alert("至少选择 2 个节点才能 Group。");

    const xs = sel.map((n) => n.position.x);
    const ys = sel.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const groupId = nanoid();
    const padding = 40;

    const groupNode: Node<NodeData> = {
      id: groupId,
      type: "groupNode",
      position: { x: minX - padding, y: minY - padding },
      data: { title: "Group", kind: "group", path: "" },
      style: {
        width: maxX - minX + padding * 2 + 220,
        height: maxY - minY + padding * 2 + 120,
      },
    };

    const updated = p.nodes.map((n) => {
      if (!p.selectedIds.includes(n.id)) return n;
      return {
        ...n,
        parentNode: groupId,
        extent: "parent" as const,
        position: {
          x: n.position.x - (minX - padding),
          y: n.position.y - (minY - padding),
        },
      };
    });

    set((s) =>
      updateActiveProject(s, (pp) => ({
        ...pp,
        nodes: [...updated, groupNode],
      }))
    );
  },
}));

export const useGraphStore = useAppStore;
