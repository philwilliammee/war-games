// @ts-check

import eslint from "@eslint/js"; // peer dependency of typescript-eslint
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-control-regex": "warn", // Warn for control characters in regex
      "@typescript-eslint/no-unused-expressions": "warn", // Warn for unused expressions
      "@typescript-eslint/no-unused-vars": "warn", // Warn for unused variables
      "no-explicit-any": "warn", // Warn for explicit any
    },
  }
);
