// Konfiguracja testów jednostkowych (vitest).
//
// Testujemy wyłącznie moduły liczące ceny – to czyste funkcje bez bazy i bez
// Reacta, a decydują o kwocie, którą płaci klient. Alias `@/` musi zgadzać się
// z `tsconfig.json`, bo moduły importują się nawzajem przez niego.

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
