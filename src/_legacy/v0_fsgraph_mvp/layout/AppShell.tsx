/**
 * AppShell.tsx
 * ----------------
 * 用途：
 *  - 整个应用的“Figma-like Shell”：
 *    - 顶部：TopTabs（Home + Project Tabs + 右上角面板开关 icon）
 *    - 主区：HomeScreen（项目列表/最近）或 Workbench（编辑区）
 *
 * 对外接口：
 *  - default export AppShell()
 */

import TopTabs from "./TopTabs";
import HomeScreen from "./HomeScreen";
import Workbench from "./Workbench";
import { useAppStore } from "../state/store";

export default function AppShell() {
  const activeProjectId = useAppStore((s) => s.activeProjectId);

  return (
    <div className="shell-root">
      <TopTabs />

      <div className="shell-main">
        {activeProjectId ? <Workbench /> : <HomeScreen />}
      </div>
    </div>
  );
}
