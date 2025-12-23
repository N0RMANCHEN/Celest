/**
 * recentStore.ts
 * ----------------
 * Phase 1 Step3A:
 * - Persist recent projects (FileSystemDirectoryHandle) in IndexedDB.
 * - Provide a small, stable API that we can keep even after moving to Electron/Tauri.
 *
 * Notes:
 * - Browsers only allow storing directory handles in IndexedDB (structured clone) on supported origins.
 * - We keep a safe in-memory fallback if IDB is unavailable or blocked.
 */

export type RecentItem = {
  key: string;
  name: string;
  hint: string;
};

type RecentRecord = {
  id: string;
  name: string;
  hint: string;
  lastOpenedAt: number;
  handle: FileSystemDirectoryHandle;
};

const DB_NAME = "celest";
const DB_VERSION = 2; // Bumped to migrate from "node_ide" to "celest"
const STORE = "recents";
const MAX_RECENTS = 12;

// ---------- In-memory fallback ----------
let mem: RecentRecord[] = [];

function now() {
  return Date.now();
}

function newId() {
  // crypto.randomUUID is widely supported in modern browsers.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // last resort: time + random
  return `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toRecentItem(r: RecentRecord): RecentItem {
  return { key: r.id, name: r.name, hint: r.hint };
}

// ---------- IndexedDB helpers ----------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      
      // Migration from "node_ide" (v1) to "celest" (v2)
      if (oldVersion < 2) {
        // Try to migrate data from old "node_ide" database
        migrateFromNodeIde(db);
      }
      
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

/**
 * Migrate data from old "node_ide" database to "celest" database.
 * This is a best-effort migration that preserves user's recent projects.
 */
async function migrateFromNodeIde(newDb: IDBDatabase): Promise<void> {
  try {
    // Try to open the old database
    const oldDbReq = indexedDB.open("node_ide", 1);
    await new Promise<void>((resolve) => {
      oldDbReq.onsuccess = () => resolve();
      oldDbReq.onerror = () => {
        // Old database doesn't exist, nothing to migrate
        resolve();
      };
    });
    
    const oldDb = oldDbReq.result;
    if (!oldDb) return; // No old database to migrate from
    
    // Check if old database has the recents store
    if (!oldDb.objectStoreNames.contains(STORE)) {
      oldDb.close();
      return;
    }
    
    // Read all records from old database
    const oldStore = oldDb.transaction(STORE, "readonly").objectStore(STORE);
    const getAllReq = oldStore.getAll();
    
    await new Promise<void>((resolve) => {
      getAllReq.onsuccess = () => {
        const oldRecords = getAllReq.result as RecentRecord[];
        
        // Write to new database
        if (oldRecords.length > 0) {
          const newStore = newDb.transaction(STORE, "readwrite").objectStore(STORE);
          for (const record of oldRecords) {
            newStore.put(record);
          }
        }
        
        oldDb.close();
        resolve();
      };
      getAllReq.onerror = () => {
        oldDb.close();
        resolve(); // Non-fatal: continue without migration
      };
    });
  } catch (e) {
    // Migration failed, but this is non-fatal
    console.warn("[recentStore] Failed to migrate from node_ide:", e);
  }
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () =>
      reject(req.error ?? new Error("IndexedDB request failed"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      // best effort
      try {
        db.close();
      } catch {
        // ignore
      }
    };
  });
}

async function idbGetAll(): Promise<RecentRecord[]> {
  // getAll is supported in modern browsers.
  return await withStore("readonly", (s) => s.getAll());
}

async function idbPut(r: RecentRecord): Promise<void> {
  await withStore("readwrite", (s) => s.put(r));
}

async function idbGet(id: string): Promise<RecentRecord | undefined> {
  return await withStore("readonly", (s) => s.get(id));
}

async function idbDelete(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id));
}

// ---------- Public API ----------
export async function listRecents(limit = MAX_RECENTS): Promise<RecentItem[]> {
  try {
    const all = await idbGetAll();
    const sorted = all
      .slice()
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, limit);
    return sorted.map(toRecentItem);
  } catch {
    // fallback
    const sorted = mem
      .slice()
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, limit);
    return sorted.map(toRecentItem);
  }
}

/**
 * Upsert a recent record.
 * Dedup strategy (Phase 1): if there is an existing record with the same name, update it.
 * This isn't perfect (same folder names can exist), but is good enough for MVP.
 */
export async function upsertRecent(
  handle: FileSystemDirectoryHandle,
  hint = "Local folder"
): Promise<string> {
  const name = handle.name ?? "Project";
  try {
    const all = await idbGetAll();
    const existing = all.find((r) => r.name === name);
    const id = existing?.id ?? newId();
    const rec: RecentRecord = {
      id,
      name,
      hint,
      lastOpenedAt: now(),
      handle,
    };
    await idbPut(rec);

    // Trim (keep newest MAX_RECENTS)
    const again = await idbGetAll();
    const sorted = again
      .slice()
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    const extra = sorted.slice(MAX_RECENTS);
    for (const r of extra) {
      await idbDelete(r.id);
    }

    return id;
  } catch {
    const existing = mem.find((r) => r.name === name);
    const id = existing?.id ?? newId();
    const rec: RecentRecord = {
      id,
      name,
      hint,
      lastOpenedAt: now(),
      handle,
    };
    mem = [rec, ...mem.filter((r) => r.id !== id)].slice(0, MAX_RECENTS);
    return id;
  }
}

export async function getRecentHandle(
  key: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const rec = await idbGet(key);
    return rec?.handle ?? null;
  } catch {
    const rec = mem.find((r) => r.id === key);
    return rec?.handle ?? null;
  }
}

export async function touchRecent(
  key: string,
  handle?: FileSystemDirectoryHandle
): Promise<void> {
  try {
    const rec = await idbGet(key);
    if (!rec) return;
    const next: RecentRecord = {
      ...rec,
      lastOpenedAt: now(),
      handle: handle ?? rec.handle,
    };
    await idbPut(next);
  } catch {
    const idx = mem.findIndex((r) => r.id === key);
    if (idx < 0) return;
    const cur = mem[idx];
    const next: RecentRecord = {
      ...cur,
      lastOpenedAt: now(),
      handle: handle ?? cur.handle,
    };
    mem = [next, ...mem.filter((r) => r.id !== key)].slice(0, MAX_RECENTS);
  }
}

export async function removeRecent(key: string): Promise<void> {
  try {
    await idbDelete(key);
  } catch {
    mem = mem.filter((r) => r.id !== key);
  }
}

type FsPermissionDescriptor = FileSystemHandlePermissionDescriptor;

/**
 * Best-effort permission helper for directory handles.
 *
 * Note: We keep this here as a convenience helper for future non-adapter callers,
 * but the canonical flow in Step3 uses StorageAdapter.ensureReadWritePermission().
 */
export async function ensureReadWritePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const opts: FsPermissionDescriptor = { mode: "readwrite" };
    const q = await handle.queryPermission?.(opts);
    if (q === "granted") return true;
    const r = await handle.requestPermission?.(opts);
    return r === "granted";
  } catch {
    // If permission APIs are missing, assume best effort.
    return true;
  }
}
