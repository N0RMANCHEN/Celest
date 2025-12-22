import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import Workspace from "./Workspace";
import * as useWorkbenchModelModule from "../state/hooks/useWorkbenchModel";

describe("Workspace save badge", () => {
  const baseVm = {
    panels: { left: false, inspector: false, terminal: false },
    project: {
      id: "p1",
      name: "proj",
    },
    fsIndex: null,
    fsExpanded: {},
    fsSelectedId: null,
    activeFilePath: null,
    saveUi: { dirty: false, status: "idle", seq: 0, lastSavedAt: "2024-01-01T00:00:00Z" },
    canvasNodes: [],
    canvasEdges: [],
    activeViewId: "main",
    viewport: { x: 0, y: 0, zoom: 1, z: 1 },
    focusRequest: null,
    selectedGraphNode: null,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onSelectionChange: vi.fn(),
    onCreateNoteNodeAt: vi.fn(),
    onUpdateNodeTitle: vi.fn(),
    onUpdateNoteText: vi.fn(),
    onUpdateFilePath: vi.fn(),
    setActiveView: vi.fn(),
    updateActiveViewViewport: vi.fn(),
    toggleFsExpanded: vi.fn(),
    selectFsEntry: vi.fn(),
    openFile: vi.fn(),
  };

  it("显示已保存时间", () => {
    vi.spyOn(useWorkbenchModelModule, "useWorkbenchModel").mockReturnValue({
      ...baseVm,
      saveUi: { dirty: false, status: "idle", seq: 0, lastSavedAt: "2024-01-01T12:34:56Z" },
    } as any);

    render(<Workspace />);
    expect(screen.getByText(/已保存/)).toBeTruthy();
  });

  it("保存中状态", () => {
    vi.spyOn(useWorkbenchModelModule, "useWorkbenchModel").mockReturnValue({
      ...baseVm,
      saveUi: { dirty: true, status: "saving", seq: 1 },
    } as any);

    render(<Workspace />);
    expect(screen.getByText("保存中…")).toBeTruthy();
  });

  it("保存失败状态", () => {
    vi.spyOn(useWorkbenchModelModule, "useWorkbenchModel").mockReturnValue({
      ...baseVm,
      saveUi: { dirty: true, status: "error", seq: 2, lastError: "boom" },
    } as any);

    render(<Workspace />);
    expect(screen.getByText(/保存失败/)).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
  });
});

