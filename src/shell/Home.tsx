/**
 * shell/Home.tsx
 * ----------------
 * Home screen:
 * - Open a project folder (creates a new tab)
 * - List recents (reopen)
 *
 * P0-Task-6:
 * - Graceful fallback if File System Access API is unavailable:
 *   - show an inline explanation
 *   - disable actions that rely on showDirectoryPicker
 */

import { useAppStore } from "../state/store";

function getFsApiStatus() {
  const isSecure =
    typeof window !== "undefined" ? Boolean(window.isSecureContext) : false;

  const hasPicker =
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function";

  // In practice: we need both.
  const canUse = isSecure && hasPicker;

  return { canUse, isSecure, hasPicker };
}

export default function Home() {
  const openProjectFolder = useAppStore((s) => s.openProjectFolder);
  const recents = useAppStore((s) => s.recents);
  const reopenRecent = useAppStore((s) => s.reopenRecent);

  const { canUse, isSecure, hasPicker } = getFsApiStatus();

  return (
    <div className="home">
      <div className="home__card">
        <div className="home__title">Open a Project</div>
        <div className="home__desc">
          选择一个本地文件夹作为项目（Project）。每个项目会打开为一个 Tab。
        </div>

        {!canUse ? (
          <div className="home__desc" style={{ marginTop: 10 }}>
            <b>当前环境不支持打开本地文件夹。</b>
            <div style={{ marginTop: 6, lineHeight: 1.6 }}>
              原因：
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                {!hasPicker ? (
                  <li>
                    浏览器缺少 <code>showDirectoryPicker</code>（File System
                    Access API）。建议使用 Chrome/Edge。
                  </li>
                ) : null}
                {!isSecure ? (
                  <li>
                    当前不是安全上下文（需要 HTTPS 或 localhost）。请用{" "}
                    <code>npm run dev</code> 在本地启动，或部署到 HTTPS。
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        <button
          className="okx-btn okx-btn--primary"
          disabled={!canUse}
          aria-disabled={!canUse}
          onClick={() => {
            // double-guard: even if button is enabled, keep runtime safe
            if (!canUse) {
              alert(
                "当前环境不支持 File System Access API（建议 Chrome/Edge + HTTPS/localhost）。"
              );
              return;
            }
            openProjectFolder();
          }}
          title={
            canUse
              ? "Open Project Folder"
              : "当前环境不支持打开本地文件夹（建议 Chrome/Edge + HTTPS/localhost）"
          }
        >
          Open Project Folder
        </button>
      </div>

      <div className="home__section">
        <div className="home__sectionTitle">Recent</div>

        {!canUse ? (
          <div className="home__empty">
            当前浏览器不支持打开本地文件夹，因此 Recent 也无法重新打开。
          </div>
        ) : recents.length === 0 ? (
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
