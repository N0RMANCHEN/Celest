/**
 * Global hotkey configuration and matcher.
 * - Centralizes all keybindings for consistency and future user settings.
 * - Supports platform-aware "mod" (Cmd on macOS, Ctrl on others).
 */

export type HotkeyBinding = {
  key?: string; // e.key (case-insensitive)
  code?: string; // e.code (exact)
  mod?: boolean; // true means Cmd on macOS, Ctrl on others
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
};

export type HotkeyConfig = {
  id: string;
  description: string;
  scope: "global" | "canvas" | "viewport";
  bindings: HotkeyBinding[];
};

const isMac = () =>
  typeof navigator !== "undefined" &&
  navigator.platform.toLowerCase().includes("mac");

export function matchHotkey(
  e: KeyboardEvent | React.KeyboardEvent,
  binding: HotkeyBinding
): boolean {
  const mac = isMac();
  const keyMatch = binding.key
    ? (e.key || "").toLowerCase() === binding.key.toLowerCase()
    : true;
  const codeMatch = binding.code ? e.code === binding.code : true;

  const modMatch =
    binding.mod === undefined
      ? true
      : (mac ? e.metaKey : e.ctrlKey) === binding.mod;
  const ctrlMatch = binding.ctrl === undefined ? true : e.ctrlKey === binding.ctrl;
  const metaMatch = binding.meta === undefined ? true : e.metaKey === binding.meta;
  const altMatch = binding.alt === undefined ? true : e.altKey === binding.alt;
  const shiftMatch =
    binding.shift === undefined ? true : e.shiftKey === binding.shift;

  return (
    keyMatch &&
    codeMatch &&
    modMatch &&
    ctrlMatch &&
    metaMatch &&
    altMatch &&
    shiftMatch
  );
}

export function matchAnyHotkey(
  e: KeyboardEvent | React.KeyboardEvent,
  bindings: HotkeyBinding[]
): boolean {
  return bindings.some((b) => matchHotkey(e, b));
}

export const HOTKEYS = {
  canvasDelete: {
    id: "canvas.delete",
    description: "Delete selected nodes/edges",
    scope: "canvas",
    bindings: [{ key: "Delete" }, { key: "Backspace" }],
  },
  canvasEscape: {
    id: "canvas.escape",
    description: "Cancel connection or drag",
    scope: "canvas",
    bindings: [{ key: "Escape" }],
  },
  viewportSpacePan: {
    id: "viewport.spacePan",
    description: "Hold Space to pan",
    scope: "viewport",
    bindings: [{ code: "Space" }],
  },
  globalSave: {
    id: "global.save",
    description: "Save current project",
    scope: "global",
    bindings: [{ key: "s", mod: true }],
  },
} satisfies Record<string, HotkeyConfig>;


