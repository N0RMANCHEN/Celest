/**
 * state/slices/terminalSlice.ts
 * ----------------
 * Step5B:
 * - Provide a simple, app-wide Terminal log buffer.
 * - Used by persistence/errors now, and later by "run/compile/AI" jobs.
 */

import type { StateCreator } from "zustand";
import { nanoid } from "nanoid";

import type { AppState, TerminalLevel, TerminalLine, TerminalSlice } from "../types";

const MAX_LINES = 500;

function nowIso(): string {
  return new Date().toISOString();
}

export const createTerminalSlice: StateCreator<AppState, [], [], TerminalSlice> = (
  set
) => ({
  terminalLines: [],

  terminalLog: (level: TerminalLevel, message: string) => {
    const line: TerminalLine = {
      id: `t_${nanoid()}`,
      ts: nowIso(),
      level,
      message,
    };

    set((s) => {
      const next = [...s.terminalLines, line];
      const trimmed = next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      return { terminalLines: trimmed };
    });
  },

  terminalClear: () => set({ terminalLines: [] }),
});
