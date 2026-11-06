import { defineConfig } from "vitest/config";

/**
 * 测试只跑 tests/ 下的 *.test.ts（F0 阶段全是纯单元测试，零网络、零交互）。
 *
 * 为什么不用 globals（describe/it/expect 显式 import）？
 * 显式导入让每个测试文件都能单独被读懂，也避免不同项目的全局类型互相污染，
 * 这对"以学习为目的"的仓库比少写一行 import 更重要。
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    // 沙箱禁止 fork 子进程，因此固定用线程池（进程内 worker_threads）。
    pool: "threads",
    reporters: "default",
  },
});
