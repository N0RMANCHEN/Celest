/**
 * shell/workbench/LeftSidebar.tsx
 * ----------------
 * Left sidebar:
 * - Project name
 * - Views (fixed 2 for Phase 1)
 * - File tree (driven by FsIndexSnapshot)
 */

import type { ProjectState, ViewState } from "../../features/project/openProject";
import type { FsIndexNode, FsIndexSnapshot } from "../../entities/fsIndex/types";

type Props = {
  project: ProjectState;
  fsIndex: FsIndexSnapshot | null;
  expanded: Record<string, boolean>;
  selectedId: string | null;
  onToggleExpanded: (dirId: string) => void;
  onSelect: (nodeId: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchView: (viewId: ViewState["id"]) => void;
};

export default function LeftSidebar(props: Props) {
  const rootId = props.fsIndex?.rootId ?? null;

  return (
    <div className="leftSidebar">
      <div className="leftSidebar__header">
        <div className="leftSidebar__projectName" title={props.project.name}>
          {props.project.name}
        </div>
      </div>

      <div className="leftSidebar__section">
        <div className="leftSidebar__sectionTitle">Views</div>
        <div className="views">
          {props.project.views.map((v: ViewState) => {
            const active = v.id === props.project.activeViewId;
            return (
              <button
                key={v.id}
                className={`views__item ${active ? "is-active" : ""}`}
                onClick={() => props.onSwitchView(v.id)}
                title={v.name}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="leftSidebar__section leftSidebar__section--grow">
        <div className="leftSidebar__sectionTitle">Layers</div>

        <div className="tree">
          {props.fsIndex && rootId ? (
            <TreeNode
              nodeId={rootId}
              snapshot={props.fsIndex}
              expanded={props.expanded}
              selectedId={props.selectedId}
              onToggle={props.onToggleExpanded}
              onSelect={props.onSelect}
              onOpenFile={props.onOpenFile}
            />
          ) : (
            <div className="tree__empty">No project loaded.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode(props: {
  nodeId: string;
  snapshot: FsIndexSnapshot;
  expanded: Record<string, boolean>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const node: FsIndexNode | undefined = props.snapshot.nodes[props.nodeId];
  if (!node) return null;

  const isDir = node.kind === "dir";
  const isOpen = isDir ? (props.expanded[node.id] ?? false) : false;
  const isSelected = props.selectedId === node.id;

  return (
    <div className="treeNode">
      <div className="treeNode__row">
        {isDir ? (
          <button
            className="treeNode__twisty"
            onClick={() => props.onToggle(node.id)}
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="treeNode__twisty treeNode__twisty--blank" />
        )}

        <button
          className={`treeNode__label ${isSelected ? "is-selected" : ""}`}
          onClick={() => {
            props.onSelect(node.id);
            if (node.kind === "file") props.onOpenFile(node.path);
          }}
          title={node.path}
        >
          <span className="treeNode__kind">{isDir ? "📁" : "📄"}</span>
          <span className="treeNode__text">{node.name}</span>
        </button>
      </div>

      {isDir && isOpen ? (
        <div className="treeNode__children">
          {node.children.map((childId) => (
            <TreeNode
              key={childId}
              nodeId={childId}
              snapshot={props.snapshot}
              expanded={props.expanded}
              selectedId={props.selectedId}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
              onOpenFile={props.onOpenFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
