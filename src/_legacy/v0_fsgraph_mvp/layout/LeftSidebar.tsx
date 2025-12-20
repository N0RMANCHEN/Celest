/**
 * LeftSidebar.tsx
 * ----------------
 * 用途：
 *  - 左侧栏（Figma-like）：
 *    - 顶部：项目名
 *    - Views：固定 2 个（Main / View 2），用于保存 viewport + 层级路径（未来）
 *    - Tree：项目文件结构树（folder 可展开；点击 folder/file 本体=选中对应 Node 并定位）
 *
 * 对外接口：
 *  - default export LeftSidebar(props)
 *  - Props:
 *    - projectName: string
 *    - views: {id,name}[]
 *    - activeViewId: string
 *    - onSwitchView(viewId)
 */

import { useMemo } from "react";
import { useAppStore } from "../state/store";
import type { ViewState } from "../state/store";
import type { FsMeta } from "../services/fsGraph";

type Props = {
  projectName: string;
  views: ViewState[];
  activeViewId: string;
  onSwitchView: (id: string) => void;
};

type TreeItem = {
  id: string;
  meta: FsMeta;
  children: TreeItem[];
};

export default function LeftSidebar(props: Props) {
  const project = useAppStore((s) => s.getActiveProject());
  const expanded = useAppStore((s) => s.getActiveProject()?.treeExpanded ?? {});
  const toggleExpanded = useAppStore((s) => s.toggleTreeExpanded);
  const selectAndFocus = useAppStore((s) => s.selectAndFocusNode);

  const rootId = project?.rootDirId;

  const tree = useMemo(() => {
    if (!project || !rootId) return null;

    const byParent = new Map<string | undefined, string[]>();
    Object.values(project.meta).forEach((m) => {
      const pid = m.parentId;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid)!.push(m.id);
    });

    const build = (id: string): TreeItem => {
      const meta = project.meta[id];
      const kids = (byParent.get(id) ?? []).map(build).sort((a, b) => {
        // dir 在前，file 在后；同类按 name
        if (a.meta.kind !== b.meta.kind) return a.meta.kind === "dir" ? -1 : 1;
        return a.meta.name.localeCompare(b.meta.name);
      });
      return { id, meta, children: kids };
    };

    return build(rootId);
  }, [project, rootId]);

  return (
    <div className="leftSidebar">
      <div className="leftSidebar__header">
        <div className="leftSidebar__projectName" title={props.projectName}>
          {props.projectName}
        </div>
      </div>

      <div className="leftSidebar__section">
        <div className="leftSidebar__sectionTitle">Views</div>
        <div className="views">
          {props.views.map((v) => {
            const active = v.id === props.activeViewId;
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
          {tree ? (
            <TreeNode
              item={tree}
              expanded={expanded}
              onToggle={(id) => toggleExpanded(id)}
              onSelect={(id) => selectAndFocus(id)}
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
  item: TreeItem;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const isDir = props.item.meta.kind === "dir";
  const isOpen = props.expanded[props.item.id] ?? true;

  return (
    <div className="treeNode">
      <div className="treeNode__row">
        {isDir ? (
          <button
            className="treeNode__twisty"
            onClick={() => props.onToggle(props.item.id)}
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="treeNode__twisty treeNode__twisty--blank" />
        )}

        <button
          className="treeNode__label"
          onClick={() => props.onSelect(props.item.id)}
          title={props.item.meta.path}
        >
          <span className="treeNode__kind">{isDir ? "📁" : "📄"}</span>
          <span className="treeNode__text">{props.item.meta.name}</span>
        </button>
      </div>

      {isDir && isOpen ? (
        <div className="treeNode__children">
          {props.item.children.map((c) => (
            <TreeNode
              key={c.id}
              item={c}
              expanded={props.expanded}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
