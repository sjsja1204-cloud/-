import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 로컬 개발: /api 요청을 백엔드로 프록시 (운영에서는 Cloudflare Pages Functions 가 같은 역할)
    proxy: {
      "/api": { target: process.env.VITE_DEV_API || "http://localhost:4000", changeOrigin: false },
    },
  },
});
