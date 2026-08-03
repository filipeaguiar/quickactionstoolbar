import { configDefaults, defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "firebase-tests/**"],
  },
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, "background.html"),
        manager: resolve(__dirname, "manager.html"),
        actionPopover: resolve(__dirname, "action-popover.html"),
      },
    },
  },
});
