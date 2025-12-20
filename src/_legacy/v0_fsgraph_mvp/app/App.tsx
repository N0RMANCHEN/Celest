/**
 * App.tsx
 * ----------------
 * 用途：
 *  - 应用根组件：只负责挂载 AppShell（路由/布局由 AppShell 统一管理）
 *
 * 对外接口：
 *  - default export App()
 */

import AppShell from "../layout/AppShell";

export default function App() {
  return <AppShell />;
}
