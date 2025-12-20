/**
 * features/terminal/TerminalPanel.tsx
 * ----------------
 * Phase 1 Step5B:
 * - Replace legacy terminal with a lightweight log panel.
 */

import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAppStore } from "../../state/store";

function fmtTs(iso: string) {
  // Keep it short: HH:MM:SS
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function TerminalPanel() {
  const { lines, clear } = useAppStore(
    useShallow((s) => ({
      lines: s.terminalLines,
      clear: s.terminalClear,
    }))
  );

  const endRef = useRef<HTMLDivElement | null>(null);

  const shown = useMemo(() => {
    // Render at most the last 200 lines to keep DOM light.
    const max = 200;
    return lines.length > max ? lines.slice(lines.length - max) : lines;
  }, [lines]);

  useEffect(() => {
    // Auto-scroll to the bottom for new logs.
    endRef.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  return (
    <div className="terminal" role="region" aria-label="Terminal">
      <div className="terminal__header">
        <div className="terminal__title">Terminal</div>
        <div className="terminal__actions">
          <button className="terminal__btn" onClick={clear} title="Clear logs">
            Clear
          </button>
        </div>
      </div>

      <div className="terminal__body" role="log" aria-live="polite">
        {shown.length === 0 ? (
          <div className="terminal__empty">No logs yet.</div>
        ) : (
          shown.map((l) => (
            <div key={l.id} className={`terminal__line terminal__line--${l.level}`}>
              <span className="terminal__ts">{fmtTs(l.ts)}</span>
              <span className="terminal__lvl">{l.level.toUpperCase()}</span>
              <span className="terminal__msg">{l.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
