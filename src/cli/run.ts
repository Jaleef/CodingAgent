/**
 * @file CLI 启动流程
 * @responsibility 串起"解析参数 → 处理 --help/--version → 选择 TUI 或非交互模式 →
 *                 返回退出码"，并保证任何失败都能变成可读信息 + 正确退出码。
 * @invariants
 *   1. run() 不调用 process.exit，只返回退出码（便于测试与 finally 清理）；
 *   2. stdout 只输出用户要求的结果/协议数据，诊断信息一律走 stderr；
 *   3. 非 TTY 环境绝不尝试渲染 Ink（否则 raw mode 会抛错或挂起）。
 * @failureModes 参数错误 → EXIT.USAGE；渲染失败 → EXIT.ERROR；其余异常向上抛给 main.ts。
 * @concepts docs/concepts/agent-loop.md
 */

import { createElement } from "react";
import { render } from "ink";

import pkg from "../../package.json";
import { DEFAULT_CONFIG } from "../core/config/defaults";
import { isAgentError, toErrorMessage } from "../shared/errors";
import { App } from "../tui/App";
import { parseArgs, usage } from "./args";
import { EXIT } from "./exit";

/**
 * 启动 CLI。
 *
 * @param argv 不含 node 与脚本路径的参数（process.argv.slice(2)）。
 * @param cwd 默认工作目录，默认取 process.cwd()；测试可显式传入。
 * @returns 进程退出码。
 */
export async function run(argv: readonly string[], cwd: string = process.cwd()): Promise<number> {
  let options;
  try {
    options = parseArgs(argv, cwd);
  } catch (error) {
    process.stderr.write(`${toErrorMessage(error)}\n`);
    return isAgentError(error) ? EXIT.USAGE : EXIT.ERROR;
  }

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return EXIT.OK;
  }

  if (options.version) {
    process.stdout.write(`${pkg.version}\n`);
    return EXIT.OK;
  }

  // F0 还没有内核：非交互模式（--print / 非 TTY）直接给出明确说明，
  // 而不是假装成功或挂起等待输入。
  if (options.print || options.json || !process.stdout.isTTY) {
    process.stderr.write(
      "[ca] F0 框架：模型与工具尚未接入（见 STEPS.md）。TUI 需要在交互式终端中运行。\n",
    );
    return EXIT.OK;
  }

  try {
    const instance = render(
      createElement(App, {
        cwd: options.cwd,
        provider: options.provider ?? DEFAULT_CONFIG.provider,
        model: options.model ?? DEFAULT_CONFIG.model,
        permission: options.permission ?? DEFAULT_CONFIG.permission,
        version: pkg.version,
      }),
    );
    await instance.waitUntilExit();
    return EXIT.OK;
  } catch (error) {
    process.stderr.write(`无法启动界面：${toErrorMessage(error)}\n`);
    return EXIT.ERROR;
  }
}
