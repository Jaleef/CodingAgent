import tseslint from "typescript-eslint";

/**
 * ESLint 配置（flat config）。
 *
 * 目标不是堆规则，而是守住两条底线：
 * 1. 没有未使用的变量/参数——死代码会让学习者误以为某条路径仍然有效；
 * 2. 类型导入必须显式（consistent-type-imports）——配合 verbatimModuleSyntax，
 *    让"哪些是运行时依赖、哪些只是类型"一眼可见。
 */
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".cache/**", "coverage/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
    },
  },
);
