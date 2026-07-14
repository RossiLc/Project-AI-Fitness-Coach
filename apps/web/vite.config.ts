import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, resolve(process.cwd(), "../.."), "");

  return {
    plugins: [vue()],
    server: {
      port: Number(process.env.WEB_PORT ?? rootEnv.WEB_PORT ?? 15173),
      proxy: {
        "/api": {
          target: process.env.VITE_API_BASE_URL ?? rootEnv.VITE_API_BASE_URL ?? "http://localhost:13100",
          changeOrigin: true
        }
      }
    }
  };
});
