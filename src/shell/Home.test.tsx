import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./Home";
import * as store from "../state/store";
import type { AppState } from "../state/types";
import type { RecentItem } from "../features/project/recentStore";

vi.stubGlobal("isSecureContext", true);
vi.stubGlobal("showDirectoryPicker", vi.fn());

describe("Home open status UI", () => {
  it("打开中按钮禁用并显示文案", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: RecentItem[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation(
      (sel: (state: AppState) => unknown) =>
        sel({
          openProjectFolder,
          recents,
          reopenRecent,
          openStatus: { state: "opening" },
          panels: { left: false, inspector: false, terminal: false },
          togglePanel: () => {},
        } as unknown as AppState)
    );

    render(<Home />);
    const btn = screen.getByText("Opening...");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/正在打开并扫描项目/)).toBeTruthy();
  });

  it("错误时显示提示", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: RecentItem[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation(
      (sel: (state: AppState) => unknown) =>
        sel({
          openProjectFolder,
          recents,
          reopenRecent,
          openStatus: { state: "error", message: "boom" },
          panels: { left: false, inspector: false, terminal: false },
          togglePanel: () => {},
        } as unknown as AppState)
    );

    render(<Home />);
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("正常时点击会触发 openProjectFolder", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: RecentItem[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation(
      (sel: (state: AppState) => unknown) =>
        sel({
          openProjectFolder,
          recents,
          reopenRecent,
          openStatus: { state: "idle" },
          panels: { left: false, inspector: false, terminal: false },
          togglePanel: () => {},
        } as unknown as AppState)
    );

    render(<Home />);
    fireEvent.click(screen.getByText("Open Project Folder"));
    expect(openProjectFolder).toHaveBeenCalled();
  });
});

