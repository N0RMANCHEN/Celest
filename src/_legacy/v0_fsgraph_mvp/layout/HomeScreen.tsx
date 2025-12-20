/**
 * HomeScreen.tsx
 * ----------------
 * 用途：
 *  - Home（项目列表/最近打开）页面
 *  - 与 “New Project 页面”分离：这里是入口/列表，Open 用于新增 Tab
 *
 * 对外接口：
 *  - default export HomeScreen()
 */

import { useAppStore } from "../state/store";

export default function HomeScreen() {
  const openProjectFolder = useAppStore((s) => s.openProjectFolder);
  const recents = useAppStore((s) => s.recents);
  const reopenRecent = useAppStore((s) => s.reopenRecent);

  return (
    <div className="home">
      <div className="home__card">
        <div className="home__title">Open a Project</div>
        <div className="home__desc">
          选择一个本地文件夹作为项目（Project）。每个项目会打开为一个 Tab。
        </div>

        <button
          className="okx-btn okx-btn--primary"
          onClick={openProjectFolder}
        >
          Open Project Folder
        </button>
      </div>

      <div className="home__section">
        <div className="home__sectionTitle">Recent</div>

        {recents.length === 0 ? (
          <div className="home__empty">暂无最近项目（先打开一个项目）。</div>
        ) : (
          <div className="home__list">
            {recents.map((r) => (
              <button
                key={r.key}
                className="home__item"
                onClick={() => reopenRecent(r.key)}
                title={r.name}
              >
                <div className="home__itemName">{r.name}</div>
                <div className="home__itemSub">{r.hint}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
