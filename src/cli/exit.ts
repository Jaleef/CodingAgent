/**
 * @file 进程退出码
 * @responsibility 把"进程为什么退出"固化成稳定的数字契约，供 shell 脚本、CI 与用户判断。
 * @invariants 数值一旦发布不再改变；新增语义只能占用新值。
 * @failureModes 无。
 * @concepts docs/concepts/agent-loop.md
 */

/**
 * 退出码常量表。
 *
 * 为什么单独定义而不是到处 `process.exit(1)`？
 * - 脚本可以区分"用法错误"和"审批被拒"；
 * - 测试可以断言具体退出码，而不是只断言非零；
 * - 集中一处便于在 README 中列出。
 */
export const EXIT = {
  /** 正常结束（包括 --version/--help）。 */
  OK: 0,
  /** 运行期错误（provider 失败、IO 失败、未预期异常）。 */
  ERROR: 1,
  /** 命令行用法错误（未知参数、缺少参数值）。 */
  USAGE: 2,
  /** 审批被拒绝或用户主动中止。 */
  DENIED: 3,
  /** 被 SIGINT 中断（等价于 shell 惯例 130）。 */
  INTERRUPTED: 130,
} as const;

/**
 * 退出码的类型（0 | 1 | 2 | 3 | 130）。
 */
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
