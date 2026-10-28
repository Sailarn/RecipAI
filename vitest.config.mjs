import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Tests that need a DOM opt in with a `@vitest-environment happy-dom`
    // pragma. Node is faster to set up and matches the API routes' runtime.
    environment: "node",
    // Worker threads start faster than the default forked processes (~1s).
    pool: "threads",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
