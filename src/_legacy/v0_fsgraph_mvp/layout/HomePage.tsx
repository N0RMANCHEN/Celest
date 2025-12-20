/**
 * Homepage.tsx
 * ----------------
 * 用途：
 *  - 兼容旧文件名：Homepage -> HomeScreen
 *  - 该文件不再直接访问 store 的 openFolder（已迁移为 openProjectFolder）
 *
 * 对外接口：
 *  - default export HomeScreen
 */

import HomeScreen from "./HomeScreen";

export default HomeScreen;
