/**
 * main.tsx
 * ----------------
 * 用途：
 *  - React 应用入口，挂载到 #root
 *
 * 对外接口：
 *  - 无（Vite 入口文件）
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
