import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Compact code: no blank lines (template literal contents are left alone).
      "no-multiple-empty-lines": ["error", { max: 0, maxBOF: 0, maxEOF: 0 }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design reference prototype (browser-Babel globals), not app code.
    "reference/**",
  ]),
]);
export default eslintConfig;
