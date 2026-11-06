/**
 * @file 入口
 * @responsibility 把 process.argv 交给 run()，并把返回码写入 process.exitCode。
 * @invariants
 *   1. 这里不做业务判断，只负责"接住未预期异常"；
 *   2. 使用 exitCode 而不是 process.exit()，让 stdout/stderr 有机会 flush。
 * @failureModes 未捕获异常 → 打印消息并返回 1。
 * @concepts docs/concepts/agent-loop.md
 */

import { run } from "./cli/run";
import { EXIT } from "./cli/exit";
import { toErrorMessage } from "./shared/errors";

/**
 * 程序主函数。
 */
async function main(): Promise<void> {
  const code = await run(process.argv.slice(2));
  process.exitCode = code;
}

void main().catch((error: unknown) => {
  process.stderr.write(`未预期的错误：${toErrorMessage(error)}\n`);
  process.exitCode = EXIT.ERROR;
});
