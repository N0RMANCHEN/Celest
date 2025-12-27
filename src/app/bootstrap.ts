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
    __celest_browser_shortcuts_disabled?: boolean;
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

  // 禁用浏览器原生行为（右键菜单、浏览器快捷键，保留 F12）
  // Guard against HMR / double registration.
  if (!window.__celest_browser_shortcuts_disabled) {
    window.__celest_browser_shortcuts_disabled = true;

    // 阻止右键菜单
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // 阻止浏览器快捷键（除了 F12 开发者工具）
    window.addEventListener("keydown", (e) => {
      // 保留 F12（开发者工具）
      if (e.key === "F12") return;

      // 阻止常见的浏览器快捷键
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // 禁用浏览器缩放快捷键
      if (
        (ctrlOrCmd && (e.key === "+" || e.key === "=")) || // Ctrl/Cmd + Plus (+)
        (ctrlOrCmd && e.key === "-") || // Ctrl/Cmd + Minus (-)
        (ctrlOrCmd && e.key === "0") || // Ctrl/Cmd + 0 (重置缩放)
        (ctrlOrCmd && e.key === "NumpadAdd") || // Ctrl/Cmd + Numpad +
        (ctrlOrCmd && e.key === "NumpadSubtract") || // Ctrl/Cmd + Numpad -
        (ctrlOrCmd && e.key === "Numpad0") // Ctrl/Cmd + Numpad 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 开发者工具相关快捷键
      if (
        (ctrlOrCmd && shift && (e.key === "I" || e.key === "i")) || // Ctrl+Shift+I / Cmd+Shift+I
        (ctrlOrCmd && shift && (e.key === "J" || e.key === "j")) || // Ctrl+Shift+J / Cmd+Shift+J
        (ctrlOrCmd && shift && (e.key === "C" || e.key === "c")) || // Ctrl+Shift+C / Cmd+Shift+C (检查元素)
        (ctrlOrCmd && shift && (e.key === "K" || e.key === "k")) || // Ctrl+Shift+K / Cmd+Shift+K (控制台)
        (ctrlOrCmd && (e.key === "U" || e.key === "u")) || // Ctrl+U / Cmd+U (查看源代码)
        (alt && (e.key === "Home" || e.key === "ArrowLeft")) // Alt+Left (后退)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 阻止 Ctrl/Cmd + Shift + P (命令面板，可能打开开发者工具)
      if (ctrlOrCmd && shift && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    });
  }
}
