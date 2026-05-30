import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest config mínimo. Testes em tests/**/*.test.ts importam diretamente
// dos módulos puros (sem dependerem do bundle do React Router / Cloudflare).
// tsconfigPaths replica os aliases ~/lib/* do tsconfig.json no test runner.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
  },
});
