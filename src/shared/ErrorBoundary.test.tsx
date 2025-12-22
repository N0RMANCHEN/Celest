import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { FC } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

const Boom: FC = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  const onError = vi.fn();
  const onLog = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("正常渲染时显示子节点，不触发 onError/onLog", () => {
    render(
      <ErrorBoundary context="TestCtx" onError={onError} onLog={onLog}>
        <div>child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("child")).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
    expect(onLog).not.toHaveBeenCalled();
  });

  it("子组件抛错时展示 fallback，并调用 onError/onLog，文案包含 context", () => {
    render(
      <ErrorBoundary context="Canvas" onError={onError} onLog={onLog}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Canvas")).toBeTruthy();
    expect(screen.getByText(/组件渲染出错/)).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onLog).toHaveBeenCalledWith("error", expect.stringContaining("Canvas"));
  });

  it("点击重试会清除错误并调用 onReset", async () => {
    const { rerender } = render(
      <ErrorBoundary context="Canvas" onError={onError} onLog={onLog} onReset={onReset}>
        <Boom />
      </ErrorBoundary>
    );

    // 先更新为不再抛错的子节点，再点“重试”清理错误
    rerender(
      <ErrorBoundary context="Canvas" onError={onError} onLog={onLog} onReset={onReset}>
        <div>ok</div>
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("重试"));
    expect(onReset).toHaveBeenCalledTimes(1);

    const okNode = await screen.findByText("ok");
    expect(okNode).toBeTruthy();
  });

  it("点击刷新页面触发 location.reload（通过 spy 拦截）", () => {
    const reloadMock = vi.fn();

    render(
      <ErrorBoundary context="Canvas" onError={onError} onLog={onLog} reloadFn={reloadMock}>
        <Boom />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("刷新页面"));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

