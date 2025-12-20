/**
 * App.tsx
 * ----------------
 * 装配层入口：只挂载 AppShell（保持很薄）
 */

import AppShell from "../shell/AppShell";

export default function App() {
  return <AppShell />;
}
