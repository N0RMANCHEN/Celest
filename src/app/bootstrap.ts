/**
 * bootstrap.ts
 * ----------------
 * Phase 1 Step3A-C:
 * - Global init for the new slice store.
 * - Hydrate Recent Projects (IndexedDB) on startup.
 */

import { useAppStore } from "../state/store";
import { HOTKEYS, matchAnyHotkey } from "../config/hotkeys";

declare global {
  interface Window {
    __celest_save_hotkey_bound?: boolean;
  }
}

export function bootstrap() {
  // Do not await: boot should be sync and fast.
  void useAppStore.getState().hydrateRecents();

  // Step5B: global hotkey Cmd/Ctrl+S -> save current project
  // Guard against HMR / double registration.
  if (!window.__celest_save_hotkey_bound) {
    window.__celest_save_hotkey_bound = true;
    window.addEventListener("keydown", (e) => {
      if (!matchAnyHotkey(e, HOTKEYS.globalSave.bindings)) return;
      // Prevent browser save dialog.
      e.preventDefault();
      void useAppStore.getState().flushActiveProjectSave({ reason: "hotkey" });
    });
  }
}
