import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["index.html"] },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/database"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/test-setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
