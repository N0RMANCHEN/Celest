/**
 * Global app-level configuration (tunable defaults).
 * Autosave supports multiple presets; default is 30s.
 */

export const AUTOSAVE_MODES_MS = {
  realtime: 900, // ~1s debounce（原始近实时）
  thirtySeconds: 30_000,
  threeMinutes: 180_000,
} as const;

export type AutosaveModeKey = keyof typeof AUTOSAVE_MODES_MS;

export const DEFAULT_AUTOSAVE_MODE: AutosaveModeKey = "thirtySeconds";

export const AUTOSAVE_INTERVAL_MS = AUTOSAVE_MODES_MS[DEFAULT_AUTOSAVE_MODE];


