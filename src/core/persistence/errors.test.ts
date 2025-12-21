import { describe, expect, it } from "vitest";

import {
  PersistenceErrors,
  formatErrorForUser,
  isRecoverableError,
} from "./errors";

describe("persistence/errors", () => {
  it("fileNotFound 可恢复且带建议", () => {
    const err = PersistenceErrors.fileNotFound("/foo");
    expect(err.type).toBe("FILE_NOT_FOUND");
    expect(isRecoverableError(err)).toBe(true);
    expect(formatErrorForUser(err)).toContain("File not found");
  });

  it("migrationError 不可恢复并包含原因", () => {
    const err = PersistenceErrors.migrationError("/foo", "failed");
    expect(err.type).toBe("MIGRATION_ERROR");
    expect(isRecoverableError(err)).toBe(false);
    expect(err.suggestion).toContain("Unable to migrate");
    expect(formatErrorForUser(err)).toContain("Migration failed");
  });
});

