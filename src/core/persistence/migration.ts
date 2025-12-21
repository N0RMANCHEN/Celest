/**
 * core/persistence/migration.ts
 * ----------------
 * P0-2: Version migration system for persistence files.
 *
 * Provides migration functions to upgrade files from older versions to newer ones.
 * Currently supports v1 (current), with infrastructure for future v2+ versions.
 */

import type {
  GraphFileV1,
  WorkspaceFileV1,
} from "./nodeideSchema";
import {
  WORKSPACE_SCHEMA_VERSION,
  GRAPH_SCHEMA_VERSION,
} from "./nodeideSchema";
import { PersistenceErrors, type PersistenceError } from "./errors";

/**
 * Migration function type.
 * Takes data from an older version and returns data in the target version.
 */
export type MigrationFunction<T> = (old: unknown) => T;

/**
 * Migration result.
 */
export type MigrationResult<T> = {
  data: T | null; // Allow null when there's an error
  error: PersistenceError | null;
};

/**
 * Workspace file migrations.
 * Maps from source version to target version migration function.
 * Currently v1 is the latest, so no migrations are needed yet.
 * This structure is prepared for future v2+ versions.
 */
const workspaceMigrations: Record<
  number,
  MigrationFunction<WorkspaceFileV1>
> = {
  // v1 -> v1: identity (no migration needed)
  1: (old: unknown) => {
    // Validate that it's already v1
    if (
      old &&
      typeof old === "object" &&
      "version" in old &&
      (old as { version: unknown }).version === WORKSPACE_SCHEMA_VERSION
    ) {
      return old as WorkspaceFileV1;
    }
    throw new Error("Invalid workspace file format");
  },
  // Future: v1 -> v2 migration will be added here
  // 2: (old: unknown) => { ... }
};

/**
 * Graph file migrations.
 * Maps from source version to target version migration function.
 */
const graphMigrations: Record<number, MigrationFunction<GraphFileV1>> = {
  // v1 -> v1: identity (no migration needed)
  1: (old: unknown) => {
    // Validate that it's already v1
    if (
      old &&
      typeof old === "object" &&
      "version" in old &&
      (old as { version: unknown }).version === GRAPH_SCHEMA_VERSION
    ) {
      return old as GraphFileV1;
    }
    throw new Error("Invalid graph file format");
  },
  // Future: v1 -> v2 migration will be added here
  // 2: (old: unknown) => { ... }
};

/**
 * Get the version number from a file object.
 */
function getVersion(file: unknown): number | null {
  if (!file || typeof file !== "object") return null;
  if (!("version" in file)) return null;
  const version = (file as { version: unknown }).version;
  if (typeof version !== "number") return null;
  return version;
}

/**
 * Migrate workspace file from an older version to the current version.
 * Returns the migrated file or an error if migration fails.
 */
export function migrateWorkspaceFile(
  file: unknown,
  filePath: string
): MigrationResult<WorkspaceFileV1> {
  const version = getVersion(file);
  if (version === null) {
    return {
      data: null,
      error: PersistenceErrors.validationError(
        filePath,
        "Missing or invalid version field"
      ),
    };
  }

  // If already at current version, no migration needed
  if (version === WORKSPACE_SCHEMA_VERSION) {
    const migration = workspaceMigrations[version];
    if (!migration) {
      return {
        data: null,
        error: PersistenceErrors.migrationError(
          filePath,
          `No migration function for version ${version}`
        ),
      };
    }
    try {
      const migrated = migration(file);
      return { data: migrated, error: null };
    } catch (e) {
      return {
        data: null,
        error: PersistenceErrors.migrationError(
          filePath,
          `Migration failed: ${String(e)}`,
          e
        ),
      };
    }
  }

  // Future: implement step-by-step migration (v1 -> v2 -> v3, etc.)
  // For now, we only support v1
  if (version > WORKSPACE_SCHEMA_VERSION) {
    return {
      data: null,
      error: PersistenceErrors.migrationError(
        filePath,
        `File version ${version} is newer than supported version ${WORKSPACE_SCHEMA_VERSION}`
      ),
    };
  }

  // Version is older than current, but we don't have a migration path yet
  return {
    data: null,
    error: PersistenceErrors.migrationError(
      filePath,
      `Migration from version ${version} to ${WORKSPACE_SCHEMA_VERSION} is not yet implemented`
    ),
  };
}

/**
 * Migrate graph file from an older version to the current version.
 * Returns the migrated file or an error if migration fails.
 */
export function migrateGraphFile(
  file: unknown,
  filePath: string
): MigrationResult<GraphFileV1> {
  const version = getVersion(file);
  if (version === null) {
    return {
      data: null,
      error: PersistenceErrors.validationError(
        filePath,
        "Missing or invalid version field"
      ),
    };
  }

  // If already at current version, no migration needed
  if (version === GRAPH_SCHEMA_VERSION) {
    const migration = graphMigrations[version];
    if (!migration) {
      return {
        data: null,
        error: PersistenceErrors.migrationError(
          filePath,
          `No migration function for version ${version}`
        ),
      };
    }
    try {
      const migrated = migration(file);
      return { data: migrated, error: null };
    } catch (e) {
      return {
        data: null,
        error: PersistenceErrors.migrationError(
          filePath,
          `Migration failed: ${String(e)}`,
          e
        ),
      };
    }
  }

  // Future: implement step-by-step migration (v1 -> v2 -> v3, etc.)
  // For now, we only support v1
  if (version > GRAPH_SCHEMA_VERSION) {
    return {
      data: null,
      error: PersistenceErrors.migrationError(
        filePath,
        `File version ${version} is newer than supported version ${GRAPH_SCHEMA_VERSION}`
      ),
    };
  }

  // Version is older than current, but we don't have a migration path yet
  return {
    data: null,
    error: PersistenceErrors.migrationError(
      filePath,
      `Migration from version ${version} to ${GRAPH_SCHEMA_VERSION} is not yet implemented`
    ),
  };
}

