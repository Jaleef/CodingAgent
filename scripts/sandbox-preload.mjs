#!/usr/bin/env node
/**
 * @file 沙箱兼容预加载
 * @responsibility 在 Vitest/Vite 启动前，绕过 Vite 在 Windows 上的一次 `net use` 子进程探测。
 * @invariants
 *   1. 只影响 Vite 的 realpath 优化路径，不改变测试语义；
 *   2. 非 Windows 或不受限环境下行为不变（最多损失一点 realpath 性能）；
 *   3. 不写文件、不联网、不改变进程退出码。
 * @failureModes 若 Node 未来的 fs 实现禁止改写 native，则 Vitest 会回到原始失败；
 *               届时应改用 `--pool=threads` 之外的方案（见 docs/notes/F00-skeleton.md）。
 * @concepts docs/notes/F00-skeleton.md
 *
 * 背景：
 *   Vite 的 windowsSafeRealPathSync() 首次运行时调用 `exec("net use", ...)`
 *   来探测网络驱动器。本机 DSH 文件沙箱禁止"捕获子进程 stdout"的 spawn，
 *   因此该调用抛 EPERM，导致 Vitest 在加载配置阶段就失败。
 *   Vite 自身有一个回退分支：如果 fs.realpathSync.native 抛 EISDIR，就改用
 *   普通 realpath 并跳过 `net use`。这里让首次调用走那条分支。
 */

import fs from "node:fs";

const originalNative = fs.realpathSync.native;
let firstCall = true;

fs.realpathSync.native = (path) => {
  if (firstCall) {
    firstCall = false;
    const error = new Error("EISDIR: illegal operation on a directory");
    throw error;
  }
  return originalNative(path);
};
