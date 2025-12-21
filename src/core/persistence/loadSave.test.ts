import { describe, expect, it } from "vitest";

import {
  ensureWorkspaceFile,
  loadWorkspaceFile,
  saveMainGraph,
} from "./loadSave";
import {
  CELEST_DIRNAME,
  GRAPHS_DIRNAME,
  GRAPH_SCHEMA_VERSION,
  MAIN_GRAPH_FILENAME,
  WORKSPACE_FILENAME,
  defaultWorkspaceFile,
  wrapGraphFile,
} from "./nodeideSchema";
import type { CodeGraphModel } from "../../entities/graph/types";

class MockFile {
  constructor(public content: string) {}
  async text(): Promise<string> {
    return this.content;
  }
}

class MockWritable {
  constructor(private file: MockFile) {}
  async write(text: string): Promise<void> {
    this.file.content = String(text);
  }
  async close(): Promise<void> {}
}

class MockFileHandle {
  kind = "file" as const;
  constructor(private file: MockFile) {}
  async getFile(): Promise<MockFile> {
    return this.file;
  }
  async createWritable(): Promise<MockWritable> {
    return new MockWritable(this.file);
  }
}

class MockDirectoryHandle {
  kind = "directory" as const;
  private files = new Map<string, MockFile>();
  private dirs = new Map<string, MockDirectoryHandle>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [name, content] of Object.entries(initial)) {
        this.files.set(name, new MockFile(content));
      }
    }
  }

  async getDirectoryHandle(
    name: string,
    opts?: { create?: boolean }
  ): Promise<MockDirectoryHandle> {
    const existing = this.dirs.get(name);
    if (existing) return existing;
    if (opts?.create) {
      const dir = new MockDirectoryHandle();
      this.dirs.set(name, dir);
      return dir;
    }
    const err = new Error("NotFoundError");
    // @ts-expect-error simulate DOMException name
    err.name = "NotFoundError";
    throw err;
  }

  async getFileHandle(
    name: string,
    opts?: { create?: boolean }
  ): Promise<MockFileHandle> {
    const existing = this.files.get(name);
    if (existing) return new MockFileHandle(existing);
    if (opts?.create) {
      const f = new MockFile("");
      this.files.set(name, f);
      return new MockFileHandle(f);
    }
    const err = new Error("NotFoundError");
    // @ts-expect-error simulate DOMException name
    err.name = "NotFoundError";
    throw err;
  }

  async removeEntry(name: string): Promise<void> {
    if (this.files.delete(name)) return;
    if (this.dirs.delete(name)) return;
    const err = new Error("NotFoundError");
    // @ts-expect-error simulate DOMException name
    err.name = "NotFoundError";
    throw err;
  }

  async *entries(): AsyncGenerator<[string, MockFileHandle | MockDirectoryHandle]> {
    for (const [name, dir] of this.dirs) {
      yield [name, dir];
    }
    for (const [name, file] of this.files) {
      yield [name, new MockFileHandle(file)];
    }
  }

  // helpers for assertions
  getDir(name: string): MockDirectoryHandle | undefined {
    return this.dirs.get(name);
  }

  readFile(name: string): string | null {
    return this.files.get(name)?.content ?? null;
  }

  setFile(name: string, content: string): void {
    this.files.set(name, new MockFile(content));
  }
}

function parseWorkspace(dir: MockDirectoryHandle): unknown {
  const celest = dir.getDir(CELEST_DIRNAME);
  if (!celest) return null;
  const text = celest.readFile(WORKSPACE_FILENAME);
  return text ? JSON.parse(text) : null;
}

function parseGraph(dir: MockDirectoryHandle): unknown {
  const celest = dir.getDir(CELEST_DIRNAME);
  const graphs = celest?.getDir(GRAPHS_DIRNAME);
  if (!graphs) return null;
  const text = graphs.readFile(MAIN_GRAPH_FILENAME);
  return text ? JSON.parse(text) : null;
}

describe("ensureWorkspaceFile", () => {
  it("缺省时创建默认 workspace 并写入磁盘", async () => {
    const project = new MockDirectoryHandle();
    const result = await ensureWorkspaceFile(
      project as unknown as FileSystemDirectoryHandle
    );

    expect(result.file.version).toBe(1);
    const saved = parseWorkspace(project) as { version: number; views: unknown };
    expect(saved?.version).toBe(1);
    expect(saved?.views).toBeTruthy();
  });
});

describe("loadWorkspaceFile", () => {
  it("返回已存在的 v1 文件", async () => {
    const ws = defaultWorkspaceFile();
    const project = new MockDirectoryHandle();
    // 手动创建 .celest 目录
    const celest = await project.getDirectoryHandle(CELEST_DIRNAME, { create: true });
    celest.setFile(WORKSPACE_FILENAME, JSON.stringify(ws));

    const result = await loadWorkspaceFile(
      project as unknown as FileSystemDirectoryHandle
    );

    expect(result.error).toBeNull();
    expect(result.file).toEqual(ws);
  });

  it("version 缺失时返回迁移/校验错误", async () => {
    const bad = { foo: "bar" };
    const project = new MockDirectoryHandle();
    const celest = await project.getDirectoryHandle(CELEST_DIRNAME, { create: true });
    celest.setFile(WORKSPACE_FILENAME, JSON.stringify(bad));

    const result = await loadWorkspaceFile(
      project as unknown as FileSystemDirectoryHandle
    );

    expect(result.file).toBeNull();
    expect(result.error?.type).toBe("VALIDATION_ERROR");
  });
});

describe("saveMainGraph", () => {
  it("写入图文件并保留 createdAt", async () => {
    const project = new MockDirectoryHandle();
    // 准备 workspace.json
    const ws = defaultWorkspaceFile();
    const celest = await project.getDirectoryHandle(CELEST_DIRNAME, { create: true });
    celest.setFile(WORKSPACE_FILENAME, JSON.stringify(ws));
    const graphsDir = await celest.getDirectoryHandle(GRAPHS_DIRNAME, { create: true });

    // 预置旧图文件，含 createdAt
    const oldGraph = wrapGraphFile(
      { version: GRAPH_SCHEMA_VERSION, nodes: {}, edges: {} },
      "2024-01-01T00:00:00.000Z"
    );
    graphsDir.setFile(MAIN_GRAPH_FILENAME, JSON.stringify(oldGraph));

    const nextGraph: CodeGraphModel = {
      version: GRAPH_SCHEMA_VERSION,
      nodes: { n1: { id: "n1", kind: "note", title: "A", position: { x: 0, y: 0 }, text: "" } },
      edges: {},
    };

    await saveMainGraph(
      project as unknown as FileSystemDirectoryHandle,
      nextGraph
    );

    const stored = parseGraph(project) as {
      version: number;
      graph: CodeGraphModel;
      meta: { createdAt: string; updatedAt: string };
    };

    expect(stored?.graph.nodes.n1.title).toBe("A");
    expect(stored?.meta.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(stored?.meta.updatedAt).toBeTruthy();
  });
});

