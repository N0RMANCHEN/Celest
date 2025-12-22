import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./Home";
import * as store from "../state/store";

vi.stubGlobal("isSecureContext", true);
vi.stubGlobal("showDirectoryPicker", vi.fn());

describe("Home open status UI", () => {
  it("打开中按钮禁用并显示文案", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: any[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation((sel: any) =>
      sel({
        openProjectFolder,
        recents,
        reopenRecent,
        openStatus: { state: "opening" },
      })
    );

    render(<Home />);
    const btn = screen.getByText("Opening...");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/正在打开并扫描项目/)).toBeTruthy();
  });

  it("错误时显示提示", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: any[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation((sel: any) =>
      sel({
        openProjectFolder,
        recents,
        reopenRecent,
        openStatus: { state: "error", message: "boom" },
      })
    );

    render(<Home />);
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("正常时点击会触发 openProjectFolder", () => {
    const openProjectFolder = vi.fn();
    const reopenRecent = vi.fn();
    const recents: any[] = [];

    vi.spyOn(store, "useAppStore").mockImplementation((sel: any) =>
      sel({
        openProjectFolder,
        recents,
        reopenRecent,
        openStatus: { state: "idle" },
      })
    );

    render(<Home />);
    fireEvent.click(screen.getByText("Open Project Folder"));
    expect(openProjectFolder).toHaveBeenCalled();
  });
});

