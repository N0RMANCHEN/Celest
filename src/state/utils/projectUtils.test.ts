import { describe, expect, it } from "vitest";

import { findActiveProject, mapActiveProject } from "./projectUtils";
import type { ProjectState } from "../../entities/project/types";

function makeStubProject(id: string): ProjectState {
  return {
    id,
    name: `Project ${id}`,
    workspaceMeta: { createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    dirHandle: {} as FileSystemDirectoryHandle,
    handles: {},
    rootDirId: "root",
    meta: {},
    graph: { version: 1, nodes: {}, edges: {} },
    selectedIds: [],
    focusNodeId: undefined,
    focusNonce: 0,
    activeViewId: "main",
    views: [{ id: "main", name: "Main", viewport: { x: 0, y: 0, zoom: 1, z: 1 } }],
    treeExpanded: {},
  };
}

describe("findActiveProject", () => {
  it("返回匹配的 project", () => {
    const projects = [makeStubProject("p1"), makeStubProject("p2")];
    const found = findActiveProject(projects, "p1");
    expect(found?.id).toBe("p1");
  });

  it("activeProjectId 为 undefined 时返回 null", () => {
    const projects = [makeStubProject("p1")];
    expect(findActiveProject(projects, undefined)).toBeNull();
  });

  it("未找到匹配时返回 null", () => {
    const projects = [makeStubProject("p1")];
    expect(findActiveProject(projects, "p2")).toBeNull();
  });
});

describe("mapActiveProject", () => {
  it("更新匹配的 project", () => {
    const projects = [makeStubProject("p1"), makeStubProject("p2")];
    const updated = mapActiveProject(projects, "p1", (p) => ({ ...p, name: "Updated" }));
    expect(updated[0].name).toBe("Updated");
    expect(updated[1].name).toBe("Project p2");
  });

  it("activeProjectId 为 undefined 时返回原数组", () => {
    const projects = [makeStubProject("p1")];
    const result = mapActiveProject(projects, undefined, (p) => ({ ...p, name: "Updated" }));
    expect(result).toBe(projects);
  });

  it("updater 返回相同引用时返回原数组", () => {
    const projects = [makeStubProject("p1")];
    const result = mapActiveProject(projects, "p1", (p) => p);
    expect(result).toBe(projects);
  });

  it("未找到匹配时返回原数组", () => {
    const projects = [makeStubProject("p1")];
    const result = mapActiveProject(projects, "p2", (p) => ({ ...p, name: "Updated" }));
    expect(result).toBe(projects);
  });
});

