/**
 * main.tsx
 * ----------------
 * React 应用入口：挂载到 #root
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { bootstrap } from "./app/bootstrap";
import "./index.css";

bootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
