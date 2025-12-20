/**
 * shell/AppShell.tsx
 * ----------------
 * Phase 1 Step3A-C:
 * - New shell that depends on the slice store (not legacy store).
 */

import { useAppStore } from "../state/store";

import TopTabs from "./TopTabs";
import Home from "./Home";
import Workspace from "./Workspace";

export default function AppShell() {
  const activeProjectId = useAppStore((s) => s.activeProjectId);

  return (
    <div className="shell-root">
      <TopTabs />
      <div className="shell-main">{activeProjectId ? <Workspace /> : <Home />}</div>
    </div>
  );
}
