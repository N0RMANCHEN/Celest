/**
 * shell/TopTabs.tsx
 * ----------------
 * Top tabs (Figma-like):
 * - Home button
 * - Project tabs
 * - Open project (+)
 * - Panel toggles (left/inspector/terminal)
 */

import { useMemo } from "react";
import React from "react";
import { useAppStore } from "../state/store";

function Icon({
  name,
  size = 16,
}: {
  name: "home" | "plus" | "save" | "panelLeft" | "panelRight" | "terminal";
  size?: number;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24" };
  switch (name) {
    case "home":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} aria-hidden="true" className="top-tabs__plusIcon" style={{ width: 14, height: 14 }}>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="top-tabs__plusIconPath"
          />
        </svg>
      );
    case "save":
      return (
        <svg {...common} aria-hidden="true">
          <path
            d="M5 3h12l4 4v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M7 3v6h10V3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M7 21v-8h10v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
            className="top-tabs__panelIconBar"
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
            className="top-tabs__panelIconBar"
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

  const saveUiByProjectId = useAppStore((s) => s.saveUiByProjectId);

  const panels = useAppStore((s) => s.panels);
  const togglePanel = useAppStore((s) => s.togglePanel);

  const tabs = useMemo(() => projects, [projects]);

  return (
    <div className="top-tabs">
      <button className="top-tabs__iconbtn" onClick={goHome} title="Home">
        <Icon name="home" />
      </button>

      {/* 在 home 和第一个 tab 之间添加分割线 */}
      {tabs.length > 0 ? <span className="top-tabs__tabSep" /> : null}

      <div className="top-tabs__strip" role="tablist" aria-label="Projects">
        {tabs.map((p, index) => {
          const active = p.id === activeProjectId;
          const ui = saveUiByProjectId[p.id];
          const isDirty = !!ui?.dirty;
          return (
            <React.Fragment key={p.id}>
              <div
                className={`top-tabs__tab ${active ? "is-active" : ""}`}
                role="tab"
                aria-selected={active}
                onMouseDown={(e) => {
                  // Avoid text selection while clicking tabs.
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
                  {isDirty ? <span className="top-tabs__dirtyDot" aria-label="Unsaved" /> : null}
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
              {/* 在 tab 之间添加分割线（最后一个 tab 后不添加） */}
              {index < tabs.length - 1 ? (
                <span className="top-tabs__tabSep" />
              ) : null}
            </React.Fragment>
          );
        })}
        
        {/* 在最后一个 tab 和加号按钮之间添加分割线 */}
        {tabs.length > 0 ? <span className="top-tabs__tabSep" /> : null}
        
        {/* 加号按钮放在 tab strip 内，紧邻 tabs */}
        <button
          className="top-tabs__addBtn"
          onClick={openProjectFolder}
          title="Open Project Folder"
        >
          <Icon name="plus" />
        </button>
      </div>

      {/* 只在有项目打开时显示右侧按钮 */}
      {activeProjectId ? (
        <div className="top-tabs__right">
          <button
            className={`top-tabs__iconbtn ${panels.left ? "is-on" : ""}`}
            onClick={() => togglePanel("left")}
            title="Toggle Left Sidebar"
          >
            <Icon name="panelLeft" />
          </button>

          <button
            className={`top-tabs__iconbtn ${panels.terminal ? "is-on" : ""}`}
            onClick={() => togglePanel("terminal")}
            title="Toggle Terminal"
          >
            <Icon name="terminal" />
          </button>

          <button
            className={`top-tabs__iconbtn ${panels.inspector ? "is-on" : ""}`}
            onClick={() => togglePanel("inspector")}
            title="Toggle Inspector"
          >
            <Icon name="panelRight" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
