/**
 * Topbar.tsx
 * ----------------
 * 用途：
 *  - 兼容旧组件名：Topbar -> TopTabs
 *  - 旧 Props 仍保留（但当前不使用）
 *
 * 对外接口：
 *  - default export Topbar()
 */

import TopTabs from "./TopTabs";

export default function Topbar() {
  return <TopTabs />;
}
