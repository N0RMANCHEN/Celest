/**
 * TopTabs.tsx
 * ----------------
 * 用途：
 *  - 顶部 Tab 栏（Figma-like）：
 *    - 左：Home icon + 项目 Tabs（每个 tab 一个 Project）
 *    - 右：+（打开项目）+ 面板开关 icons（Left/Inspector/Terminal）
 *
 * 对外接口：
 *  - default export TopTabs()
 */

import { useMemo } from "react";
import { useAppStore } from "../state/store";

function Icon({
  name,
  size = 16,
}: {
  name: "home" | "plus" | "panelLeft" | "panelRight" | "terminal";
  size?: number;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24" };
  switch (name) {
    case "home":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
            fill="currentColor"
          />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "panelLeft":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 0v14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 5v14"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      );
    case "panelRight":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M15 5v14"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      );
    case "terminal":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M7 10l2 2-2 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 14h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default function TopTabs() {
  const projects = useAppStore((s) => s.projects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);

  const goHome = useAppStore((s) => s.goHome);
  const setActiveProject = useAppStore((s) => s.setActiveProject);
  const closeProject = useAppStore((s) => s.closeProject);
  const openProjectFolder = useAppStore((s) => s.openProjectFolder);

  const panels = useAppStore((s) => s.panels);
  const togglePanel = useAppStore((s) => s.togglePanel);

  const tabs = useMemo(() => projects, [projects]);

  return (
    <div className="top-tabs">
      <button className="top-tabs__iconbtn" onClick={goHome} title="Home">
        <Icon name="home" />
      </button>

      <div className="top-tabs__strip" role="tablist" aria-label="Projects">
        {tabs.map((p) => {
          const active = p.id === activeProjectId;
          return (
            <div
              key={p.id}
              className={`top-tabs__tab ${active ? "is-active" : ""}`}
              role="tab"
              aria-selected={active}
              onMouseDown={(e) => {
                // 避免拖拽选中文本导致手感怪
                e.preventDefault();
              }}
            >
              <button
                className="top-tabs__tabMain"
                onClick={() => setActiveProject(p.id)}
                title={p.name}
              >
                <span className="top-tabs__tabIcon">◦</span>
                <span className="top-tabs__tabText">{p.name}</span>
              </button>

              <button
                className="top-tabs__tabClose"
                onClick={() => closeProject(p.id)}
                title="Close"
                aria-label={`Close ${p.name}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="top-tabs__right">
        <button
          className="top-tabs__iconbtn"
          onClick={openProjectFolder}
          title="Open Project Folder"
        >
          <Icon name="plus" />
        </button>

        <span className="top-tabs__sep" />

        <button
          className={`top-tabs__iconbtn ${panels.left ? "is-on" : ""}`}
          onClick={() => togglePanel("left")}
          title="Toggle Left Sidebar"
        >
          <Icon name="panelLeft" />
        </button>

        <button
          className={`top-tabs__iconbtn ${panels.inspector ? "is-on" : ""}`}
          onClick={() => togglePanel("inspector")}
          title="Toggle Inspector"
        >
          <Icon name="panelRight" />
        </button>

        <button
          className={`top-tabs__iconbtn ${panels.terminal ? "is-on" : ""}`}
          onClick={() => togglePanel("terminal")}
          title="Toggle Terminal"
        >
          <Icon name="terminal" />
        </button>
      </div>
    </div>
  );
}
