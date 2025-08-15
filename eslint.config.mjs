import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import security from "eslint-plugin-security";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "**/coverage/",
    "**/docs/",
    "**/*.js",
    "**/*.cjs",
    "**/*.mjs",
]), {
    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "@typescript-eslint/recommended",
        "@typescript-eslint/recommended-requiring-type-checking",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:security/recommended-legacy",
        "plugin:prettier/recommended",
    )),

    plugins: {
        "@typescript-eslint": typescriptEslint,
        import: fixupPluginRules(_import),
        security: fixupPluginRules(security),
        prettier: fixupPluginRules(prettier),
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",

        parserOptions: {
            project: ["./tsconfig.json"],
            tsconfigRootDir: ".",
        },
    },

    settings: {
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
                project: "./tsconfig.json",
            },
        },
    },

    rules: {
        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/explicit-module-boundary-types": "warn",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/prefer-const": "error",
        "@typescript-eslint/no-non-null-assertion": "warn",
        "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

        "@typescript-eslint/consistent-type-imports": ["error", {
            prefer: "type-imports",
        }],

        "import/order": ["error", {
            groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
            "newlines-between": "always",

            alphabetize: {
                order: "asc",
                caseInsensitive: true,
            },
        }],

        "import/no-unresolved": "error",
        "import/no-cycle": "error",
        "import/no-self-import": "error",

        "no-console": ["warn", {
            allow: ["warn", "error"],
        }],

        "no-debugger": "error",
        "no-duplicate-imports": "error",
        "no-unused-expressions": "error",
        "prefer-const": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "prefer-template": "error",
        eqeqeq: ["error", "always"],
        curly: ["error", "all"],
        "security/detect-object-injection": "off",
        "security/detect-non-literal-fs-filename": "off",
        "prettier/prettier": "error",
    },
}, {
    files: ["test/**/*", "**/*.spec.ts", "**/*.test.ts"],

    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "security/detect-non-literal-fs-filename": "off",
    },
}, {
    files: ["prisma/**/*"],

    rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
    },
}]);