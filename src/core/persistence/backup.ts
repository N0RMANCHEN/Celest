/**
 * core/persistence/backup.ts
 * ----------------
 * P0-2: Backup and restore functionality for persistence files.
 *
 * Provides automatic backup creation before saving files, with support for
 * multiple backup versions and automatic cleanup of old backups.
 */

const MAX_BACKUPS = 3;

function isNotFoundError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  if (!("name" in e)) return false;
  const name = (e as { name?: unknown }).name;
  return typeof name === "string" && name === "NotFoundError";
}

async function getFile(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<File | null> {
  try {
    const h = await dir.getFileHandle(name);
    return await h.getFile();
  } catch (e) {
    if (isNotFoundError(e)) return null;
    throw e;
  }
}

async function writeText(
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string
): Promise<void> {
  const h = await dir.getFileHandle(name, { create: true });
  const writable = await h.createWritable();
  await writable.write(text);
  await writable.close();
}

async function deleteFile(
  dir: FileSystemDirectoryHandle,
  name: string
): Promise<void> {
  try {
    await dir.removeEntry(name);
  } catch (e) {
    if (isNotFoundError(e)) {
      // File doesn't exist, that's fine
      return;
    }
    throw e;
  }
}

/**
 * Get backup filename for a given index.
 * - Index 0: filename.backup
 * - Index 1: filename.backup.1
 * - Index 2: filename.backup.2
 */
function getBackupFilename(filename: string, index: number): string {
  if (index === 0) {
    return `${filename}.backup`;
  }
  return `${filename}.backup.${index}`;
}

/**
 * Get all backup filenames for a given file.
 * Returns filenames in order: .backup, .backup.1, .backup.2, etc.
 */
export function getBackupFilenames(filename: string): string[] {
  const backups: string[] = [];
  for (let i = 0; i < MAX_BACKUPS; i++) {
    backups.push(getBackupFilename(filename, i));
  }
  return backups;
}

/**
 * Get list of existing backup files for a given filename.
 * Returns filenames in order from newest to oldest.
 */
export async function getBackupFiles(
  dir: FileSystemDirectoryHandle,
  filename: string
): Promise<string[]> {
  const backupFilenames = getBackupFilenames(filename);
  const existing: string[] = [];

  for (const backupName of backupFilenames) {
    const file = await getFile(dir, backupName);
    if (file) {
      existing.push(backupName);
    }
  }

  return existing;
}

/**
 * Create a backup of a file before saving.
 * Implements a rolling backup strategy:
 * - Moves existing backups: .backup -> .backup.1, .backup.1 -> .backup.2, etc.
 * - Creates new .backup from current file
 * - Deletes oldest backup if it exists
 */
export async function createBackup(
  dir: FileSystemDirectoryHandle,
  filename: string
): Promise<void> {
  // Check if source file exists
  const sourceFile = await getFile(dir, filename);
  if (!sourceFile) {
    // No source file to backup, skip
    return;
  }

  const sourceText = await sourceFile.text();

  // Shift existing backups: .backup -> .backup.1, .backup.1 -> .backup.2, etc.
  // We do this in reverse order to avoid overwriting files we need to read
  for (let i = MAX_BACKUPS - 2; i >= 0; i--) {
    const oldName = getBackupFilename(filename, i);
    const newName = getBackupFilename(filename, i + 1);

    const oldFile = await getFile(dir, oldName);
    if (oldFile) {
      const oldText = await oldFile.text();
      await writeText(dir, newName, oldText);
      await deleteFile(dir, oldName);
    }
  }

  // Create new .backup from current file
  await writeText(dir, getBackupFilename(filename, 0), sourceText);
}

/**
 * Load a file from backup.
 * Tries backups in order: .backup, .backup.1, .backup.2, etc.
 * Returns the first valid backup found, or null if none exist.
 */
export async function loadBackupFile<T>(
  dir: FileSystemDirectoryHandle,
  filename: string
): Promise<T | null> {
  const backupFilenames = getBackupFilenames(filename);

  for (const backupName of backupFilenames) {
    const file = await getFile(dir, backupName);
    if (!file) continue;

    try {
      const text = await file.text();
      return JSON.parse(text) as T;
    } catch (e) {
      // Backup file is corrupted, try next one
      continue;
    }
  }

  return null;
}

/**
 * Clean up old backup files, keeping only the most recent N backups.
 * This is called automatically by createBackup, but can be called manually if needed.
 */
export async function cleanupOldBackups(
  dir: FileSystemDirectoryHandle,
  filename: string,
  maxBackups: number = MAX_BACKUPS
): Promise<void> {
  const backupFilenames = getBackupFilenames(filename);

  // Delete backups beyond maxBackups
  for (let i = maxBackups; i < backupFilenames.length; i++) {
    await deleteFile(dir, backupFilenames[i]);
  }
}

