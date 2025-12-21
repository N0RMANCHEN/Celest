import { describe, expect, it } from "vitest";

import {
  cleanupOldBackups,
  createBackup,
  getBackupFilenames,
  loadBackupFile,
} from "./backup";

class MockFile {
  content: string;
  constructor(content: string) {
    this.content = content;
  }
  async text(): Promise<string> {
    return this.content;
  }
}

class MockWritable {
  private file: MockFile;
  constructor(file: MockFile) {
    this.file = file;
  }
  async write(text: string): Promise<void> {
    this.file.content = String(text);
  }
  async close(): Promise<void> {
    // no-op
  }
}

class MockFileHandle {
  private file: MockFile;
  constructor(file: MockFile) {
    this.file = file;
  }
  async getFile(): Promise<MockFile> {
    return this.file;
  }
  async createWritable(): Promise<MockWritable> {
    return new MockWritable(this.file);
  }
}

class MockDirectoryHandle {
  private files = new Map<string, MockFile>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [name, content] of Object.entries(initial)) {
        this.files.set(name, new MockFile(content));
      }
    }
  }

  async getFileHandle(
    name: string,
    opts?: { create?: boolean }
  ): Promise<MockFileHandle> {
    const existing = this.files.get(name);
    if (existing) return new MockFileHandle(existing);
    if (opts?.create) {
      const file = new MockFile("");
      this.files.set(name, file);
      return new MockFileHandle(file);
    }
    const err = new Error("NotFoundError");
    (err as any).name = "NotFoundError";
    throw err;
  }

  async removeEntry(name: string): Promise<void> {
    const existed = this.files.delete(name);
    if (!existed) {
      const err = new Error("NotFoundError");
      (err as any).name = "NotFoundError";
      throw err;
    }
  }

  // Helpers for assertions
  read(name: string): string | null {
    return this.files.get(name)?.content ?? null;
  }

  has(name: string): boolean {
    return this.files.has(name);
  }
}

const FILE = "workspace.json";

describe("backup helpers", () => {
  it("getBackupFilenames 生成固定数量的备份文件名", () => {
    const names = getBackupFilenames(FILE);
    expect(names).toEqual([
      "workspace.json.backup",
      "workspace.json.backup.1",
      "workspace.json.backup.2",
    ]);
  });
});

describe("createBackup", () => {
  it("源文件不存在时跳过", async () => {
    const dir = new MockDirectoryHandle();
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE);
    expect(dir.has("workspace.json.backup")).toBe(false);
  });

  it("首次创建 .backup", async () => {
    const dir = new MockDirectoryHandle({ [FILE]: '{"v":1}' });
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE);

    expect(dir.read("workspace.json.backup")).toBe('{"v":1}');
  });

  it("滚动备份：.backup → .backup.1 → .backup.2，保持最新三个版本", async () => {
    const dir = new MockDirectoryHandle({ [FILE]: "v1" });
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE); // backup=v1

    // 更新源并再次备份
    dir.read(FILE); // noop read for clarity
    (dir as any).files.get(FILE).content = "v2";
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE); // backup=v2, backup.1=v1

    (dir as any).files.get(FILE).content = "v3";
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE); // backup=v3, backup.1=v2, backup.2=v1

    (dir as any).files.get(FILE).content = "v4";
    await createBackup(dir as unknown as FileSystemDirectoryHandle, FILE); // backup=v4, backup.1=v3, backup.2=v2 (v1 被覆盖掉)

    expect(dir.read("workspace.json.backup")).toBe("v4");
    expect(dir.read("workspace.json.backup.1")).toBe("v3");
    expect(dir.read("workspace.json.backup.2")).toBe("v2");
    expect(dir.read("workspace.json.backup.3")).toBeNull();
  });
});

describe("loadBackupFile", () => {
  it("按顺序返回第一个可解析的备份，跳过损坏文件", async () => {
    const dir = new MockDirectoryHandle({
      [FILE + ".backup"]: "not-json",
      [FILE + ".backup.1"]: '{"ok":true}',
    });

    const data = await loadBackupFile<{ ok: boolean }>(
      dir as unknown as FileSystemDirectoryHandle,
      FILE
    );
    expect(data).toEqual({ ok: true });
  });

  it("无可用备份返回 null", async () => {
    const dir = new MockDirectoryHandle();
    const data = await loadBackupFile(dir as unknown as FileSystemDirectoryHandle, FILE);
    expect(data).toBeNull();
  });
});

describe("cleanupOldBackups", () => {
  it("按 maxBackups 删除多余备份（默认列表长度内）", async () => {
    const dir = new MockDirectoryHandle({
      [FILE + ".backup"]: "v4",
      [FILE + ".backup.1"]: "v3",
      [FILE + ".backup.2"]: "v2",
    });

    await cleanupOldBackups(
      dir as unknown as FileSystemDirectoryHandle,
      FILE,
      2
    );

    expect(dir.has("workspace.json.backup")).toBe(true);
    expect(dir.has("workspace.json.backup.1")).toBe(true);
    expect(dir.has("workspace.json.backup.2")).toBe(false);
  });
});

