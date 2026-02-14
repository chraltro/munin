import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Global libraries loaded via CDN
        marked: "readonly",
        DOMPurify: "readonly",
        // App globals defined in non-module scripts
        APP_CONFIG: "readonly",
        THEMES: "readonly",
        FONTS: "readonly",
        getTemplates: "readonly",
        getMasterPrompt: "readonly",
        getContextualPrompt: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-debugger": "warn",
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      "no-throw-literal": "error",
      "no-implicit-coercion": ["warn", { allow: ["!!"] }],
      "curly": ["warn", "multi-line"],
      "no-duplicate-imports": "error",
    },
  },
  {
    ignores: ["sw.js", "node_modules/", "*.config.js"],
  },
];
