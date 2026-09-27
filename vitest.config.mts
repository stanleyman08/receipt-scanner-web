import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": dirname(fileURLToPath(import.meta.url)) },
  },
  test: {
    // Component tests opt into a DOM with a `// @vitest-environment jsdom` comment.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "{app,components,lib}/**/*.test.{ts,tsx}"],
  },
});
