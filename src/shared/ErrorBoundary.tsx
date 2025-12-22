/**
 * shared/ErrorBoundary.tsx
 * ----------------
 * P0-1: React Error Boundary component for catching and handling errors.
 * 
 * Used to prevent Canvas crashes from propagating to the entire app.
 */

import { Component, type ReactNode } from "react";
import type { TerminalLevel } from "../state/types";
import { logger } from "./utils/logger";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * 可选：将错误写入外部日志（例如 Terminal 面板）。
   */
  onLog?: (level: TerminalLevel, message: string) => void;
  /**
   * 可选：错误重试时调用（用于重置相关状态）。
   */
  onReset?: () => void;
  /**
   * 可选：用于标识上下文（例如 "Canvas"）。
   */
  context?: string;
  /**
   * 可选：自定义刷新动作（测试可注入，默认 window.location.reload）
   */
  reloadFn?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const label = this.props.context ?? "ErrorBoundary";
    const msg = `[${label}] ${error.message}`;

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    this.props.onLog?.("error", msg);
    
    // Log to console for debugging
    logger.error(msg, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: "20px",
              border: "1px solid #ef4444",
              borderRadius: "4px",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 6px 0" }}>
                {this.props.context ?? "发生错误"}
              </h3>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                组件渲染出错。你可以尝试重试；若仍不正常，请刷新页面。
                错误详情已记录，打开 Terminal 面板查看日志。
              </p>
            </div>
            {this.state.error && (
              <details style={{ marginTop: "10px" }}>
                <summary style={{ cursor: "pointer" }}>Error Details</summary>
                <pre
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fee2e2",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "12px",
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.error.stack && (
                    <>
                      {"\n\n"}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                重试
              </button>
              <button
                onClick={() => (this.props.reloadFn ?? window.location.reload)()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#e5e7eb",
                  color: "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                刷新页面
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

