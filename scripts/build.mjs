#!/usr/bin/env node
/**
 * @file 构建脚本（rolldown）
 * @responsibility 把 src/main.ts 打包成单入口 ESM：dist/main.js，并加上 shebang。
 * @invariants
 *   1. 依赖保持 external（ink/react/zod 在运行时从 node_modules 解析）；
 *   2. 产物是可被 Node 直接执行的 ESM，入口带 `#!/usr/bin/env node`；
 *   3. 构建不依赖任何子进程（本机沙箱禁止 spawn），因此用 rolldown 的 N-API。
 * @failureModes 打包失败时抛异常，退出码 1（由顶层 await 自然传播）。
 * @concepts docs/notes/F00-skeleton.md
 *
 * 为什么不是 tsup/esbuild？
 * esbuild 的 JS API 会启动一个常驻子进程并通过管道通信，本机 DSH 文件沙箱禁止
 * "捕获子进程 stdout"的 spawn，因此 tsup 在这里必然失败。rolldown 是进程内
 * 原生模块（N-API），不依赖子进程，且 Vite/Vitest 已经在用它，版本可控。
 */

import { rmSync } from "node:fs";

import { build } from "rolldown";

rmSync("dist", { recursive: true, force: true });

await build({
  input: "src/main.ts",
  platform: "node",
  // 这些包在运行时从 node_modules 解析，不打进 bundle：
  // ink/react 有复杂的运行时副作用，bundle 进 CLI 容易踩 ESM/CJS 互操作问题。
  external: ["react", "react/jsx-runtime", "ink", "zod"],
  // TSX 交给 oxc 转成 automatic JSX runtime（与 tsconfig 的 react-jsx 一致）。
  transform: { jsx: "react-jsx" },
  output: {
    file: "dist/main.js",
    format: "esm",
    sourcemap: true,
    banner: "#!/usr/bin/env node",
  },
});
