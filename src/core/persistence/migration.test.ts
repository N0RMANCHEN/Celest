import { describe, expect, it } from "vitest";

import {
  migrateGraphFile,
  migrateWorkspaceFile,
} from "./migration";
import {
  GRAPH_SCHEMA_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  defaultWorkspaceFile,
  wrapGraphFile,
} from "./nodeideSchema";

const WORKSPACE_PATH = "/.celest/workspace.json";
const GRAPH_PATH = "/.celest/graphs/main.json";

describe("migrateWorkspaceFile", () => {
  it("返回 v1 工作区文件（无迁移）", () => {
    const workspace = defaultWorkspaceFile();
    const result = migrateWorkspaceFile(workspace, WORKSPACE_PATH);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(workspace);
  });

  it("version 缺失时返回校验错误", () => {
    const result = migrateWorkspaceFile({}, WORKSPACE_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("VALIDATION_ERROR");
    expect(result.error?.recoverable).toBe(true);
    expect(result.error?.message).toContain("Missing or invalid version field");
  });

  it("旧版本（低于当前）返回迁移错误", () => {
    const result = migrateWorkspaceFile({ version: 0 }, WORKSPACE_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("MIGRATION_ERROR");
    expect(result.error?.recoverable).toBe(false);
    expect(result.error?.message).toContain(
      `Migration from version 0 to ${WORKSPACE_SCHEMA_VERSION}`
    );
  });

  it("高于当前版本返回迁移错误", () => {
    const newer = WORKSPACE_SCHEMA_VERSION + 1;
    const result = migrateWorkspaceFile({ version: newer }, WORKSPACE_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("MIGRATION_ERROR");
    expect(result.error?.recoverable).toBe(false);
    expect(result.error?.message).toContain(
      `version ${newer} is newer than supported version ${WORKSPACE_SCHEMA_VERSION}`
    );
  });
});

describe("migrateGraphFile", () => {
  it("返回 v1 图文件（无迁移）", () => {
    const graphFile = wrapGraphFile({
      version: GRAPH_SCHEMA_VERSION,
      nodes: {},
      edges: {},
    });
    const result = migrateGraphFile(graphFile, GRAPH_PATH);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(graphFile);
  });

  it("version 缺失时返回校验错误", () => {
    const result = migrateGraphFile({}, GRAPH_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("VALIDATION_ERROR");
    expect(result.error?.recoverable).toBe(true);
    expect(result.error?.message).toContain("Missing or invalid version field");
  });

  it("旧版本（低于当前）返回迁移错误", () => {
    const result = migrateGraphFile({ version: 0 }, GRAPH_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("MIGRATION_ERROR");
    expect(result.error?.recoverable).toBe(false);
    expect(result.error?.message).toContain(
      `Migration from version 0 to ${GRAPH_SCHEMA_VERSION}`
    );
  });

  it("高于当前版本返回迁移错误", () => {
    const newer = GRAPH_SCHEMA_VERSION + 1;
    const result = migrateGraphFile({ version: newer }, GRAPH_PATH);

    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("MIGRATION_ERROR");
    expect(result.error?.recoverable).toBe(false);
    expect(result.error?.message).toContain(
      `version ${newer} is newer than supported version ${GRAPH_SCHEMA_VERSION}`
    );
  });
});

