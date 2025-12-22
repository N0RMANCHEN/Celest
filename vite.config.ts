import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库单独打包
          "react-vendor": ["react", "react-dom"],
          // CodeMirror 编辑器相关（Inspector 面板按需加载）
          "codemirror-vendor": [
            "@uiw/react-codemirror",
            "@codemirror/lang-markdown",
            "@codemirror/view",
            "@codemirror/state",
            "@codemirror/language",
            "@lezer/highlight",
            "@codemirror/commands",
          ],
          // Zustand 状态管理
          "zustand-vendor": ["zustand"],
          // 工具库
          "utils-vendor": ["nanoid"],
        },
      },
    },
    // 提高 chunk 大小警告阈值到 700 KB
    // CodeMirror 编辑器库本身较大（~600 KB），通过动态导入可以延迟加载
    chunkSizeWarningLimit: 700,
  },
});
