/**
 * @file 命令行参数解析
 * @responsibility 把 argv 变成强类型 CliOptions：支持 `--flag value`、`--flag=value`
 *                 与短别名，非法输入直接给出可读错误。
 * @invariants
 *   1. 解析是纯函数：不读写进程状态，便于单测；
 *   2. 未知参数一律报错，而不是静默忽略——拼错的 flag 会让用户以为"没生效"；
 *   3. `--` 之后的内容全部视为位置参数（prompt），不再当 flag 解析。
 * @failureModes 用法错误抛 AgentError("INVALID_ARGUMENTS")，由 run.ts 转成 EXIT.USAGE。
 * @concepts docs/concepts/agent-loop.md
 */

import { AgentError } from "../shared/errors";
import { type PermissionMode, PERMISSION_MODES } from "../core/permission/types";

/**
 * 解析后的命令行选项。
 */
export interface CliOptions {
  /** 工作目录；默认取进程 cwd。 */
  readonly cwd: string;
  /** 覆盖配置中的 provider。 */
  readonly provider?: string;
  /** 覆盖配置中的模型。 */
  readonly model?: string;
  /** 覆盖配置中的权限模式。 */
  readonly permission?: PermissionMode;
  /** 恢复指定会话。 */
  readonly resume?: string;
  /** 继续最近一次会话（与 resume 互斥，由 run.ts 决定优先级）。 */
  readonly continueSession: boolean;
  /** 非交互：执行一次并输出结果。 */
  readonly print: boolean;
  /** stdout 输出 NDJSON 事件流。 */
  readonly json: boolean;
  /** 无审批通道时也放行（仅对明确的自动化场景使用）。 */
  readonly yes: boolean;
  /** 打开 debug 日志。 */
  readonly debug: boolean;
  readonly help: boolean;
  readonly version: boolean;
  /** 位置参数拼成的初始 prompt（可能不存在）。 */
  readonly prompt?: string;
}

/**
 * 需要取值的参数名集合。
 *
 * 用 Set 而不是 switch，是为了新增参数时只改一处，同时保持解析循环简单。
 */
const VALUE_FLAGS = new Set(["--cwd", "--provider", "--model", "--permission", "--resume"]);

/**
 * 解析 argv。
 *
 * @param argv 不含 `node` 与脚本路径的参数列表（即 process.argv.slice(2)）。
 * @param baseCwd 默认工作目录，通常传 process.cwd()。
 * @throws AgentError INVALID_ARGUMENTS —— 未知参数、缺少取值、权限模式非法。
 */
export function parseArgs(argv: readonly string[], baseCwd: string): CliOptions {
  let cwd = baseCwd;
  let provider: string | undefined;
  let model: string | undefined;
  let permission: PermissionMode | undefined;
  let resume: string | undefined;
  let continueSession = false;
  let print = false;
  let json = false;
  let yes = false;
  let debug = false;
  let help = false;
  let version = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    // noUncheckedIndexedAccess 让 argv[i] 的类型是 string | undefined；
    // 循环条件保证它存在，这里只是让类型系统安心。
    if (arg === undefined) continue;

    // `--` 之后全部是位置参数：允许 prompt 里出现以 - 开头的文本。
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }

    // 短别名：只有 -h / -v 两个，避免与未来参数冲突。
    if (arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "-v") {
      version = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    // 支持 `--flag=value` 与 `--flag value` 两种写法。
    const equalsAt = arg.indexOf("=");
    const name = equalsAt === -1 ? arg : arg.slice(0, equalsAt);
    const inlineValue = equalsAt === -1 ? undefined : arg.slice(equalsAt + 1);

    if (VALUE_FLAGS.has(name)) {
      const value = inlineValue ?? nextValue(argv, i, name);
      // 消费掉 `--flag value` 里的 value；`--flag=value` 不需要。
      if (inlineValue === undefined) i += 1;

      switch (name) {
        case "--cwd":
          cwd = value;
          break;
        case "--provider":
          provider = value;
          break;
        case "--model":
          model = value;
          break;
        case "--permission":
          permission = parsePermission(value);
          break;
        case "--resume":
          resume = value;
          break;
        default:
          // VALUE_FLAGS 与 switch 必须同步；走到这里说明代码不一致。
          throw new AgentError("INVALID_ARGUMENTS", `未处理的参数：${name}`);
      }
      continue;
    }

    switch (arg) {
      case "--continue":
        continueSession = true;
        break;
      case "--print":
        print = true;
        break;
      case "--json":
        json = true;
        break;
      case "--yes":
        yes = true;
        break;
      case "--debug":
        debug = true;
        break;
      case "--help":
        help = true;
        break;
      case "--version":
        version = true;
        break;
      default:
        throw new AgentError("INVALID_ARGUMENTS", `未知参数：${arg}（用 --help 查看用法）`);
    }
  }

  return {
    cwd,
    provider,
    model,
    permission,
    resume,
    continueSession,
    print,
    json,
    yes,
    debug,
    help,
    version,
    prompt: positional.length > 0 ? positional.join(" ") : undefined,
  };
}

/**
 * 取出 `--flag value` 中紧随其后的值。
 *
 * 单独的 `--flag`（末尾或下一个参数也是 flag）视为用法错误，
 * 比"把 --print 当成 cwd"安全得多。
 */
function nextValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new AgentError("INVALID_ARGUMENTS", `参数 ${flag} 需要一个取值`);
  }
  return value;
}

/**
 * 校验权限模式取值。
 */
function parsePermission(value: string): PermissionMode {
  if ((PERMISSION_MODES as readonly string[]).includes(value)) {
    return value as PermissionMode;
  }
  throw new AgentError(
    "INVALID_ARGUMENTS",
    `未知权限模式：${value}（可选：${PERMISSION_MODES.join(" / ")}）`,
  );
}

/**
 * 生成帮助文本。
 *
 * 与 README 的「快速开始」保持一致；F0 阶段只有 --version/--help 真正生效，
 * 其余参数已解析但内核尚未接入。
 */
export function usage(): string {
  return [
    "ca — 学习导向的 coding agent（F0 框架）",
    "",
    "用法：",
    "  ca [prompt] [options]",
    "",
    "选项：",
    "  --cwd <dir>           工作目录（默认：当前目录）",
    "  --provider <id>       模型提供方（deepseek / openai / anthropic）",
    "  --model <name>        模型名（默认：deepseek-chat）",
    "  --permission <mode>   read-only | workspace-write | danger-full-access",
    "  --resume <id>         恢复指定会话",
    "  --continue            继续最近一次会话",
    "  --print               非交互执行一次并输出结果",
    "  --json                以 NDJSON 输出事件流（stdout 只含协议数据）",
    "  --yes                 无审批通道时放行（谨慎使用）",
    "  --debug               输出调试日志",
    "  -h, --help            显示帮助",
    "  -v, --version         显示版本",
    "",
    "当前状态：F0 骨架，模型与工具尚未接入（见 STEPS.md）。",
  ].join("\n");
}
