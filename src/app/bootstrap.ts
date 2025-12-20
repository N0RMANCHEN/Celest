/**
 * bootstrap.ts
 * ----------------
 * Phase 1 Step3A-C:
 * - Global init for the new slice store.
 * - Hydrate Recent Projects (IndexedDB) on startup.
 */

import { useAppStore } from "../state/store";

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
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if ((e.key || "").toLowerCase() !== "s") return;

      // Prevent browser save dialog.
      e.preventDefault();
      void useAppStore.getState().flushActiveProjectSave({ reason: "hotkey" });
    });
  }
}
