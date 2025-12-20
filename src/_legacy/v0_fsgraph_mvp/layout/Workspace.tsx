/**
 * Workspace.tsx
 * ----------------
 * 用途：
 *  - 兼容旧入口：Workspace -> AppShell
 *  - 避免旧实现继续引用旧 store 字段导致 TS 报错
 *
 * 对外接口：
 *  - default export Workspace()
 */

import AppShell from "./AppShell";

export default function Workspace() {
  return <AppShell />;
}
