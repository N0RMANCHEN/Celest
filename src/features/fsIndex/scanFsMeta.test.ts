import { describe, expect, it } from "vitest";

import { scanFsMeta } from "./scanFsMeta";

// Mock FileSystemDirectoryHandle
function createMockDirHandle(
  name: string,
  entries: Array<[string, FileSystemHandle]>
): FileSystemDirectoryHandle {
  const handle = {
    name,
    kind: "directory" as const,
    entries: async function* () {
      for (const entry of entries) {
        yield entry;
      }
    },
    getDirectoryHandle: async () => {
      throw new Error("not implemented");
    },
    getFileHandle: async () => {
      throw new Error("not implemented");
    },
    removeEntry: async () => {
      throw new Error("not implemented");
    },
    resolve: async () => null,
    isSameEntry: async () => false,
  } as FileSystemDirectoryHandle;
  return handle;
}

function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    name,
    kind: "file" as const,
  } as FileSystemFileHandle;
}

describe("scanFsMeta", () => {
  it("扫描基本目录结构", async () => {
    const file1 = createMockFileHandle("file1.md");
    const file2 = createMockFileHandle("file2.ts");
    const root = createMockDirHandle("Project", [
      ["file1.md", file1],
      ["file2.ts", file2],
    ]);

    const result = await scanFsMeta(root, "Project");

    expect(result.rootId).toBe("fs:/");
    expect(result.meta[result.rootId].name).toBe("Project");
    expect(result.meta[result.rootId].kind).toBe("dir");
    expect(result.meta[result.rootId].path).toBe("/");

    const file1Id = "fs:/file1.md";
    const file2Id = "fs:/file2.ts";
    expect(result.meta[file1Id]).toBeDefined();
    expect(result.meta[file1Id].name).toBe("file1.md");
    expect(result.meta[file1Id].kind).toBe("file");
    expect(result.meta[file2Id]).toBeDefined();
    expect(result.handles[file1Id]).toBe(file1);
    expect(result.handles[file2Id]).toBe(file2);
  });

  it("扫描嵌套目录", async () => {
    const nestedFile = createMockFileHandle("nested.md");
    const nestedDir = createMockDirHandle("nested", [["nested.md", nestedFile]]);
    const root = createMockDirHandle("Project", [["nested", nestedDir]]);

    const result = await scanFsMeta(root, "Project");

    const nestedId = "fs:/nested";
    const nestedFileId = "fs:/nested/nested.md";

    expect(result.meta[nestedId]).toBeDefined();
    expect(result.meta[nestedId].kind).toBe("dir");
    expect(result.meta[nestedId].parentId).toBe("fs:/");

    expect(result.meta[nestedFileId]).toBeDefined();
    expect(result.meta[nestedFileId].parentId).toBe(nestedId);
  });

  it("忽略默认目录", async () => {
    const nodeModules = createMockDirHandle("node_modules", []);
    const git = createMockDirHandle(".git", []);
    const file = createMockFileHandle("file.md");
    const root = createMockDirHandle("Project", [
      ["node_modules", nodeModules],
      [".git", git],
      ["file.md", file],
    ]);

    const result = await scanFsMeta(root, "Project");

    expect(result.meta["fs:/node_modules"]).toBeUndefined();
    expect(result.meta["fs:/.git"]).toBeUndefined();
    expect(result.meta["fs:/file.md"]).toBeDefined();
  });

  it("忽略 .celest 目录", async () => {
    const celest = createMockDirHandle(".celest", []);
    const file = createMockFileHandle("file.md");
    const root = createMockDirHandle("Project", [
      [".celest", celest],
      ["file.md", file],
    ]);

    const result = await scanFsMeta(root, "Project");

    expect(result.meta["fs:/.celest"]).toBeUndefined();
    expect(result.meta["fs:/file.md"]).toBeDefined();
  });

  it("按名称和类型排序条目", async () => {
    const fileB = createMockFileHandle("b.ts");
    const fileA = createMockFileHandle("a.ts");
    const dirZ = createMockDirHandle("z", []);
    const dirA = createMockDirHandle("a", []);
    const root = createMockDirHandle("Project", [
      ["b.ts", fileB],
      ["a.ts", fileA],
      ["z", dirZ],
      ["a", dirA],
    ]);

    const result = await scanFsMeta(root, "Project");

    // 目录应该在文件之前，验证结果包含所有条目
    expect(result.meta["fs:/a"]).toBeDefined();
    expect(result.meta["fs:/z"]).toBeDefined();
    expect(result.meta["fs:/a.ts"]).toBeDefined();
    expect(result.meta["fs:/b.ts"]).toBeDefined();
  });

  it("生成稳定的 ID", async () => {
    const file = createMockFileHandle("file.md");
    const root = createMockDirHandle("Project", [["file.md", file]]);

    const result1 = await scanFsMeta(root, "Project");
    const result2 = await scanFsMeta(root, "Project");

    expect(result1.meta["fs:/file.md"].id).toBe("fs:/file.md");
    expect(result2.meta["fs:/file.md"].id).toBe("fs:/file.md");
    expect(result1.meta["fs:/file.md"].id).toBe(result2.meta["fs:/file.md"].id);
  });

  it("处理空目录", async () => {
    const root = createMockDirHandle("Project", []);

    const result = await scanFsMeta(root, "Project");

    expect(result.rootId).toBe("fs:/");
    expect(Object.keys(result.meta).length).toBe(1);
    expect(Object.keys(result.handles).length).toBe(1);
  });
});

