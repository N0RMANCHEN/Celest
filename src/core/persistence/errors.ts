/**
 * core/persistence/errors.ts
 * ----------------
 * P0-2: Error types and utilities for persistence operations.
 *
 * Provides detailed error information for file operations, including
 * error type, file path, user-friendly messages, and recovery suggestions.
 */

export type PersistenceErrorType =
  | "FILE_NOT_FOUND"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "MIGRATION_ERROR"
  | "BACKUP_ERROR"
  | "WRITE_ERROR"
  | "READ_ERROR";

export type PersistenceError = {
  type: PersistenceErrorType;
  filePath: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  originalError?: unknown;
};

/**
 * Create a standardized persistence error object.
 */
export function createPersistenceError(
  type: PersistenceErrorType,
  filePath: string,
  message: string,
  suggestion: string,
  recoverable: boolean = true,
  originalError?: unknown
): PersistenceError {
  return {
    type,
    filePath,
    message,
    suggestion,
    recoverable,
    originalError,
  };
}

/**
 * Format error for user display.
 * Returns a user-friendly error message.
 */
export function formatErrorForUser(error: PersistenceError): string {
  const base = `Error in ${error.filePath}: ${error.message}`;
  if (error.suggestion) {
    return `${base}\nSuggestion: ${error.suggestion}`;
  }
  return base;
}

/**
 * Check if an error is recoverable.
 */
export function isRecoverableError(error: PersistenceError): boolean {
  return error.recoverable;
}

// Helper: NotFoundError detection (File System Access API)
export function isNotFoundError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  if (!("name" in e)) return false;
  const name = (e as { name?: unknown }).name;
  return typeof name === "string" && name === "NotFoundError";
}

/**
 * Common error creators for specific scenarios.
 */
export const PersistenceErrors = {
  fileNotFound: (filePath: string): PersistenceError =>
    createPersistenceError(
      "FILE_NOT_FOUND",
      filePath,
      "File not found",
      "The file may not exist yet. A new file will be created.",
      true
    ),

  parseError: (
    filePath: string,
    originalError?: unknown
  ): PersistenceError =>
    createPersistenceError(
      "PARSE_ERROR",
      filePath,
      "Failed to parse JSON file",
      "The file may be corrupted. Try restoring from backup or resetting to default.",
      true,
      originalError
    ),

  validationError: (
    filePath: string,
    reason: string
  ): PersistenceError =>
    createPersistenceError(
      "VALIDATION_ERROR",
      filePath,
      `Validation failed: ${reason}`,
      "The file format may be outdated. Try migrating to the latest version or resetting to default.",
      true
    ),

  migrationError: (
    filePath: string,
    reason: string,
    originalError?: unknown
  ): PersistenceError =>
    createPersistenceError(
      "MIGRATION_ERROR",
      filePath,
      `Migration failed: ${reason}`,
      "Unable to migrate file to new version. You may need to manually update the file or reset to default.",
      false,
      originalError
    ),

  backupError: (
    filePath: string,
    reason: string,
    originalError?: unknown
  ): PersistenceError =>
    createPersistenceError(
      "BACKUP_ERROR",
      filePath,
      `Backup failed: ${reason}`,
      "Backup creation failed, but the save operation will continue.",
      true,
      originalError
    ),

  writeError: (
    filePath: string,
    reason: string,
    originalError?: unknown
  ): PersistenceError =>
    createPersistenceError(
      "WRITE_ERROR",
      filePath,
      `Write failed: ${reason}`,
      "Unable to save file. Check file permissions and disk space.",
      false,
      originalError
    ),

  readError: (
    filePath: string,
    reason: string,
    originalError?: unknown
  ): PersistenceError =>
    createPersistenceError(
      "READ_ERROR",
      filePath,
      `Read failed: ${reason}`,
      "Unable to read file. Check file permissions.",
      false,
      originalError
    ),
};

